import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  FileEntry,
  PDFViewerState,
  SelectionState,
  ProjectMetadata,
  SnippetEdge,
  PDFLocation,
  ProjectData,
  PersistentHighlight,
  CanvasNode,
  NoteNode,
  ArrowDirection,
} from '../types';
import type { Connection, EdgeChange } from 'reactflow';
import { applyEdgeChanges } from 'reactflow';

interface AppStore {
  // PDF State
  selectedPdf: FileEntry | null;
  pdfViewerState: PDFViewerState;

  // Chat State
  chatSidebarOpen: boolean;
  highlightedAiNodes: string[];
  isAiLoading: boolean;
  activeChatSessionId: number | null;

  // Canvas State
  nodes: CanvasNode[];
  edges: SnippetEdge[];

  // Highlight State
  highlights: PersistentHighlight[];

  // Selection State
  selectionState: SelectionState;

  // Project State
  projectMetadata: ProjectMetadata;
  currentProjectId: string | null;
  selectedItemKeys: string[];  // Zotero attachment keys in project
  isDirty: boolean;

  // PDF Actions
  setSelectedPdf: (file: FileEntry | null) => void;
  setPdfPage: (page: number) => void;
  setPdfNumPages: (numPages: number) => void;
  setPdfScale: (scale: number) => void;
  setHighlightedRect: (rect: PDFLocation | null) => void;
  jumpToSource: (pdfPath: string, location: PDFLocation, sourceName?: string, sourceType?: 'pdf' | 'html') => void;

  // Canvas Node Actions
  addNode: (node: CanvasNode) => void;
  addNoteNode: (position: { x: number; y: number }, color?: NoteNode['data']['color']) => void;
  removeNode: (nodeId: string) => void;
  updateNodePosition: (nodeId: string, position: { x: number; y: number }) => void;
  updateNoteContent: (nodeId: string, content: string) => void;

  // Canvas Edge Actions
  addEdge: (edge: SnippetEdge) => void;
  removeEdge: (edgeId: string) => void;
  updateEdgeConfig: (edgeId: string, config: { arrowDirection?: ArrowDirection; label?: string }) => void;
  onEdgesChange: (changes: EdgeChange[]) => void;
  onConnect: (connection: Connection) => void;

  // Highlight Actions
  addHighlight: (highlight: PersistentHighlight) => void;
  removeHighlight: (highlightId: string) => void;
  getHighlightsForPage: (pageIndex: number) => PersistentHighlight[];

  // Comment Actions
  addComment: (nodeId: string, text: string) => void;
  updateComment: (nodeId: string, commentId: string, text: string) => void;
  deleteComment: (nodeId: string, commentId: string) => void;

  // Selection Actions
  startSelection: (pageIndex: number, point: { x: number; y: number }) => void;
  updateSelection: (point: { x: number; y: number }) => void;
  finishSelection: () => SelectionState['currentRect'] | null;
  cancelSelection: () => void;

  // Project Actions
  saveProject: () => Promise<void>;
  loadProject: (data: ProjectData, projectId: string) => void;
  newProject: () => void;
  setProjectName: (name: string) => void;
  setCurrentProjectId: (id: string | null) => void;

  // Selected Items Actions
  setSelectedItemKeys: (keys: string[]) => void;
  addSelectedItemKey: (key: string) => void;
  removeSelectedItemKey: (key: string) => void;

  // Chat Actions
  toggleChatSidebar: () => void;
  setChatSidebarOpen: (open: boolean) => void;
  setHighlightedAiNodes: (nodeIds: string[]) => void;
  setIsAiLoading: (loading: boolean) => void;
  setActiveChatSessionId: (sessionId: number | null) => void;
}

