from dotenv import load_dotenv
load_dotenv()  # Load .env file before accessing env vars

from fastapi import FastAPI, HTTPException, Depends
from fastapi.responses import FileResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlmodel import Session, select
import os
from pathlib import Path
import aiofiles
import json
from typing import List, Optional
from datetime import datetime

from database import create_db_and_tables, get_session, engine
from services.zotero import get_zotero_service
from models import CachedZoteroItem, ChatSession, ChatMessage
import models  # noqa: F401 - imported for SQLModel metadata
from routers import settings, chat
from fastapi.responses import PlainTextResponse


# Configuration from environment variables with sensible defaults
PROJECTS_DIR = Path(os.environ.get("PROJECTS_DIR", str(Path.cwd() / "projects")))

# CORS origins from environment (comma-separated) or default dev ports
DEFAULT_CORS_ORIGINS = "http://localhost:5173,http://localhost:3000,http://127.0.0.1:5173,http://127.0.0.1:3000"
CORS_ORIGINS = [origin.strip() for origin in os.environ.get("CORS_ORIGINS", DEFAULT_CORS_ORIGINS).split(",") if origin.strip()]

app = FastAPI(title="PaperLoom API")

# CORS configuration
app.add_middleware(
	CORSMiddleware,
	allow_origins=CORS_ORIGINS,
	allow_credentials=True,
	allow_methods=["*"],
	allow_headers=["*"],
)

# Include routers
app.include_router(settings.router)
app.include_router(chat.router)


def ensure_dirs() -> None:
	PROJECTS_DIR.mkdir(parents=True, exist_ok=True)


def safe_resolve(base: Path, relative: str) -> Path:
	"""Prevent path traversal and ensure file is inside base."""
	candidate = (base / relative).resolve()
	try:
		base_resolved = base.resolve()
	except Exception:
		base_resolved = base
	if not str(candidate).startswith(str(base_resolved)):
		raise HTTPException(status_code=400, detail="Invalid path")
	return candidate


class SaveRequest(BaseModel):
	project: dict
	filename: Optional[str] = None


@app.on_event("startup")
async def startup_event():
	ensure_dirs()
	create_db_and_tables()


@app.get("/files")
async def list_files(limit: int = 0) -> List[dict]:
	"""
	List items from cached Zotero library.
	Returns a flat list of viewable files (PDFs and HTML snapshots).
	Use POST /sync to refresh the cache from Zotero API.

	Args:
		limit: Max items to return. 0 means return all.
	"""
	with Session(engine) as session:
		statement = select(CachedZoteroItem)
		if limit > 0:
			statement = statement.limit(limit)
		items = session.exec(statement).all()

		if not items:
			# Cache is empty - return empty list, user should sync
			return []

		return [
			{
				"key": item.key,
				"name": item.name,
				"filename": item.filename,
				"path": item.key,
				"type": item.file_type,
				"parentKey": item.parent_key,
				"itemType": item.item_type,
				"creators": json.loads(item.creators_json) if item.creators_json else [],
			}
			for item in items
		]


@app.post("/sync")
async def sync_library(limit: int = 0) -> dict:
	"""
	Sync library from Zotero API and update local cache.
	This fetches fresh data and stores it in the database.

	Args:
		limit: Max items to sync. 0 means sync entire library.
	"""
	zotero = get_zotero_service()

	if not zotero.is_configured():
		raise HTTPException(
			status_code=503,
			detail="Zotero API not configured. Set ZOTERO_USER_ID and ZOTERO_API_KEY."
		)

	try:
		items = zotero.get_library_items(limit=limit)

		with Session(engine) as session:
			# Clear existing cache
			for existing in session.exec(select(CachedZoteroItem)).all():
				session.delete(existing)
			session.commit()

			# Insert new items
			count = 0
			for item in items:
				for attachment in item.get("attachments", []):
					cached = CachedZoteroItem(
						key=attachment["key"],
						parent_key=item["key"],
						name=item["title"],
						filename=attachment.get("filename", ""),
						file_type=attachment["type"],
						item_type=item["itemType"],
						creators_json=json.dumps(item.get("creators", [])),
						publication_date=item.get("date", ""),
						doi=item.get("DOI", ""),
						abstract=item.get("abstractNote", ""),
						publication_title=item.get("publicationTitle", ""),
						url=item.get("url", ""),
						cached_at=datetime.utcnow(),
					)
					session.add(cached)
					count += 1

			session.commit()

		return {"status": "success", "items_cached": count}

	except ValueError as e:
		raise HTTPException(status_code=503, detail=str(e))
	except Exception as e:
		raise HTTPException(status_code=500, detail=f"Zotero API error: {str(e)}")


@app.get("/items")
async def list_items(limit: int = 100) -> List[dict]:
	"""
	List items from Zotero library with full metadata.
	Returns hierarchical data with items and their attachments.
	"""
	zotero = get_zotero_service()

	if not zotero.is_configured():
		raise HTTPException(
			status_code=503,
			detail="Zotero API not configured. Set ZOTERO_USER_ID and ZOTERO_API_KEY."
		)

	try:
		return zotero.get_library_items(limit=limit)
	except ValueError as e:
		raise HTTPException(status_code=503, detail=str(e))
	except Exception as e:
		raise HTTPException(status_code=500, detail=f"Zotero API error: {str(e)}")


