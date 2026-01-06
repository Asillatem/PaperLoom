// File entry from backend
export interface FileEntry {
  name: string;
  path: string;
  size?: number;
  modified?: number;
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
}

// Snippet node data structure (matches spec)
export interface SnippetNodeData {
  label: string; // Extracted text content
  sourcePdf: string; // Filename from Zotero
  location: PDFLocation;
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

// Project data structure for save/load
export interface ProjectData {
  metadata: ProjectMetadata;
  nodes: SnippetNode[];
  pdfState: {
    activePdf: string | null;
    currentPage: number;
    scale: number;
  };
}
