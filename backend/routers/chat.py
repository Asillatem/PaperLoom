"""Chat router for AI Brain with Graph-Guided RAG."""

import json
import logging
import re
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlmodel import Session, select

from database import engine
from models import ChatSession, ChatMessage
from services.llm_factory import create_llm, load_ai_settings
from services.vector_store import query as vector_query, sync_project_nodes
from services.graph_service import get_connected_nodes
from services.prompts import get_prompt

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/chat", tags=["chat"])


class ChatRequest(BaseModel):
    """Request body for chat endpoint."""
    project_id: str
    query: str
    session_id: Optional[int] = None
    context_node_ids: Optional[list[str]] = None
    # Project data for RAG context
    nodes: Optional[list[dict]] = None
    edges: Optional[list[dict]] = None
    # Context mode: "auto" (RAG only), "manual" (selected only), "hybrid" (RAG + selected)
    context_mode: str = "auto"
    # Manually selected/pinned node IDs for manual/hybrid modes
    pinned_node_ids: Optional[list[str]] = None


class Citation(BaseModel):
    """A citation reference to a canvas node."""
    nodeId: str
    preview: str


class NodeInsight(BaseModel):
    """Insight about a context node."""
    nodeId: str
    source: str  # "rag", "pinned", "graph"
    similarity: Optional[float] = None
    preview: str


class ChatInsights(BaseModel):
    """Stats and insights about the chat context."""
    total_context_nodes: int
    rag_nodes: int
    pinned_nodes: int
    graph_expanded_nodes: int
    context_mode: str
    graph_depth: int
    approx_context_tokens: int
    node_details: list[NodeInsight]


class ChatResponse(BaseModel):
    """Response from chat endpoint."""
    response: str
    citations: list[Citation]
    context_nodes: list[str]
    session_id: int
    insights: ChatInsights


def estimate_tokens(text: str) -> int:
    """Rough token estimate (4 chars per token on average)."""
    return len(text) // 4


