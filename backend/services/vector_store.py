"""Vector store service using ChromaDB for semantic search."""

import hashlib
from pathlib import Path
from typing import Optional

import chromadb
from chromadb.config import Settings


def _content_hash(content: str) -> str:
    """Generate a hash of content to detect changes."""
    return hashlib.md5(content.encode()).hexdigest()[:16]

# Store ChromaDB data in backend/chroma_db/
CHROMA_PATH = Path(__file__).parent.parent / "chroma_db"

# Global client instance
_client: Optional[chromadb.ClientAPI] = None
_collection: Optional[chromadb.Collection] = None


def get_chroma_client() -> chromadb.ClientAPI:
    """Get or create the ChromaDB client."""
    global _client
    if _client is None:
        CHROMA_PATH.mkdir(exist_ok=True)
        _client = chromadb.PersistentClient(
            path=str(CHROMA_PATH),
            settings=Settings(anonymized_telemetry=False),
        )
    return _client


def get_collection() -> chromadb.Collection:
    """Get or create the snippets collection."""
    global _collection
    if _collection is None:
        client = get_chroma_client()
        # Use default embedding function (all-MiniLM-L6-v2)
        _collection = client.get_or_create_collection(
            name="snippets",
            metadata={"hnsw:space": "cosine"},
        )
    return _collection


def upsert_node(
    node_id: str,
    content: str,
    project_id: str,
    source_document: str,
    page_index: int = 0,
) -> None:
    """
    Add or update a node in the vector store.

    Args:
        node_id: Unique identifier for the node
        content: Text content to embed
        project_id: Project this node belongs to
        source_document: Source PDF/HTML path
        page_index: Page number in source document
    """
    collection = get_collection()

    # Skip empty content
    if not content or not content.strip():
        return

    collection.upsert(
        ids=[node_id],
        documents=[content],
        metadatas=[{
            "project_id": project_id,
            "source_document": source_document,
            "page_index": page_index,
            "content_hash": _content_hash(content),
        }],
    )


def delete_node(node_id: str) -> None:
    """Remove a node from the vector store."""
    collection = get_collection()
    try:
        collection.delete(ids=[node_id])
    except Exception:
        # Node may not exist, ignore
        pass


def query(
    query_text: str,
    project_id: str,
    n_results: int = 5,
    exclude_ids: Optional[list[str]] = None,
) -> list[dict]:
    """
    Search for similar nodes in a project.

    Args:
        query_text: Text to search for
        project_id: Limit search to this project
        n_results: Maximum number of results
        exclude_ids: Node IDs to exclude from results

    Returns:
        List of dicts with 'id', 'content', 'distance', and metadata
    """
    collection = get_collection()

    # Build where filter
    where_filter = {"project_id": project_id}

    results = collection.query(
        query_texts=[query_text],
        n_results=n_results,
        where=where_filter,
    )

    # Format results
    formatted = []
    if results and results["ids"] and results["ids"][0]:
        ids = results["ids"][0]
        documents = results["documents"][0] if results["documents"] else []
        distances = results["distances"][0] if results["distances"] else []
        metadatas = results["metadatas"][0] if results["metadatas"] else []

        for i, node_id in enumerate(ids):
            # Skip excluded IDs
            if exclude_ids and node_id in exclude_ids:
                continue

            formatted.append({
                "id": node_id,
                "content": documents[i] if i < len(documents) else "",
                "distance": distances[i] if i < len(distances) else 1.0,
                "source_document": metadatas[i].get("source_document", "") if i < len(metadatas) else "",
                "page_index": metadatas[i].get("page_index", 0) if i < len(metadatas) else 0,
            })

    return formatted


def sync_project_nodes(project_id: str, nodes: list[dict]) -> int:
    """
    Sync all nodes for a project to the vector store.
    Only re-embeds nodes whose content has changed.

    Args:
        project_id: Project identifier
        nodes: List of node dicts with 'id', 'content', 'source_document', 'page_index'

    Returns:
        Number of nodes that were actually updated (for debugging)
    """
    collection = get_collection()

    # Get existing nodes with their metadata (including content_hash)
    existing = collection.get(
        where={"project_id": project_id},
        include=["metadatas"],
    )
    existing_ids = set(existing["ids"]) if existing["ids"] else set()

    # Build hash lookup: node_id -> content_hash
    existing_hashes = {}
    if existing["ids"] and existing["metadatas"]:
        for i, node_id in enumerate(existing["ids"]):
            metadata = existing["metadatas"][i] if i < len(existing["metadatas"]) else {}
            existing_hashes[node_id] = metadata.get("content_hash", "")

    # Only upsert nodes that are new or changed
    current_ids = set()
    updated_count = 0
    for node in nodes:
        node_id = node.get("id", "")
        content = node.get("content", "")
        if node_id and content and content.strip():
            current_ids.add(node_id)

            # Check if content has changed
            new_hash = _content_hash(content)
            old_hash = existing_hashes.get(node_id, "")

            if new_hash != old_hash:
                # Content is new or changed - need to re-embed
                upsert_node(
                    node_id=node_id,
                    content=content,
                    project_id=project_id,
                    source_document=node.get("source_document", ""),
                    page_index=node.get("page_index", 0),
                )
                updated_count += 1

    # Delete nodes that no longer exist
    removed_ids = existing_ids - current_ids
    if removed_ids:
        collection.delete(ids=list(removed_ids))

    return updated_count


def get_node_count(project_id: Optional[str] = None) -> int:
    """Get the number of nodes in the vector store."""
    collection = get_collection()
    if project_id:
        result = collection.get(where={"project_id": project_id}, include=[])
        return len(result["ids"]) if result["ids"] else 0
    return collection.count()