export const useAppStore = create<AppStore>()(
  persist(
    (set, get) => ({
      // Initial PDF State
      selectedPdf: null,
      pdfViewerState: {
        currentPage: 1,
        numPages: null,
        scale: 1.0,
        highlightedRect: null,
      },

      // Initial Chat State
      chatSidebarOpen: false,
      highlightedAiNodes: [],
      isAiLoading: false,
      activeChatSessionId: null,

      // Initial Canvas State
      nodes: [],
      edges: [],

      // Initial Highlight State
      highlights: [],

      // Initial Selection State
      selectionState: {
        isSelecting: false,
        startPoint: null,
        currentRect: null,
        pageIndex: 0,
      },

      // Initial Project State
      projectMetadata: {
        name: 'Untitled Project',
        created: Date.now(),
        modified: Date.now(),
        activePdf: null,
      },
      currentProjectId: null,
      selectedItemKeys: [],
      isDirty: false,

      // PDF Actions
      setSelectedPdf: (file) =>
        set((state) => ({
          selectedPdf: file,
          pdfViewerState: {
            ...state.pdfViewerState,
            currentPage: 1,
            highlightedRect: null,
          },
          projectMetadata: {
            ...state.projectMetadata,
            activePdf: file?.path || null,
            modified: Date.now(),
          },
          isDirty: true,
        })),

      setPdfPage: (page) =>
        set((state) => ({
          pdfViewerState: {
            ...state.pdfViewerState,
            currentPage: page,
          },
        })),

      setPdfNumPages: (numPages) =>
        set((state) => ({
          pdfViewerState: {
            ...state.pdfViewerState,
            numPages,
          },
        })),

      setPdfScale: (scale) =>
        set((state) => ({
          pdfViewerState: {
            ...state.pdfViewerState,
            scale,
          },
        })),

      setHighlightedRect: (rect) =>
        set((state) => ({
          pdfViewerState: {
            ...state.pdfViewerState,
            highlightedRect: rect,
          },
        })),

      jumpToSource: (pdfPath, location, sourceName, sourceType) =>
        set((state) => {
          // Use provided name or extract from path
          const name = sourceName || pdfPath.split(/[/\\]/).pop() || pdfPath;
          // Default to 'pdf' for backward compatibility
          const type = sourceType || 'pdf';

          // Check if we need to switch files
          const needsSwitch = state.selectedPdf?.path !== pdfPath;

          return {
            selectedPdf: needsSwitch
              ? {
                  key: pdfPath,
                  name,
                  filename: name,
                  path: pdfPath,
                  type,
                }
              : state.selectedPdf,
            pdfViewerState: {
              ...state.pdfViewerState,
              currentPage: location.pageIndex + 1,
              highlightedRect: location,
              // Reset numPages if switching files (will be set when file loads)
              numPages: needsSwitch ? null : state.pdfViewerState.numPages,
            },
            projectMetadata: needsSwitch
              ? {
                  ...state.projectMetadata,
                  activePdf: pdfPath,
                  modified: Date.now(),
                }
              : state.projectMetadata,
          };
        }),

      // Canvas Actions
      addNode: (node) =>
        set((state) => ({
          nodes: [...state.nodes, node],
          isDirty: true,
          projectMetadata: {
            ...state.projectMetadata,
            modified: Date.now(),
          },
        })),

      addNoteNode: (position, color = 'yellow') => {
        const noteNode: NoteNode = {
          id: `note-${Date.now()}`,
          type: 'noteNode',
          data: {
            label: '',
            color,
            comments: [],
          },
          position,
        };

        set((state) => ({
          nodes: [...state.nodes, noteNode],
          isDirty: true,
          projectMetadata: {
            ...state.projectMetadata,
            modified: Date.now(),
          },
        }));
      },

      removeNode: (nodeId) =>
        set((state) => ({
          nodes: state.nodes.filter((n) => n.id !== nodeId),
          edges: state.edges.filter(
            (e) => e.source !== nodeId && e.target !== nodeId
          ),
          highlights: state.highlights.filter((h) => h.id !== nodeId),
          isDirty: true,
          projectMetadata: {
            ...state.projectMetadata,
            modified: Date.now(),
          },
        })),

      updateNodePosition: (nodeId, position) =>
        set((state) => ({
          nodes: state.nodes.map((n) =>
            n.id === nodeId ? { ...n, position } : n
          ),
          isDirty: true,
        })),

      updateNoteContent: (nodeId, content) =>
        set((state) => ({
          nodes: state.nodes.map((n) =>
            n.id === nodeId && n.type === 'noteNode'
              ? { ...n, data: { ...n.data, label: content } }
              : n
          ),
          isDirty: true,
          projectMetadata: {
            ...state.projectMetadata,
            modified: Date.now(),
          },
        })),

      // Edge Actions
      addEdge: (edge) =>
        set((state) => ({
          edges: [...state.edges, edge],
          isDirty: true,
          projectMetadata: {
            ...state.projectMetadata,
            modified: Date.now(),
          },
        })),

      removeEdge: (edgeId) =>
        set((state) => ({
          edges: state.edges.filter((e) => e.id !== edgeId),
          isDirty: true,
          projectMetadata: {
            ...state.projectMetadata,
            modified: Date.now(),
          },
        })),

      updateEdgeConfig: (edgeId, config) =>
        set((state) => ({
          edges: state.edges.map((e) =>
            e.id === edgeId
              ? {
                  ...e,
                  ...(config.arrowDirection !== undefined && { arrowDirection: config.arrowDirection }),
                  ...(config.label !== undefined && { label: config.label }),
                }
              : e
          ),
          isDirty: true,
          projectMetadata: {
            ...state.projectMetadata,
            modified: Date.now(),
          },
        })),

      onEdgesChange: (changes) =>
        set((state) => ({
          edges: applyEdgeChanges(changes, state.edges) as SnippetEdge[],
          isDirty: true,
        })),

      onConnect: (connection) => {
        if (!connection.source || !connection.target) return;
        if (connection.source === connection.target) return; // Prevent self-connections

        const state = get();
        // Check for duplicate edges
        const exists = state.edges.some(
          (e) =>
            e.source === connection.source && e.target === connection.target
        );
        if (exists) return;

        const newEdge: SnippetEdge = {
          id: `edge-${Date.now()}`,
          source: connection.source,
          target: connection.target,
          sourceHandle: connection.sourceHandle || undefined,
          targetHandle: connection.targetHandle || undefined,
          type: 'smoothstep',
          arrowDirection: 'forward',
        };

        set((state) => ({
          edges: [...state.edges, newEdge],
          isDirty: true,
          projectMetadata: {
            ...state.projectMetadata,
            modified: Date.now(),
          },
        }));
      },

      // Highlight Actions
      addHighlight: (highlight) =>
        set((state) => ({
          highlights: [...state.highlights, highlight],
          isDirty: true,
        })),

      removeHighlight: (highlightId) =>
        set((state) => ({
          highlights: state.highlights.filter((h) => h.id !== highlightId),
          isDirty: true,
        })),

      getHighlightsForPage: (pageIndex) => {
        const state = get();
        return state.highlights.filter((h) => h.pageIndex === pageIndex);
      },

      // Comment Actions
      addComment: (nodeId, text) =>
        set((state) => ({
          nodes: state.nodes.map((n) =>
            n.id === nodeId
              ? {
                  ...n,
                  data: {
                    ...n.data,
                    comments: [
                      ...(n.data.comments || []),
                      {
                        id: `comment-${Date.now()}`,
                        text,
                        timestamp: Date.now(),
                      },
                    ],
                  },
                }
              : n
          ) as CanvasNode[],
          isDirty: true,
          projectMetadata: {
            ...state.projectMetadata,
            modified: Date.now(),
          },
        })),

      updateComment: (nodeId, commentId, text) =>
        set((state) => ({
          nodes: state.nodes.map((n) =>
            n.id === nodeId
              ? {
                  ...n,
                  data: {
                    ...n.data,
                    comments: (n.data.comments || []).map((c) =>
                      c.id === commentId
                        ? { ...c, text, edited: Date.now() }
                        : c
                    ),
                  },
                }
              : n
          ) as CanvasNode[],
          isDirty: true,
        })),

      deleteComment: (nodeId, commentId) =>
        set((state) => ({
          nodes: state.nodes.map((n) =>
            n.id === nodeId
              ? {
                  ...n,
                  data: {
                    ...n.data,
                    comments: (n.data.comments || []).filter(
                      (c) => c.id !== commentId
                    ),
                  },
                }
              : n
          ) as CanvasNode[],
          isDirty: true,
        })),

      // Selection Actions
      startSelection: (pageIndex, point) =>
        set(() => ({
          selectionState: {
            isSelecting: true,
            startPoint: point,
            currentRect: { x: point.x, y: point.y, width: 0, height: 0 },
            pageIndex,
          },
        })),

      updateSelection: (point) =>
        set((state) => {
          const { startPoint, pageIndex } = state.selectionState;
          if (!startPoint) return state;

          const x = Math.min(startPoint.x, point.x);
          const y = Math.min(startPoint.y, point.y);
          const width = Math.abs(point.x - startPoint.x);
          const height = Math.abs(point.y - startPoint.y);

          return {
            selectionState: {
              isSelecting: true,
              startPoint,
              currentRect: { x, y, width, height },
              pageIndex,
            },
          };
        }),

      finishSelection: () => {
        const state = get();
        const { currentRect } = state.selectionState;

        set({
          selectionState: {
            isSelecting: false,
            startPoint: null,
            currentRect: null,
            pageIndex: 0,
          },
        });

        return currentRect;
      },

      cancelSelection: () =>
        set({
          selectionState: {
            isSelecting: false,
            startPoint: null,
            currentRect: null,
            pageIndex: 0,
          },
        }),

      // Project Actions
      saveProject: async () => {
        const state = get();

        const projectData: ProjectData = {
          metadata: {
            ...state.projectMetadata,
            modified: Date.now(),
          },
          nodes: state.nodes,
          edges: state.edges,
          pdfState: {
            activePdf: state.selectedPdf?.path || null,
            currentPage: state.pdfViewerState.currentPage,
            scale: state.pdfViewerState.scale,
          },
          selectedItemKeys: state.selectedItemKeys,
        };

        try {
          const response = await fetch('http://localhost:8000/save', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              project: projectData,
              filename: state.projectMetadata.name,
            }),
          });

          if (!response.ok) {
            throw new Error(`Save failed: ${response.status}`);
          }

          set({ isDirty: false });
        } catch (error) {
          console.error('Save failed:', error);
          throw error;
        }
      },

      loadProject: (data, projectId) =>
        set({
          projectMetadata: data.metadata,
          currentProjectId: projectId,
          // Ensure backward compatibility: initialize comments array for old nodes
          nodes: data.nodes.map((n) => ({
            ...n,
            data: {
              ...n.data,
              comments: n.data.comments || [],
            },
          })) as CanvasNode[],
          edges: data.edges || [], // Handle old projects without edges
          selectedItemKeys: data.selectedItemKeys || [], // Handle old projects
          pdfViewerState: {
            currentPage: data.pdfState.currentPage,
            scale: data.pdfState.scale,
            numPages: null,
            highlightedRect: null,
          },
          isDirty: false,
        }),

      newProject: () =>
        set({
          nodes: [],
          edges: [],
          highlights: [],
          selectedPdf: null,
          selectedItemKeys: [],
          currentProjectId: null,
          pdfViewerState: {
            currentPage: 1,
            numPages: null,
            scale: 1.0,
            highlightedRect: null,
          },
          projectMetadata: {
            name: 'Untitled Project',
            created: Date.now(),
            modified: Date.now(),
            activePdf: null,
          },
          isDirty: false,
        }),

      setProjectName: (name) =>
        set((state) => ({
          projectMetadata: {
            ...state.projectMetadata,
            name,
            modified: Date.now(),
          },
          isDirty: true,
        })),

      setCurrentProjectId: (id) =>
        set({ currentProjectId: id }),

      // Selected Items Actions
      setSelectedItemKeys: (keys) =>
        set({
          selectedItemKeys: keys,
          isDirty: true,
        }),

      addSelectedItemKey: (key) =>
        set((state) => ({
          selectedItemKeys: state.selectedItemKeys.includes(key)
            ? state.selectedItemKeys
            : [...state.selectedItemKeys, key],
          isDirty: true,
        })),

      removeSelectedItemKey: (key) =>
        set((state) => ({
          selectedItemKeys: state.selectedItemKeys.filter((k) => k !== key),
          isDirty: true,
        })),

      // Chat Actions
      toggleChatSidebar: () =>
        set((state) => ({
          chatSidebarOpen: !state.chatSidebarOpen,
        })),

      setChatSidebarOpen: (open) =>
        set({ chatSidebarOpen: open }),

      setHighlightedAiNodes: (nodeIds) =>
        set({ highlightedAiNodes: nodeIds }),

      setIsAiLoading: (loading) =>
        set({ isAiLoading: loading }),

      setActiveChatSessionId: (sessionId) =>
        set({ activeChatSessionId: sessionId }),
    }),
    {
      name: 'liquid-science-storage',
      partialize: (state) => ({
        // Only persist certain state
        nodes: state.nodes,
        edges: state.edges,
        highlights: state.highlights,
        projectMetadata: state.projectMetadata,
        currentProjectId: state.currentProjectId,
        selectedItemKeys: state.selectedItemKeys,
        selectedPdf: state.selectedPdf,
        pdfViewerState: {
          scale: state.pdfViewerState.scale,
        },
      }),
    }
  )
);
