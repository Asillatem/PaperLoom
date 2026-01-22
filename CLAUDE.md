# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**PaperLoom** is a full-stack web application for PDF and HTML document annotation with a spatial canvas-based relationship mapping system. It integrates with Zotero's local document storage for managing academic papers and research documents. Users can extract text snippets from documents, place them on an infinite canvas, create relationships between them via edges, and add comments.

## Tech Stack

- **Frontend**: React 19 + TypeScript + Vite
- **Backend**: Python FastAPI
- **State Management**: Zustand (with localStorage persistence)
- **Canvas**: ReactFlow for node-graph visualization
- **PDF Rendering**: react-pdf
- **Styling**: Tailwind CSS
- **Routing**: React Router v7
- **Panel Layout**: react-resizable-panels

## Commands

### Frontend (from `frontend/` directory)

```bash
npm install          # Install dependencies
npm run dev          # Development server (port 5173)
npm run build        # Production build (runs tsc -b && vite build)
npm run lint         # ESLint
```

### Backend (from `backend/` directory)

```bash
python -m venv venv                    # Create virtual environment
venv\Scripts\activate                   # Activate (Windows)
source venv/bin/activate                # Activate (macOS/Linux)
pip install -r requirements.txt         # Install dependencies
uvicorn main:app --reload --port 8000   # Run dev server
```

### Running Both Services

Start backend on port 8000, then frontend on port 5173. Frontend API calls are hardcoded to `http://localhost:8000`.

## Architecture

### Directory Structure

```
frontend/src/
  components/       # React components (Canvas, PDFViewer, ChatSidebar, etc.)
  pages/            # Route pages (HomePage, WorkspacePage, LibraryPage, ItemSelectionPage)
  store/            # Zustand store (useAppStore.ts)
  hooks/            # Custom React hooks (useKeyboardShortcuts)
  utils/            # Coordinate conversion, text extraction, highlight utilities
  types.ts          # TypeScript interfaces
  api.ts            # Backend API client

backend/
  main.py           # FastAPI server
  routers/          # API route modules (chat.py, settings.py)
  services/         # Business logic services
    zotero.py       # Zotero API integration (pyzotero)
    llm_factory.py  # LLM provider abstraction (Ollama, OpenAI)
    vector_store.py # ChromaDB vector store for RAG
    graph_service.py # Graph expansion utilities
  database.py       # SQLite with SQLModel for caching
  models.py         # Database models (ChatSession, ChatMessage)
  schemas/          # Pydantic schemas
  projects/         # Saved project JSON files
```

### Key Components

- **Canvas.tsx**: ReactFlow-based node canvas with snippet and note nodes, edge connections, context menu
- **PDFViewer.tsx**: PDF document viewer with react-pdf, includes TextSelectionLayer and PersistentHighlights
- **HTMLViewer.tsx**: HTML document viewer for Zotero web snapshots with text selection support
- **TextSelectionLayer.tsx**: Text selection overlay for creating snippets from PDFs
- **PersistentHighlights.tsx**: Renders highlights tied to canvas nodes
- **SnippetNodeComponent.tsx**: Canvas node for document snippets with source location and comments
- **NoteNodeComponent.tsx**: Canvas node for post-it style notes (5 colors, editable content)
- **PDFLibrarySidebar.tsx**: File browser that routes PDFs vs HTML to appropriate viewers
- **ChatSidebar.tsx**: AI chat interface with streaming, context modes, session history

### Multi-Page Workflow

| Route | Page | Purpose |
|-------|------|---------|
| `/` | HomePage | List and manage saved projects |
| `/project/:id/items` | ItemSelectionPage | Select Zotero items for project |
| `/project/:id/workspace` | WorkspacePage | Main annotation workspace |
| `/library` | LibraryPage | Browse full Zotero library with sync |

### Backend API Endpoints

**File & Project Management:**
```
GET  /files                  - List PDF/HTML files (cached from Zotero)
GET  /pdf/{filename}         - Stream PDF file by relative path
GET  /html/{filename}        - Stream HTML file by relative path
POST /save                   - Save project JSON
GET  /projects               - List all saved projects
GET  /projects/{filename}    - Load specific project
DELETE /projects/{filename}  - Delete project
POST /sync                   - Sync library from Zotero Cloud API
```