@router.post("/", response_model=ChatResponse)
async def chat(req: ChatRequest):
    """
    Send a message to the AI Brain and get a response.

    RAG Flow:
    1. Sync project nodes to vector store
    2. Vector search for relevant nodes (if auto/hybrid mode)
    3. Add pinned nodes (if manual/hybrid mode)
    4. Expand via graph edges (configurable depth)
    5. Build context from retrieved nodes
    6. Fetch recent chat history
    7. Invoke LLM with context
    8. Parse citations from response
    9. Save messages to database
    """
    logger.info(f"Chat request: project={req.project_id}, session={req.session_id}, mode={req.context_mode}")
    settings = load_ai_settings()
    graph_depth = settings.get("graph_depth", 1)
    context_mode = req.context_mode or "auto"

    # Sync nodes to vector store if provided (both snippets and notes)
    if req.nodes:
        node_data = []
        for n in req.nodes:
            node_type = n.get("type")
            if node_type == "snippetNode":
                node_data.append({
                    "id": n.get("id", ""),
                    "content": n.get("data", {}).get("label", ""),
                    "source_document": n.get("data", {}).get("sourcePdf", ""),
                    "page_index": n.get("data", {}).get("location", {}).get("pageIndex", 0),
                    "node_type": "snippet",
                })
            elif node_type == "noteNode":
                node_data.append({
                    "id": n.get("id", ""),
                    "content": n.get("data", {}).get("label", ""),
                    "source_document": "",  # Notes have no source
                    "page_index": 0,
                    "node_type": "note",
                })
        sync_project_nodes(req.project_id, node_data)

    # Build node lookup for context building
    node_lookup = {}
    if req.nodes:
        for n in req.nodes:
            node_lookup[n.get("id", "")] = n

    # Track node sources and similarity scores for insights
    node_sources: dict[str, str] = {}  # node_id -> source ("rag", "pinned", "graph")
    node_similarities: dict[str, float] = {}  # node_id -> similarity score

    # Step 1: Collect nodes based on context mode
    retrieved_ids = []
    rag_node_count = 0
    pinned_node_count = 0

    # RAG search (for auto and hybrid modes)
    if context_mode in ("auto", "hybrid"):
        search_results = vector_query(
            query_text=req.query,
            project_id=req.project_id,
            n_results=5,
        )
        for r in search_results:
            node_id = r["id"]
            retrieved_ids.append(node_id)
            node_sources[node_id] = "rag"
            # ChromaDB returns distance, convert to similarity (1 - distance for cosine)
            node_similarities[node_id] = round(1.0 - r.get("distance", 0), 3)
        rag_node_count = len(retrieved_ids)

    # Add pinned nodes (for manual and hybrid modes)
    pinned_ids = req.pinned_node_ids or []
    if context_mode in ("manual", "hybrid") and pinned_ids:
        for node_id in pinned_ids:
            if node_id not in retrieved_ids:
                retrieved_ids.append(node_id)
                node_sources[node_id] = "pinned"
                pinned_node_count += 1
            elif node_sources.get(node_id) == "rag":
                # Node was found by RAG but also pinned - mark as pinned (higher priority)
                node_sources[node_id] = "pinned"
                pinned_node_count += 1
                rag_node_count -= 1

    # Add explicitly provided context nodes (legacy support)
    if req.context_node_ids:
        for node_id in req.context_node_ids:
            if node_id not in retrieved_ids:
                retrieved_ids.append(node_id)
                node_sources[node_id] = "pinned"
                pinned_node_count += 1

    # Step 2: Graph expansion
    edges = req.edges or []
    pre_expansion_count = len(retrieved_ids)
    expanded_ids = get_connected_nodes(
        node_ids=retrieved_ids,
        edges=edges,
        depth=graph_depth,
        max_nodes=15,
    )

    # Mark graph-expanded nodes
    graph_expanded_count = 0
    for node_id in expanded_ids:
        if node_id not in node_sources:
            node_sources[node_id] = "graph"
            graph_expanded_count += 1

    # Step 3: Build context from nodes and collect insights
    context_parts = []
    node_details = []
    total_context_chars = 0

    for i, node_id in enumerate(expanded_ids, 1):
        node = node_lookup.get(node_id)
        if node and node.get("data"):
            data = node["data"]
            label = data.get("label", "")
            node_type = node.get("type", "snippetNode")

            if label:
                if node_type == "noteNode":
                    # Format notes differently - they're user annotations
                    context_parts.append(f"[{i}] User's note:\n{label}")
                else:
                    # Snippets have document sources
                    source = data.get("sourceName", data.get("sourcePdf", "Unknown"))
                    context_parts.append(f"[{i}] From \"{source}\":\n{label}")
                total_context_chars += len(label)

                # Build node insight
                node_details.append(NodeInsight(
                    nodeId=node_id,
                    source=node_sources.get(node_id, "unknown"),
                    similarity=node_similarities.get(node_id),
                    preview=label[:80] + "..." if len(label) > 80 else label,
                ))

    context_text = "\n\n".join(context_parts) if context_parts else "No relevant excerpts found."

    # Build insights
    insights = ChatInsights(
        total_context_nodes=len(expanded_ids),
        rag_nodes=rag_node_count,
        pinned_nodes=pinned_node_count,
        graph_expanded_nodes=graph_expanded_count,
        context_mode=context_mode,
        graph_depth=graph_depth,
        approx_context_tokens=estimate_tokens(context_text),
        node_details=node_details,
    )

    # Step 4: Get or create chat session
    with Session(engine) as session:
        if req.session_id:
            chat_session = session.get(ChatSession, req.session_id)
            if not chat_session:
                raise HTTPException(status_code=404, detail="Chat session not found")
        else:
            # Create new session with title from first query
            title = req.query[:50] + "..." if len(req.query) > 50 else req.query
            chat_session = ChatSession(
                project_id=int(req.project_id) if req.project_id.isdigit() else 0,
                title=title,
            )
            session.add(chat_session)
            session.commit()
            session.refresh(chat_session)

        # Step 5: Fetch recent chat history
        history_stmt = (
            select(ChatMessage)
            .where(ChatMessage.session_id == chat_session.id)
            .order_by(ChatMessage.created_at.desc())
            .limit(6)
        )
        recent_messages = list(reversed(session.exec(history_stmt).all()))

        # Build messages for LLM
        system_prompt = settings.get("system_prompt", "You are a helpful assistant.")
        messages = []

        # Add context instruction to system prompt using external template
        full_system = get_prompt(
            "rag_template",
            system_prompt=system_prompt,
            context_text=context_text
        )

        messages.append({"role": "system", "content": full_system})

        # Add chat history
        for msg in recent_messages:
            messages.append({"role": msg.role, "content": msg.content})

        # Add current query
        messages.append({"role": "user", "content": req.query})

        # Step 6: Invoke LLM
        try:
            llm = create_llm(settings)
            response_text = await llm.invoke(messages)
        except Exception as e:
            logger.error(f"Chat LLM error: {e}", exc_info=True)
            raise HTTPException(status_code=500, detail=f"LLM error: {str(e)}")

        # Step 7: Parse citations from response
        citations = []
        citation_pattern = r'\[(\d+)\]'
        cited_numbers = set(re.findall(citation_pattern, response_text))

        for num_str in cited_numbers:
            idx = int(num_str) - 1  # Convert to 0-based index
            if 0 <= idx < len(expanded_ids):
                node_id = expanded_ids[idx]
                node = node_lookup.get(node_id)
                if node and node.get("data"):
                    preview = node["data"].get("label", "")[:100]
                    citations.append(Citation(nodeId=node_id, preview=preview))

        # Step 8: Save messages to database
        # Save user message
        user_msg = ChatMessage(
            session_id=chat_session.id,
            role="user",
            content=req.query,
            context_nodes_json=json.dumps(expanded_ids),
        )
        session.add(user_msg)

        # Save assistant message
        assistant_msg = ChatMessage(
            session_id=chat_session.id,
            role="assistant",
            content=response_text,
            citations_json=json.dumps([c.dict() for c in citations]),
        )
        session.add(assistant_msg)

        # Update session timestamp
        chat_session.updated_at = datetime.utcnow()
        session.commit()

        return ChatResponse(
            response=response_text,
            citations=citations,
            context_nodes=expanded_ids,
            session_id=chat_session.id,
            insights=insights,
        )