@app.get("/file/{attachment_key}")
async def get_file(attachment_key: str, download: Optional[bool] = False):
	"""
	Stream a file (PDF or HTML) by Zotero attachment key.
	Downloads from Zotero API if not cached locally.
	"""
	zotero = get_zotero_service()

	if not zotero.is_configured():
		raise HTTPException(
			status_code=503,
			detail="Zotero API not configured. Set ZOTERO_USER_ID and ZOTERO_API_KEY."
		)

	try:
		file_path, content_type = zotero.get_attachment_file(attachment_key)

		if not file_path.exists():
			raise HTTPException(status_code=404, detail="File not found")

		headers = {}
		if download:
			headers["Content-Disposition"] = f'attachment; filename="{file_path.name}"'

		return FileResponse(
			path=str(file_path),
			media_type=content_type,
			headers=headers
		)

	except FileNotFoundError as e:
		raise HTTPException(status_code=404, detail=str(e))
	except Exception as e:
		raise HTTPException(status_code=500, detail=f"Error fetching file: {str(e)}")


@app.get("/metadata/{attachment_key}")
async def get_item_metadata(attachment_key: str):
	"""
	Get metadata for a Zotero item by its attachment key.
	Returns authors, publication date, DOI, abstract, etc.
	"""
	with Session(engine) as session:
		statement = select(CachedZoteroItem).where(CachedZoteroItem.key == attachment_key)
		item = session.exec(statement).first()

		if not item:
			raise HTTPException(status_code=404, detail="Item not found in cache. Try syncing library.")

		# Parse creators JSON
		creators = []
		if item.creators_json:
			try:
				creators = json.loads(item.creators_json)
			except json.JSONDecodeError:
				pass

		# Format creators as readable strings
		authors = []
		for creator in creators:
			name_parts = []
			if creator.get("firstName"):
				name_parts.append(creator["firstName"])
			if creator.get("lastName"):
				name_parts.append(creator["lastName"])
			if name_parts:
				authors.append(" ".join(name_parts))
			elif creator.get("name"):
				authors.append(creator["name"])

		return {
			"key": item.key,
			"parentKey": item.parent_key,
			"title": item.name,
			"authors": authors,
			"publicationDate": item.publication_date or "",
			"doi": item.doi or "",
			"abstract": item.abstract or "",
			"publicationTitle": item.publication_title or "",
			"url": item.url or "",
			"itemType": item.item_type or "",
			"filename": item.filename,
			"fileType": item.file_type,
		}


@app.post("/save")
async def save_project(req: SaveRequest):
	"""Save project JSON to PROJECTS_DIR. Filename sanitized."""
	body = req.project
	fname = req.filename or "project.json"
	# sanitize simple filenames (no path separators)
	fname = os.path.basename(fname)
	if not fname.endswith(".json"):
		fname = fname + ".json"
	target = safe_resolve(PROJECTS_DIR, fname)
	# basic size guard
	raw = json.dumps(body)
	if len(raw.encode("utf-8")) > 10 * 1024 * 1024:
		raise HTTPException(status_code=413, detail="Payload too large")
	# write asynchronously
	async with aiofiles.open(target, "w", encoding="utf-8") as f:
		await f.write(raw)
	return JSONResponse({"status": "success", "savedPath": str(target.relative_to(Path.cwd()))})


@app.get("/projects")
async def list_projects() -> List[dict]:
	"""List all saved projects with summary metadata."""
	projects = []
	for file in PROJECTS_DIR.glob("*.json"):
		try:
			async with aiofiles.open(file, "r", encoding="utf-8") as f:
				content = await f.read()
				data = json.loads(content)
				projects.append({
					"filename": file.name,
					"name": data.get("metadata", {}).get("name", file.stem),
					"created": data.get("metadata", {}).get("created"),
					"modified": data.get("metadata", {}).get("modified"),
					"nodeCount": len(data.get("nodes", [])),
					"itemCount": len(data.get("selectedItemKeys", [])),
				})
		except Exception:
			# Skip invalid files
			continue

	# Sort by modified date, newest first
	projects.sort(key=lambda p: p.get("modified", 0) or 0, reverse=True)
	return projects


@app.get("/projects/{filename}")
async def get_project(filename: str):
	"""Load a specific project file."""
	target = safe_resolve(PROJECTS_DIR, filename)

	if not target.exists():
		raise HTTPException(status_code=404, detail="Project not found")

	if not str(target).endswith(".json"):
		raise HTTPException(status_code=400, detail="Invalid file type")

	async with aiofiles.open(target, "r", encoding="utf-8") as f:
		content = await f.read()
		return json.loads(content)


@app.delete("/projects/{filename}")
async def delete_project(filename: str):
	"""Delete a project file."""
	target = safe_resolve(PROJECTS_DIR, filename)

	if not target.exists():
		raise HTTPException(status_code=404, detail="Project not found")

	target.unlink()
	return {"status": "deleted", "filename": filename}


