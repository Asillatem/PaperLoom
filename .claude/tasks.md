# Project Tasks

## Architecture Plan: Zotero Cloud + HTML Support

This plan moves from a "Local PDF Reader" to a "Cloud Research Browser."

---

### Phase 1: Foundation & Configuration

**Goal:** Securely manage secrets and establish a robust database.

#### Task 1.1: Implement Environment Variables (.env) ✅

**Backend:**
- [x] Add `python-dotenv` to `backend/requirements.txt`
- [x] Update `backend/main.py` to load environment variables at startup
- [x] Create a `.env.example` file with placeholders:
  ```ini
  # Core
  DATABASE_URL=sqlite:///./liquid_science.db

  # Integrations
  ZOTERO_USER_ID=
  ZOTERO_API_KEY=
  OPENAI_API_KEY=  # Future use
  ```
- [x] Replace hardcoded `PDF_DIR` logic in `main.py` to rely on env vars or fallback gracefully

#### Task 1.2: SQL Database Setup ✅

**Backend:**
- [x] Replace `project.json` file storage with SQLModel (SQLite for now)
- [x] Define Tables:
  - `User` (id, zotero_id)
  - `Project` (id, user_id, name)
  - `Node` (id, project_id, content, zotero_item_key, position_x, position_y)
  - `Edge` (source_node_id, target_node_id)
  - `Comment` (id, node_id, text, timestamps)
  - `Highlight` (id, node_id, document_path, rect coords)

---

### Phase 2: Zotero "Universal" Data Layer

**Goal:** Treat Zotero as the file system for both PDFs and HTML Snapshots.

#### Task 2.1: Zotero Service Integration

**Backend:**
- [ ] Install `pyzotero`
- [ ] Create `services/zotero.py`
- [ ] Implement `get_library_items()`: Fetch metadata for all items (PDFs and Web Snapshots)
- [ ] Logic Change: Instead of listing files from a folder, endpoint returns Zotero Item Objects

#### Task 2.2: Universal File Handler (PDF & HTML)

**Backend (GET /proxy/{item_key}):**
- [ ] Check if `item_key` is cached in a temporary folder
- [ ] If not cached, use `zot.dump(item_key, path)` to download it
- [ ] MIME Type Detection:
  - If PDF: Return `application/pdf`
  - If HTML Snapshot (Zip/Folder): Zotero stores snapshots as ZIPs or folders containing `index.html`
- [ ] Sub-task: Locate the primary `.html` file inside the snapshot
- [ ] Sub-task: Serve the HTML file content (MVP: serve raw HTML string; V2: rewrite relative paths or serve folder as static assets)

---

### Phase 3: Frontend Adaptation

**Goal:** The viewer must be smart enough to handle different content types.

#### Task 3.1: Content Type Switcher

**Frontend (`src/types.ts`):**
- [ ] Update `FileEntry` to include a `contentType` field (`'application/pdf'` or `'text/html'`)

#### Task 3.2: Universal Viewer Component

**Frontend (`PDFViewer.tsx`):**
- [ ] Rename `PDFViewer.tsx` to `DocumentViewer.tsx`
- [ ] Render Logic:
  - If `contentType === 'application/pdf'`: Render existing `<PDFViewer>` (React-PDF)
  - If `contentType === 'text/html'`: Render an `<iframe>` pointing to backend proxy URL
- [ ] Note: Text highlighting in iframe is harder than PDF. MVP: allow viewing snapshot. V2: inject script into iframe to handle selection.

---

## Summary Checklist

- [ ] **Environment:** Add `python-dotenv`. Create `.env` file for `ZOTERO_API_KEY` and `OPENAI_API_KEY`
- [ ] **Backend:** Replace local file scanning with `pyzotero`
- [ ] **HTML Support:** In download endpoint, detect if Zotero item is Web Snapshot. If so, unzip (if needed) and serve `index.html`
- [ ] **Frontend Sidebar:** Fetch items from Zotero API
- [ ] **Frontend Viewer:** Check file type - PDF uses React-PDF, HTML renders inside `<iframe>`

