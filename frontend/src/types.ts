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

// Note/Post-it node data structure
export interface NoteNodeData {
  label: string; // Note content
  color: 'yellow' | 'blue' | 'green' | 'pink' | 'purple'; // Post-it color
  comments: Comment[]; // Node comments
}

// Image node data structure (for captured PDF regions)
export interface ImageNodeData {
  imageData: string; // Base64-encoded image data
  sourcePdf: string; // Zotero attachment key or path
  sourceName?: string; // Item title (for display)
  pageIndex: number; // Page where the region was captured
  caption?: string; // Optional user-provided caption
  comments: Comment[]; // Node comments
}

// Staged text item in capture inbox (before placing on canvas)
export interface StagedItem {
  id: string;
  text: string;
  sourcePdf: string; // Zotero attachment key
  sourceName: string; // Display name
  sourceType: 'pdf' | 'html';
  location: PDFLocation;
  capturedAt: number; // Timestamp for ordering
}

// Staged image item in capture inbox (for region captures)
export interface StagedImageItem {
  id: string;
  imageData: string; // Base64-encoded image
  sourcePdf: string; // Zotero attachment key
  sourceName: string; // Display name
  pageIndex: number;
  capturedAt: number; // Timestamp for ordering
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
  selected?: boolean; // Added by ReactFlow at runtime
}

// Note node for canvas
export interface NoteNode {
  id: string;
  type: 'noteNode';
  data: NoteNodeData;
  position: {
    x: number;
    y: number;
  };
  selected?: boolean; // Added by ReactFlow at runtime
}

// Image node for canvas (captured PDF regions)
export interface ImageNode {
  id: string;
  type: 'imageNode';
  selected?: boolean; // Added by ReactFlow at runtime
  data: ImageNodeData;
  position: {
    x: number;
    y: number;
  };
}

// Union type for all canvas nodes
export type CanvasNode = SnippetNode | NoteNode | ImageNode;

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

// Arrow direction for edges
export type ArrowDirection = 'forward' | 'backward' | 'both' | 'none';

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
  arrowDirection?: ArrowDirection; // Arrow direction (defaults to 'forward')
}

// Project data structure for save/load
export interface ProjectData {
  metadata: ProjectMetadata;
  nodes: CanvasNode[]; // All canvas nodes (snippets and notes)
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

// AI Settings for LLM configuration
export interface AISettings {
  provider: 'ollama' | 'openai';
  model_name: string;
  base_url: string;
  temperature: number;
  context_window: number;
  system_prompt: string;
  graph_depth: number;
  openai_key_configured?: boolean; // True if OPENAI_API_KEY is set in backend .env
}

// Chat message from AI Brain
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  citations?: { nodeId: string; preview: string }[];
  contextNodes?: string[];
  timestamp: number;
}

// Chat session for AI Brain
export interface ChatSession {
  id: number;
  projectId: string;
  title: string;
  messages: ChatMessage[];
  createdAt: number;
}