@router.post("/stream")
async def chat_stream(req: ChatRequest):
    """
    Stream a chat response using Server-Sent Events.

    Sends events:
    - {"type": "token", "content": "..."} - streamed text tokens
    - {"type": "done", "session_id": ..., "insights": ..., "citations": [...]} - final event
    """
    logger.info(f"Chat stream: project={req.project_id}, session={req.session_id}, mode={req.context_mode}")
    settings = load_ai_settings()
    graph_depth = settings.get("graph_depth", 1)
    context_mode = req.context_mode or "auto"

    # Sync nodes to vector store if provided (both snippets and notes)
    if req.nodes:
        node_data = []
        for n in req.nodes:
            node_type = n.get("type")
            if node_type == "snippetNode":
                node_data.append({
                    "id": n.get("id", ""),
                    "content": n.get("data", {}).get("label", ""),
                    "source_document": n.get("data", {}).get("sourcePdf", ""),
                    "page_index": n.get("data", {}).get("location", {}).get("pageIndex", 0),
                    "node_type": "snippet",
                })
            elif node_type == "noteNode":
                node_data.append({
                    "id": n.get("id", ""),
                    "content": n.get("data", {}).get("label", ""),
                    "source_document": "",  # Notes have no source
                    "page_index": 0,
                    "node_type": "note",
                })
        sync_project_nodes(req.project_id, node_data)

    # Build node lookup
    node_lookup = {}
    if req.nodes:
        for n in req.nodes:
            node_lookup[n.get("id", "")] = n

    # Track node sources and similarity scores
    node_sources: dict[str, str] = {}
    node_similarities: dict[str, float] = {}

    # Collect nodes based on context mode
    retrieved_ids = []
    rag_node_count = 0
    pinned_node_count = 0

    if context_mode in ("auto", "hybrid"):
        search_results = vector_query(
            query_text=req.query,
            project_id=req.project_id,
            n_results=5,
        )
        for r in search_results:
            node_id = r["id"]
            retrieved_ids.append(node_id)
            node_sources[node_id] = "rag"
            node_similarities[node_id] = round(1.0 - r.get("distance", 0), 3)
        rag_node_count = len(retrieved_ids)

    pinned_ids = req.pinned_node_ids or []
    if context_mode in ("manual", "hybrid") and pinned_ids:
        for node_id in pinned_ids:
            if node_id not in retrieved_ids:
                retrieved_ids.append(node_id)
                node_sources[node_id] = "pinned"
                pinned_node_count += 1
            elif node_sources.get(node_id) == "rag":
                node_sources[node_id] = "pinned"
                pinned_node_count += 1
                rag_node_count -= 1

    if req.context_node_ids:
        for node_id in req.context_node_ids:
            if node_id not in retrieved_ids:
                retrieved_ids.append(node_id)
                node_sources[node_id] = "pinned"
                pinned_node_count += 1

    # Graph expansion
    edges = req.edges or []
    expanded_ids = get_connected_nodes(
        node_ids=retrieved_ids,
        edges=edges,
        depth=graph_depth,
        max_nodes=15,
    )

    graph_expanded_count = 0
    for node_id in expanded_ids:
        if node_id not in node_sources:
            node_sources[node_id] = "graph"
            graph_expanded_count += 1

    # Build context
    context_parts = []
    node_details = []
    total_context_chars = 0

    for i, node_id in enumerate(expanded_ids, 1):
        node = node_lookup.get(node_id)
        if node and node.get("data"):
            data = node["data"]
            label = data.get("label", "")
            node_type = node.get("type", "snippetNode")

            if label:
                if node_type == "noteNode":
                    # Format notes differently - they're user annotations
                    context_parts.append(f"[{i}] User's note:\n{label}")
                else:
                    # Snippets have document sources
                    source = data.get("sourceName", data.get("sourcePdf", "Unknown"))
                    context_parts.append(f"[{i}] From \"{source}\":\n{label}")
                total_context_chars += len(label)
                node_details.append(NodeInsight(
                    nodeId=node_id,
                    source=node_sources.get(node_id, "unknown"),
                    similarity=node_similarities.get(node_id),
                    preview=label[:80] + "..." if len(label) > 80 else label,
                ))

    context_text = "\n\n".join(context_parts) if context_parts else "No relevant excerpts found."

    insights = ChatInsights(
        total_context_nodes=len(expanded_ids),
        rag_nodes=rag_node_count,
        pinned_nodes=pinned_node_count,
        graph_expanded_nodes=graph_expanded_count,
        context_mode=context_mode,
        graph_depth=graph_depth,
        approx_context_tokens=estimate_tokens(context_text),
        node_details=node_details,
    )

    async def generate():
        """Generate SSE stream."""
        full_response = ""
        session_id = None

        try:
            # Get or create session
            with Session(engine) as db_session:
                if req.session_id:
                    chat_session = db_session.get(ChatSession, req.session_id)
                    if not chat_session:
                        yield f"data: {json.dumps({'type': 'error', 'message': 'Session not found'})}\n\n"
                        return
                else:
                    title = req.query[:50] + "..." if len(req.query) > 50 else req.query
                    chat_session = ChatSession(
                        project_id=int(req.project_id) if req.project_id.isdigit() else 0,
                        title=title,
                    )
                    db_session.add(chat_session)
                    db_session.commit()
                    db_session.refresh(chat_session)
                session_id = chat_session.id

            # Build messages for LLM
            system_prompt = settings.get("system_prompt", "You are a helpful assistant.")
            messages = []

            # Add context instruction to system prompt using external template
            full_system = get_prompt(
                "rag_template",
                system_prompt=system_prompt,
                context_text=context_text
            )

            messages.append({"role": "system", "content": full_system})

            # Add chat history
            with Session(engine) as db_session:
                history_stmt = (
                    select(ChatMessage)
                    .where(ChatMessage.session_id == session_id)
                    .order_by(ChatMessage.created_at.desc())
                    .limit(6)
                )
                recent_messages = list(reversed(db_session.exec(history_stmt).all()))
                for msg in recent_messages:
                    messages.append({"role": msg.role, "content": msg.content})

            messages.append({"role": "user", "content": req.query})

            # Stream from LLM
            llm = create_llm(settings)
            async for token in llm.stream(messages):
                full_response += token
                yield f"data: {json.dumps({'type': 'token', 'content': token})}\n\n"

            # Parse citations
            citations = []
            citation_pattern = r'\[(\d+)\]'
            cited_numbers = set(re.findall(citation_pattern, full_response))

            for num_str in cited_numbers:
                idx = int(num_str) - 1
                if 0 <= idx < len(expanded_ids):
                    node_id = expanded_ids[idx]
                    node = node_lookup.get(node_id)
                    if node and node.get("data"):
                        preview = node["data"].get("label", "")[:100]
                        citations.append({"nodeId": node_id, "preview": preview})

            # Save messages
            with Session(engine) as db_session:
                user_msg = ChatMessage(
                    session_id=session_id,
                    role="user",
                    content=req.query,
                    context_nodes_json=json.dumps(expanded_ids),
                )
                db_session.add(user_msg)

                assistant_msg = ChatMessage(
                    session_id=session_id,
                    role="assistant",
                    content=full_response,
                    citations_json=json.dumps(citations),
                )
                db_session.add(assistant_msg)

                chat_session = db_session.get(ChatSession, session_id)
                if chat_session:
                    chat_session.updated_at = datetime.utcnow()
                db_session.commit()

            # Send final event
            yield f"data: {json.dumps({'type': 'done', 'session_id': session_id, 'insights': insights.dict(), 'citations': citations})}\n\n"

        except Exception as e:
            logger.error(f"Chat stream error: {e}", exc_info=True)
            yield f"data: {json.dumps({'type': 'error', 'message': str(e)})}\n\n"

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@router.get("/sessions/{project_id}")
async def list_sessions(project_id: str):
    """List all chat sessions for a project."""
    with Session(engine) as session:
        # Try to parse as int, fallback to 0
        pid = int(project_id) if project_id.isdigit() else 0
        stmt = (
            select(ChatSession)
            .where(ChatSession.project_id == pid)
            .order_by(ChatSession.updated_at.desc())
        )
        sessions = session.exec(stmt).all()
        return [
            {
                "id": s.id,
                "title": s.title,
                "created_at": s.created_at.isoformat(),
                "updated_at": s.updated_at.isoformat(),
            }
            for s in sessions
        ]


