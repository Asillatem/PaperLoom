# Project Tasks

## Backlog

_(No pending tasks)_

---

## Doing

_(No tasks currently in progress)_

---

## Done

### 2026-01-10
- [x] Add note/post-it nodes to canvas with linking support #frontend #feature
- [x] Add arrows to canvas edge lines #frontend #feature
- [x] Fix PDF zoom to not affect panel size/position #frontend #bug
- [x] Implement resizable panels (3-panel layout with drag handles) #frontend #feature
- [x] Implement Swiss Structure design system #frontend #design

### 2026-01-09
- [x] Fix canvas cards to display item name instead of path #frontend
- [x] Fix Jump to Source for both PDF and HTML files #frontend
- [x] Implement HTML text selection and snippet creation #frontend
- [x] Add persistent highlights for HTML documents #frontend
- [x] Implement multi-page workflow with React Router #frontend
- [x] Add "New" button navigation back to home #frontend
- [x] Add z-index management for canvas cards #frontend
- [x] Implement Zotero Cloud API integration (pyzotero) #backend
- [x] Add SQLite database with SQLModel #backend

### 2026-01-06
- [x] Implement inline text highlighting for PDFs #frontend
- [x] Implement canvas node connections with Bezier curves #frontend
- [x] Add comments system with popover UI #frontend
- [x] Fix highlights persisting across different PDFs #bug
- [x] Fix Jump to source not switching PDF documents #bug
- [x] Fix oversensitive text selection marking whole pages #bug

---

## Architecture Reference

### Multi-Page Workflow (Completed)

| Route | Page | Status |
|-------|------|--------|
| `/` | HomePage | Done |
| `/project/:id/items` | ItemSelectionPage | Done |
| `/project/:id/workspace` | WorkspacePage | Done |
| `/library` | LibraryPage | Done |

### Backend Services (Completed)

| Service | Description | Status |
|---------|-------------|--------|
| `services/zotero.py` | Zotero Cloud API with pyzotero | Done |
| `database.py` | SQLite with SQLModel | Done |
| `models.py` | ZoteroItem cache model | Done |
