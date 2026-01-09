// File entry from backend
export interface FileEntry {
  key: string;        // Zotero attachment key (used for fetching)
  name: string;       // Item title
  filename: string;   // Original filename
  path: string;       // Alias for key (backward compat)
  type: 'pdf' | 'html';
  parentKey?: string;
  itemType?: string;
  size?: number;
  modified?: number;
}

// Individual highlight rectangle (DOM coordinates, scaled)
export interface HighlightRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

// Persistent highlight stored with snippets
export interface PersistentHighlight {
  id: string; // Matches associated SnippetNode id
  pdfPath: string; // PDF file path this highlight belongs to
  pageIndex: number;
  rects: HighlightRect[]; // Array for multi-line support
  color?: string; // Optional highlight color
}

// PDF location metadata
export interface PDFLocation {
  pageIndex: number; // Zero-based page index
  rect: {
    x: number; // PDF coordinates (bottom-left origin)
    y: number;
    width: number;
    height: number;
  };
  highlightRects?: HighlightRect[]; // Multi-line highlight data
}

// Comment attached to a node
export interface Comment {
  id: string;
  text: string;
  timestamp: number; // Date.now()
  edited?: number; // Last edit timestamp
}

// Snippet node data structure (matches spec)
export interface SnippetNodeData {
  label: string; // Extracted text content
  sourcePdf: string; // Zotero attachment key or path
  sourceName?: string; // Item title (for display)
  sourceType?: 'pdf' | 'html'; // File type
  location: PDFLocation;
  comments: Comment[]; // Node comments
}

// ReactFlow node with our custom data
export interface SnippetNode {
  id: string;
  type: 'snippetNode';
  data: SnippetNodeData;
  position: {
    x: number; // Canvas coordinates
    y: number;
  };
}

// PDF viewer state
export interface PDFViewerState {
  currentPage: number; // 1-based page number
  numPages: number | null;
  scale: number; // Zoom level (1.0 = 100%)
  highlightedRect: PDFLocation | null;
}

// Selection state for text extraction
export interface SelectionState {
  isSelecting: boolean;
  startPoint: { x: number; y: number } | null;
  currentRect: { x: number; y: number; width: number; height: number } | null;
  pageIndex: number;
}

// Project metadata
export interface ProjectMetadata {
  name: string;
  created: number;
  modified: number;
  activePdf: string | null;
}

// Edge connecting two nodes on the canvas
export interface SnippetEdge {
  id: string;
  source: string; // Source node id
  target: string; // Target node id
  sourceHandle?: string; // Handle position (top/right/bottom/left)
  targetHandle?: string;
  type?: 'smoothstep' | 'default' | 'straight';
  label?: string; // Optional relationship label
  animated?: boolean;
}

// Project data structure for save/load
export interface ProjectData {
  metadata: ProjectMetadata;
  nodes: SnippetNode[];
  edges: SnippetEdge[]; // Canvas connections
  pdfState: {
    activePdf: string | null;
    currentPage: number;
    scale: number;
  };
  selectedItemKeys: string[]; // Zotero attachment keys included in project
}

// Summary info for project list (lighter than full ProjectData)
export interface ProjectSummary {
  filename: string;         // e.g., "My Research.json"
  name: string;
  created: number;
  modified: number;
  nodeCount: number;
  itemCount: number;        // Number of selected items
}