---

## Current: Multi-Page Workflow Implementation

**Goal:** Transform from single-page app to multi-page workflow with React Router.

### Routes
| Route | Page | Purpose |
|-------|------|---------|
| `/` | HomePage | List saved projects, create new |
| `/project/:id/items` | ItemSelectionPage | Select Zotero items for project |
| `/project/:id/workspace` | WorkspacePage | Main annotation workspace |
| `/library` | LibraryPage | Browse all Zotero items, sync |

### Phase 1: Foundation (Router + Navigation) ✅
- [x] Install react-router-dom
- [x] Create `frontend/src/router.tsx`
- [x] Update `frontend/src/main.tsx` to use RouterProvider
- [x] Create `frontend/src/components/PageLayout.tsx`
- [x] Create placeholder pages in `frontend/src/pages/`
- [x] Move App.tsx content to WorkspacePage.tsx

### Phase 2: Backend API ✅
- [x] Add `GET /projects` endpoint (list all projects)
- [x] Add `GET /projects/{filename}` endpoint (load project)
- [x] Add `DELETE /projects/{filename}` endpoint
- [x] Update `frontend/src/api.ts` with new functions

### Phase 3: State Management ✅
- [x] Add `currentProjectId` to store
- [x] Add `selectedItemKeys` array to store
- [x] Add selection actions (add/remove/set)
- [x] Update `loadProject()` and `saveProject()`
- [x] Update `ProjectData` type in types.ts

### Phase 4: HomePage ✅
- [x] Create `ProjectCard.tsx` component
- [x] Implement HomePage with project grid
- [x] Add load/delete project functionality
- [x] Add "New Project" flow

### Phase 5: Item Selection Page ✅
- [x] Create `ItemCard.tsx` component
- [x] Create `ItemGrid.tsx` component
- [x] Implement ItemSelectionPage
- [x] Wire up item selection to store

### Phase 6: Workspace Updates ✅
- [x] Modify PDFLibrarySidebar to filter by selectedItemKeys
- [x] Create `QuickAddModal.tsx`
- [x] Add "+ Add Items" button to sidebar

### Phase 7: Library Page ✅
- [x] Implement LibraryPage (full Zotero overview)
- [x] Add sync functionality

### Phase 8: Polish ✅
- [x] Handle URL direct access (load project from URL)
- [x] Add unsaved changes warning (useBlocker + beforeunload)
- [x] Backward compatibility for old projects (empty selectedItemKeys shows all)

---

## Backlog

### Priority: HTML Text Selection/Marking ✅
- [x] **Add text selection support for HTML snapshots** #frontend #feature #priority
  - Implemented by fetching HTML, injecting selection script, using postMessage
  - Selection handler script injected into iframe via srcdoc
- [x] Add snippet creation from HTML content #frontend #feature
- [x] Add persistent highlights for HTML documents #frontend #feature

### Other
- [x] Debug HTML files not appearing in file list #backend #bug (resolved)
- [x] Debug why only 69 of 122 Zotero entries are showing #backend #bug (resolved)

---

## Done

- [x] Fix canvas cards to display item name instead of path #frontend (completed: 2026-01-09)
- [x] Fix Jump to Source for both PDF and HTML files #frontend (completed: 2026-01-09)
- [x] Implement HTML text selection and snippet creation #frontend (completed: 2026-01-09)
- [x] Add persistent highlights for HTML documents #frontend (completed: 2026-01-09)
- [x] Implement multi-page workflow with React Router #frontend (completed: 2026-01-09)
- [x] Implement inline text highlighting for PDFs #frontend (completed: 2026-01-06)
- [x] Implement canvas node connections with Bezier curves #frontend (completed: 2026-01-06)
- [x] Add comments system with popover UI #frontend (completed: 2026-01-06)
- [x] Fix highlights persisting across different PDFs #bug (completed: 2026-01-06)
- [x] Fix Jump to source not switching PDF documents #bug (completed: 2026-01-06)
- [x] Fix oversensitive text selection marking whole pages #bug (completed: 2026-01-06)