@router.get("/sessions/{project_id}/{session_id}")
async def get_session(project_id: str, session_id: int):
    """Get a chat session with all messages."""
    with Session(engine) as session:
        chat_session = session.get(ChatSession, session_id)
        if not chat_session:
            raise HTTPException(status_code=404, detail="Session not found")

        stmt = (
            select(ChatMessage)
            .where(ChatMessage.session_id == session_id)
            .order_by(ChatMessage.created_at)
        )
        messages = session.exec(stmt).all()

        return {
            "id": chat_session.id,
            "title": chat_session.title,
            "messages": [
                {
                    "id": m.id,
                    "role": m.role,
                    "content": m.content,
                    "citations": json.loads(m.citations_json) if m.citations_json else [],
                    "context_nodes": json.loads(m.context_nodes_json) if m.context_nodes_json else [],
                    "created_at": m.created_at.isoformat(),
                }
                for m in messages
            ],
        }


@router.delete("/sessions/{session_id}")
async def delete_session(session_id: int):
    """Delete a chat session and its messages."""
    with Session(engine) as session:
        chat_session = session.get(ChatSession, session_id)
        if not chat_session:
            raise HTTPException(status_code=404, detail="Session not found")

        # Delete messages first
        stmt = select(ChatMessage).where(ChatMessage.session_id == session_id)
        for msg in session.exec(stmt).all():
            session.delete(msg)

        session.delete(chat_session)
        session.commit()

        return {"status": "deleted"}


