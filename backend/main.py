from fastapi import FastAPI, HTTPException, UploadFile, File, Request
from fastapi.responses import FileResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import os
from pathlib import Path
from fastapi import FastAPI, HTTPException, UploadFile, File, Request
from fastapi.responses import FileResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import os
from pathlib import Path
import aiofiles
import json
from typing import List, Optional


PDF_DIR = Path(os.environ.get("PDF_DIR", "C:/Users/JOG/Zotero/storage"))
PROJECTS_DIR = Path(os.environ.get("PROJECTS_DIR", str(Path.cwd() / "projects")))
PDF_EXT = ".pdf"

app = FastAPI(title="Zotero-Spatial Local API")

# Dev CORS - restrict to common dev ports
app.add_middleware(
	CORSMiddleware,
	allow_origins=["http://localhost:3000", "http://127.0.0.1:3000", "http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:5174", "http://localhost:5175", "http://localhost:5176", "http://localhost:5177", "http://localhost:5178"],
	allow_credentials=True,
	allow_methods=["*"],
	allow_headers=["*"],
)


def ensure_dirs() -> None:
	PDF_DIR.mkdir(parents=True, exist_ok=True)
	PROJECTS_DIR.mkdir(parents=True, exist_ok=True)


def safe_resolve(base: Path, relative: str) -> Path:
	# Prevent path traversal and ensure file is inside base
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


@app.get("/files")
async def list_files(recursive: Optional[bool] = True) -> List[dict]:
	"""List PDF files under `PDF_DIR` (recursive by default to accommodate Zotero storage)."""
	files = []
	if recursive:
		iterator = PDF_DIR.rglob(f"*{PDF_EXT}")
	else:
		iterator = PDF_DIR.glob(f"*{PDF_EXT}")
	for p in iterator:
		if p.is_file():
			stat = p.stat()
			files.append({
				"filename": str(p.relative_to(PDF_DIR)),
				"size": stat.st_size,
				"modified": stat.st_mtime,
			})
	return files


@app.get("/pdf/{filename:path}")
async def get_pdf(filename: str, download: Optional[bool] = False):
	"""Stream a PDF file by relative path under `PDF_DIR`.
	Use `filename` as a URL-encoded relative path.
	"""
	try:
		target = safe_resolve(PDF_DIR, filename)
	except HTTPException:
		raise
	if not target.exists() or not target.is_file():
		raise HTTPException(status_code=404, detail="File not found")
	headers = {}
	if download:
		headers["Content-Disposition"] = f'attachment; filename="{target.name}"'
	return FileResponse(path=str(target), media_type="application/pdf", headers=headers)


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