**AI Chat (Graph-Guided RAG):**
```
POST /chat/                  - Send message and get AI response
POST /chat/stream            - Stream AI response via SSE
GET  /chat/sessions/{pid}    - List chat sessions for project
GET  /chat/sessions/{pid}/{sid} - Get session with messages
DELETE /chat/sessions/{sid}  - Delete chat session
POST /chat/sessions/{sid}/summary - Generate conversation summary
```

**Settings:**
```
GET  /settings/ai            - Get AI settings (key masked)
PUT  /settings/ai            - Update AI settings
POST /settings/ai/test       - Test LLM connection
GET  /settings/ai/models     - Fetch available models from provider
```

All endpoints include path traversal protection via `safe_resolve()` function.

### Coordinate Systems

The codebase manages two coordinate systems:
- **PDF Coordinates**: Bottom-left origin, Y increases upward (used in `PDFLocation`)
- **DOM Coordinates**: Top-left origin, Y increases downward (used for highlights/selections)

Conversion utilities in `frontend/src/utils/coordinates.ts`:
- `pdfToDomY()` / `domToPdfY()` - Y-axis conversion requires page height
- `pdfRectToDomRect()` / `domRectToPdfRect()` - Full rectangle conversion

### State Management

Zustand store (`useAppStore.ts`) manages:
- **PDF state**: selected file, current page, scale, temporary highlight
- **Canvas state**: nodes, edges
- **Highlights**: persistent highlights tied to nodes by matching IDs
- **Project metadata**: name, timestamps, active PDF

**Persistence**: Uses `zustand/middleware/persist` with `partialize` to selectively persist to localStorage (key: `paperloom-storage`). Page position and temporary highlights are NOT persisted.

**Cascade deletion**: When `removeNode()` is called, associated edges and highlights are also removed.

### Environment Configuration

Backend uses environment variables with defaults in `main.py`:
- `PDF_DIR`: Path to Zotero storage (default: `C:/Users/JOG/Zotero/storage`)
- `PROJECTS_DIR`: Path for saving projects (default: `./projects`)

## Key Data Types

- **CanvasNode**: Union type of `SnippetNode | NoteNode` - all nodes on the canvas
- **SnippetNode**: Document snippet with `sourcePdf`, `location`, `comments`
- **NoteNode**: Post-it note with `label`, `color`, `comments`
- **SnippetEdge**: Connection between nodes with optional label (smoothstep bezier curves with arrow markers)
- **PersistentHighlight**: Highlight rectangles tied to canvas nodes by matching `id`
- **PDFLocation**: Page index + rect in PDF coordinates + optional `highlightRects` for multi-line
- **FileEntry**: File metadata with `type` field ('pdf' | 'html') for viewer routing

## Important Behaviors

### Bi-directional Navigation
Clicking a canvas node's "Jump to Source" button (via `jumpToSource`):
1. Switches the active document if needed
2. Navigates to the correct page
3. Sets `highlightedRect` for temporary visual feedback

### File Type Routing
`FileEntry.type` determines which viewer renders the document:
- `'pdf'` → PDFViewer.tsx (text selection via TextSelectionLayer)
- `'html'` → HTMLViewer.tsx (text selection via injected script in iframe)

### Multi-line Text Selection
Text selections can span multiple lines. `PersistentHighlight.rects` is an array to support this.

### AI Brain (Chat with Graph-Guided RAG)

The chat feature uses Retrieval-Augmented Generation with graph expansion:

1. **Vector Search**: ChromaDB stores snippet node embeddings, queries retrieve top-5 similar nodes
2. **Context Modes**:
   - `auto`: RAG-only (vector search finds relevant snippets)
   - `manual`: Only user-pinned nodes
   - `hybrid`: Both RAG results and pinned nodes
3. **Graph Expansion**: Retrieved nodes are expanded via canvas edges (configurable depth)
4. **Citation Parsing**: LLM responses reference `[1]`, `[2]` etc., parsed back to node IDs
5. **Streaming**: `/chat/stream` endpoint uses SSE for real-time token delivery

**LLM Providers** (configured via `/settings/ai`):
- **Ollama** (default): Local models at `http://localhost:11434/v1`
- **OpenAI**: Requires API key, supports GPT-4, o1, o3 models

### Design System
Uses "Swiss Structure" design language:
- Primary color: `blue-900` (#1e3a8a)
- Background: `neutral-200` (#e5e5e5)
- Zero border radius (`rounded-none`)
- Spine accent cards (`border-l-4 border-blue-900`)
- CSS component classes in `index.css`: `btn-primary`, `btn-secondary`, `card-spine`, `input-field`, `badge`