@router.post("/sessions/{session_id}/summary")
async def generate_summary(session_id: int):
    """
    Generate a summary of a chat session using the LLM.
    Returns a concise summary of the conversation's key points.
    """
    settings = load_ai_settings()

    # Get session and messages
    with Session(engine) as session:
        chat_session = session.get(ChatSession, session_id)
        if not chat_session:
            raise HTTPException(status_code=404, detail="Session not found")

        stmt = (
            select(ChatMessage)
            .where(ChatMessage.session_id == session_id)
            .order_by(ChatMessage.created_at)
        )
        messages = session.exec(stmt).all()

        if len(messages) < 2:
            return {
                "summary": "This conversation is too short to summarize.",
                "message_count": len(messages),
            }

    # Format messages for summarization
    conversation_text = []
    for msg in messages:
        role = "User" if msg.role == "user" else "AI"
        # Truncate very long messages
        content = msg.content[:500] + "..." if len(msg.content) > 500 else msg.content
        conversation_text.append(f"{role}: {content}")

    full_conversation = "\n\n".join(conversation_text)

    # Build summarization prompt using external templates
    system_content = get_prompt("chat_summary.system")
    user_content = get_prompt("chat_summary.user", conversation_text=full_conversation)

    # Call LLM
    try:
        llm = create_llm(settings)
        summary = ""
        async for token in llm.stream([
            {"role": "system", "content": system_content},
            {"role": "user", "content": user_content}
        ]):
            summary += token

        return {
            "summary": summary.strip(),
            "message_count": len(messages),
            "session_id": session_id,
        }
    except Exception as e:
        logger.error(f"Summary generation failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Summary generation failed: {str(e)}")


