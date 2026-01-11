# Changelog

## [Unreleased]

---

## 2026-01-10

### Added
- **Resizable panels** - 3-panel layout with drag handles using `react-resizable-panels`
- **Note/Post-it nodes** - add notes to canvas via "Add Note" button or right-click context menu
  - 5 colors: yellow, blue, green, pink, purple
  - Editable content with double-click
  - Full connection support (can link to snippets and other notes)
- **Arrow markers on edges** - directional arrows showing relationship direction
- **Swiss Structure design system** - complete UI overhaul
  - Primary color: `blue-900` (#1e3a8a)
  - Background: `neutral-200` (#e5e5e5)
  - Zero border radius throughout (`rounded-none`)
  - Spine accent cards (`border-l-4 border-blue-900`)
  - Reusable CSS component classes (`btn-primary`, `btn-secondary`, `card-spine`, `input-field`, `badge`, `alert-box`)

### Fixed
- PDF zoom no longer affects panel size/position (proper overflow containment)

### Changed
- Updated all pages: HomePage, ItemSelectionPage, LibraryPage, WorkspacePage
- Updated components: PageLayout, PDFLibrarySidebar, SnippetNodeComponent, QuickAddModal, ContextMenu, CommentPopover, PDFControls
- Navigation bar now dark blue (`bg-blue-900`) with white text
- Cards use hover translate effect (`hover:translate-x-1`)
- Uppercase headings with letter tracking for institutional feel
- Canvas now uses `ReactFlowProvider` wrapper for hook access

---

## 2026-01-09

### Added
- **Multi-page workflow with React Router**
  - HomePage (`/`): List and manage saved projects
  - ItemSelectionPage (`/project/:id/items`): Select Zotero items for project
  - WorkspacePage (`/project/:id/workspace`): Main annotation workspace
  - LibraryPage (`/library`): Browse full Zotero library with sync
- Project management: create, load, delete projects via backend API
- `selectedItemKeys` state: projects now track which Zotero items are included
- Sidebar filtering: shows only selected items (backward compatible with showing all)
- QuickAddModal: add items to project from workspace without leaving
- Unsaved changes warning: prompts before navigation or tab close
- **HTML text selection**: select text in HTML snapshots to create snippets
- **HTML persistent highlights**: highlights render in HTML documents like PDFs

### Fixed
- Canvas card titles now display item name instead of key/path
- Jump to Source works correctly for both PDF and HTML files
- Added `sourceName` and `sourceType` to snippet node data for proper routing
- SQLite caching for Zotero library metadata (faster loading)
- New backend endpoints: `GET/DELETE /projects`, `GET /projects/{filename}`

### Changed
- Refactored App.tsx into WorkspacePage.tsx
- Updated Zustand store with project and item selection state
- `/files` endpoint now returns cached items instead of live API calls

---

## 2026-01-06

### Added
- Implement inline text highlighting for PDFs
- Implement canvas node connections with Bezier curves
- Add comments system with popover UI

### Fixed
- Fix highlights persisting across different PDFs
- Fix Jump to source not switching PDF documents
- Fix oversensitive text selection marking whole pages