@app.get("/projects/{filename}/export")
async def export_project(filename: str, format: str = "json"):
	"""
	Export a project with its chat history.

	Args:
		filename: The project filename (e.g., "My Project.json")
		format: Export format - "json" or "markdown"
	"""
	target = safe_resolve(PROJECTS_DIR, filename)

	if not target.exists():
		raise HTTPException(status_code=404, detail="Project not found")

	# Load project data
	async with aiofiles.open(target, "r", encoding="utf-8") as f:
		content = await f.read()
		project_data = json.loads(content)

	# Get project ID from filename (remove .json extension)
	project_id = filename.replace(".json", "")

	# Fetch chat sessions for this project
	chat_sessions = []
	with Session(engine) as session:
		statement = select(ChatSession).where(ChatSession.project_id == project_id)
		sessions = session.exec(statement).all()

		for chat_session in sessions:
			# Get messages for this session
			msg_statement = select(ChatMessage).where(
				ChatMessage.session_id == chat_session.id
			).order_by(ChatMessage.created_at)
			messages = session.exec(msg_statement).all()

			chat_sessions.append({
				"id": chat_session.id,
				"title": chat_session.title,
				"created_at": chat_session.created_at.isoformat() if chat_session.created_at else None,
				"updated_at": chat_session.updated_at.isoformat() if chat_session.updated_at else None,
				"messages": [
					{
						"role": msg.role,
						"content": msg.content,
						"created_at": msg.created_at.isoformat() if msg.created_at else None,
						"citations": json.loads(msg.citations_json) if msg.citations_json else [],
					}
					for msg in messages
				]
			})

	if format == "markdown":
		return _generate_markdown_export(project_data, chat_sessions)
	else:
		return {
			"project": project_data,
			"chatHistory": chat_sessions,
			"exportedAt": datetime.utcnow().isoformat(),
		}


def _generate_markdown_export(project_data: dict, chat_sessions: list) -> PlainTextResponse:
	"""Generate a human-readable markdown export of the project."""
	lines = []

	# Header
	metadata = project_data.get("metadata", {})
	project_name = metadata.get("name", "Untitled Project")
	lines.append(f"# {project_name}")
	lines.append("")

	# Project info
	if metadata.get("created"):
		created = datetime.fromtimestamp(metadata["created"] / 1000).strftime("%Y-%m-%d %H:%M")
		lines.append(f"**Created:** {created}")
	if metadata.get("modified"):
		modified = datetime.fromtimestamp(metadata["modified"] / 1000).strftime("%Y-%m-%d %H:%M")
		lines.append(f"**Last Modified:** {modified}")
	lines.append("")

	# Canvas Nodes
	nodes = project_data.get("nodes", [])
	if nodes:
		lines.append("## Canvas Nodes")
		lines.append("")
		for node in nodes:
			node_type = node.get("type", "unknown")
			data = node.get("data", {})

			if node_type == "snippetNode":
				source = data.get("sourceName", data.get("sourcePdf", "Unknown source"))
				label = data.get("label", "")[:200]
				page = data.get("location", {}).get("pageIndex", 0) + 1
				lines.append(f"- **[Snippet]** \"{label}...\" *(from {source}, p.{page})*")
			elif node_type == "noteNode":
				label = data.get("label", "Empty note")
				color = data.get("color", "yellow")
				lines.append(f"- **[Note - {color}]** {label}")
		lines.append("")

	# Edges/Connections
	edges = project_data.get("edges", [])
	if edges:
		lines.append("## Connections")
		lines.append("")
		for edge in edges:
			label = edge.get("label", "")
			direction = edge.get("arrowDirection", "forward")
			arrow = "→" if direction == "forward" else "←" if direction == "backward" else "↔" if direction == "both" else "—"
			label_part = f': "{label}"' if label else ""
			lines.append(f"- Node {edge.get('source', '?')} {arrow} Node {edge.get('target', '?')}{label_part}")
		lines.append("")

	# Chat History
	if chat_sessions:
		lines.append("## AI Chat History")
		lines.append("")

		for session in chat_sessions:
			session_date = session.get("updated_at", session.get("created_at", "Unknown"))
			if session_date != "Unknown":
				try:
					session_date = datetime.fromisoformat(session_date.replace("Z", "+00:00")).strftime("%Y-%m-%d %H:%M")
				except:
					pass

			lines.append(f"### {session.get('title', 'Untitled Session')} ({session_date})")
			lines.append("")

			for msg in session.get("messages", []):
				role = msg.get("role", "unknown").capitalize()
				content = msg.get("content", "")

				if role == "User":
					lines.append(f"**User:** {content}")
				else:
					lines.append(f"**AI:** {content}")
				lines.append("")

	# Footer
	lines.append("---")
	lines.append(f"*Exported from PaperLoom on {datetime.utcnow().strftime('%Y-%m-%d %H:%M UTC')}*")

	markdown_content = "\n".join(lines)

	return PlainTextResponse(
		content=markdown_content,
		media_type="text/markdown",
		headers={
			"Content-Disposition": f'attachment; filename="{project_name}.md"'
		}
	)