class SynthesizeRequest(BaseModel):
    """Request body for synthesize endpoint."""
    node_ids: list[str]
    nodes: list[dict]
    mode: str = "summary"  # "summary", "compare", "narrative"


class SynthesizeResponse(BaseModel):
    """Response from synthesize endpoint."""
    synthesis: str
    input_node_count: int
    mode: str


# Synthesis modes supported by external prompts
SYNTHESIS_MODES = ["summary", "compare", "narrative"]


@router.post("/synthesize", response_model=SynthesizeResponse)
async def synthesize_nodes(req: SynthesizeRequest):
    """
    Synthesize multiple canvas nodes into a single summary/comparison/narrative.

    Modes:
    - summary: Concise summary of key points
    - compare: Compare and contrast the excerpts
    - narrative: Weave into a coherent narrative
    """
    settings = load_ai_settings()

    if len(req.node_ids) < 2:
        raise HTTPException(status_code=400, detail="At least 2 nodes required for synthesis")

    # Build node lookup
    node_lookup = {n.get("id", ""): n for n in req.nodes}

    # Collect content from selected nodes
    content_parts = []
    for i, node_id in enumerate(req.node_ids, 1):
        node = node_lookup.get(node_id)
        if node and node.get("data"):
            data = node["data"]
            label = data.get("label", "")
            node_type = node.get("type", "snippetNode")

            if label:
                if node_type == "noteNode":
                    content_parts.append(f"[{i}] (Note): {label}")
                else:
                    source = data.get("sourceName", data.get("sourcePdf", "Unknown"))
                    content_parts.append(f"[{i}] From \"{source}\": {label}")

    if not content_parts:
        raise HTTPException(status_code=400, detail="No content found in selected nodes")

    content_text = "\n\n".join(content_parts)

    # Get the appropriate prompt template from external config
    mode = req.mode if req.mode in SYNTHESIS_MODES else "summary"
    system_content = get_prompt("synthesis.system")
    user_content = get_prompt(f"synthesis.{mode}", content=content_text)

    # Call LLM
    try:
        llm = create_llm(settings)
        synthesis = ""
        async for token in llm.stream([
            {"role": "system", "content": system_content},
            {"role": "user", "content": user_content}
        ]):
            synthesis += token

        return SynthesizeResponse(
            synthesis=synthesis.strip(),
            input_node_count=len(content_parts),
            mode=mode,
        )
    except Exception as e:
        logger.error(f"Synthesis failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Synthesis failed: {str(e)}")
