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
  ImageNode,
  ArrowDirection,
  StagedItem,
  StagedImageItem,
  SnippetNode,
} from '../types';
import type { Connection, EdgeChange } from 'reactflow';
import { applyEdgeChanges } from 'reactflow';

interface ViewportState {
  x: number;
  y: number;
  zoom: number;
}

interface AppStore {
  // UI State
  focusMode: boolean;
  collapsedNodeIds: string[];

  // PDF State
  selectedPdf: FileEntry | null;
  pdfViewerState: PDFViewerState;

  // Chat State
  chatSidebarOpen: boolean;
  highlightedAiNodes: string[];
  isAiLoading: boolean;
  activeChatSessionId: number | null;

  // Metadata Panel State
  metadataPanelKey: string | null;

  // Canvas State
  nodes: CanvasNode[];
  edges: SnippetEdge[];
  viewportState: ViewportState | null;

  // Highlight State
  highlights: PersistentHighlight[];

  // Staging State (Capture Inbox)
  stagedItems: StagedItem[];
  stagedImages: StagedImageItem[];
  stagingExpanded: boolean;
  regionSelectMode: boolean; // Toggle between text and region selection

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
  updateNodeSelection: (nodeId: string, selected: boolean) => void;

  // Canvas Edge Actions
  addEdge: (edge: SnippetEdge) => void;
  removeEdge: (edgeId: string) => void;
  updateEdgeConfig: (edgeId: string, config: { arrowDirection?: ArrowDirection; label?: string }) => void;
  onEdgesChange: (changes: EdgeChange[]) => void;
  onConnect: (connection: Connection) => void;

  // Canvas Viewport Actions
  setViewportState: (viewport: ViewportState) => void;

  // Highlight Actions
  addHighlight: (highlight: PersistentHighlight) => void;
  removeHighlight: (highlightId: string) => void;
  getHighlightsForPage: (pageIndex: number) => PersistentHighlight[];

  // Staging Actions (Capture Inbox)
  addToStaging: (item: StagedItem) => void;
  removeFromStaging: (id: string) => void;
  clearStaging: () => void;
  moveToCanvas: (id: string, position?: { x: number; y: number }) => void;
  moveAllToCanvas: () => void;
  toggleStagingExpanded: () => void;

  // Image Staging Actions
  addImageToStaging: (item: StagedImageItem) => void;
  removeImageFromStaging: (id: string) => void;
  clearImageStaging: () => void;
  moveImageToCanvas: (id: string, position?: { x: number; y: number }) => void;
  toggleRegionSelectMode: () => void;
  updateImageCaption: (nodeId: string, caption: string) => void;

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

  // Metadata Panel Actions
  openMetadataPanel: (attachmentKey: string) => void;
  closeMetadataPanel: () => void;

  // UI Actions
  toggleFocusMode: () => void;
  toggleNodeCollapsed: (nodeId: string) => void;
  isNodeCollapsed: (nodeId: string) => boolean;
}

export const useAppStore = create<AppStore>()(
  persist(
    (set, get) => ({
      // Initial UI State
      focusMode: false,
      collapsedNodeIds: [],

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

      // Initial Metadata Panel State
      metadataPanelKey: null,

      // Initial Canvas State
      nodes: [],
      edges: [],
      viewportState: null,

      // Initial Highlight State
      highlights: [],

      // Initial Staging State
      stagedItems: [],
      stagedImages: [],
      stagingExpanded: true,
      regionSelectMode: false,

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

      updateNodeSelection: (nodeId, selected) =>
        set((state) => ({
          nodes: state.nodes.map((n) =>
            n.id === nodeId ? { ...n, selected } : n
          ),
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

      // Viewport Actions
      setViewportState: (viewport) =>
        set({ viewportState: viewport }),

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

      // Staging Actions
      addToStaging: (item) =>
        set((state) => {
          // Create pink highlight for staged item
          const stagingHighlight: PersistentHighlight = {
            id: item.id, // Use staged item ID
            pdfPath: item.sourcePdf,
            pageIndex: item.location.pageIndex,
            rects: item.location.highlightRects || [],
            color: 'rgba(255, 182, 193, 0.5)', // Pink for staging
          };

          return {
            stagedItems: [...state.stagedItems, item],
            highlights: [...state.highlights, stagingHighlight],
          };
        }),

      removeFromStaging: (id) =>
        set((state) => ({
          stagedItems: state.stagedItems.filter((item) => item.id !== id),
          highlights: state.highlights.filter((h) => h.id !== id), // Remove pink highlight
        })),

      clearStaging: () =>
        set((state) => {
          // Get all staged item IDs to remove their highlights
          const stagedIds = new Set(state.stagedItems.map((item) => item.id));
          return {
            stagedItems: [],
            highlights: state.highlights.filter((h) => !stagedIds.has(h.id)),
          };
        }),

      moveToCanvas: (id, position) => {
        const state = get();
        const item = state.stagedItems.find((i) => i.id === id);
        if (!item) return;

        // Calculate position: use provided position or stagger based on existing nodes
        const finalPosition = position || {
          x: 100 + state.nodes.length * 30,
          y: 100 + state.nodes.length * 30,
        };

        // Create snippet node from staged item
        const snippetNode: SnippetNode = {
          id: `node-${Date.now()}`,
          type: 'snippetNode',
          data: {
            label: item.text,
            sourcePdf: item.sourcePdf,
            sourceName: item.sourceName,
            sourceType: item.sourceType,
            location: item.location,
            comments: [],
          },
          position: finalPosition,
        };

        // Create yellow highlight for the canvas node
        const highlight: PersistentHighlight = {
          id: snippetNode.id,
          pdfPath: item.sourcePdf,
          pageIndex: item.location.pageIndex,
          rects: item.location.highlightRects || [],
          color: 'rgba(255, 255, 0, 0.4)', // Yellow for canvas items
        };

        set((state) => ({
          nodes: [...state.nodes, snippetNode],
          // Remove pink staging highlight, add yellow canvas highlight
          highlights: [
            ...state.highlights.filter((h) => h.id !== id),
            highlight,
          ],
          stagedItems: state.stagedItems.filter((i) => i.id !== id),
          isDirty: true,
          projectMetadata: {
            ...state.projectMetadata,
            modified: Date.now(),
          },
        }));
      },

      moveAllToCanvas: () => {
        const state = get();
        if (state.stagedItems.length === 0) return;

        const baseX = 100;
        const baseY = 100;
        const offset = 30;
        const startIndex = state.nodes.length;

        const newNodes: SnippetNode[] = [];
        const newHighlights: PersistentHighlight[] = [];
        const stagedIds = new Set(state.stagedItems.map((item) => item.id));

        state.stagedItems.forEach((item, index) => {
          const nodeId = `node-${Date.now()}-${index}`;

          const snippetNode: SnippetNode = {
            id: nodeId,
            type: 'snippetNode',
            data: {
              label: item.text,
              sourcePdf: item.sourcePdf,
              sourceName: item.sourceName,
              sourceType: item.sourceType,
              location: item.location,
              comments: [],
            },
            position: {
              x: baseX + (startIndex + index) * offset,
              y: baseY + (startIndex + index) * offset,
            },
          };

          // Yellow highlight for canvas items
          const highlight: PersistentHighlight = {
            id: nodeId,
            pdfPath: item.sourcePdf,
            pageIndex: item.location.pageIndex,
            rects: item.location.highlightRects || [],
            color: 'rgba(255, 255, 0, 0.4)', // Yellow for canvas items
          };

          newNodes.push(snippetNode);
          newHighlights.push(highlight);
        });

        set((state) => {
          // Remove all pink staging highlights, add yellow canvas highlights
          const filteredHighlights = state.highlights.filter((h) => !stagedIds.has(h.id));

          return {
            nodes: [...state.nodes, ...newNodes],
            highlights: [...filteredHighlights, ...newHighlights],
            stagedItems: [],
            isDirty: true,
            projectMetadata: {
              ...state.projectMetadata,
              modified: Date.now(),
            },
          };
        });
      },

      toggleStagingExpanded: () =>
        set((state) => ({
          stagingExpanded: !state.stagingExpanded,
        })),

      // Image Staging Actions
      addImageToStaging: (item) =>
        set((state) => ({
          stagedImages: [...state.stagedImages, item],
        })),

      removeImageFromStaging: (id) =>
        set((state) => ({
          stagedImages: state.stagedImages.filter((item) => item.id !== id),
        })),

      clearImageStaging: () =>
        set({ stagedImages: [] }),

      moveImageToCanvas: (id, position) => {
        const state = get();
        const item = state.stagedImages.find((i) => i.id === id);
        if (!item) return;

        // Calculate position: use provided position or stagger based on existing nodes
        const finalPosition = position || {
          x: 100 + state.nodes.length * 30,
          y: 100 + state.nodes.length * 30,
        };

        // Create image node from staged item
        const imageNode: ImageNode = {
          id: `image-${Date.now()}`,
          type: 'imageNode',
          data: {
            imageData: item.imageData,
            sourcePdf: item.sourcePdf,
            sourceName: item.sourceName,
            pageIndex: item.pageIndex,
            comments: [],
          },
          position: finalPosition,
        };

        set((state) => ({
          nodes: [...state.nodes, imageNode],
          stagedImages: state.stagedImages.filter((i) => i.id !== id),
          isDirty: true,
          projectMetadata: {
            ...state.projectMetadata,
            modified: Date.now(),
          },
        }));
      },

      toggleRegionSelectMode: () =>
        set((state) => ({
          regionSelectMode: !state.regionSelectMode,
        })),

      updateImageCaption: (nodeId, caption) =>
        set((state) => ({
          nodes: state.nodes.map((n) =>
            n.id === nodeId && n.type === 'imageNode'
              ? { ...n, data: { ...n.data, caption } }
              : n
          ) as CanvasNode[],
          isDirty: true,
          projectMetadata: {
            ...state.projectMetadata,
            modified: Date.now(),
          },
        })),

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
          stagedItems: [], // Clear staging when loading a project
          stagedImages: [], // Clear image staging when loading a project
          regionSelectMode: false,
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
          stagedItems: [],
          stagedImages: [],
          regionSelectMode: false,
          selectedPdf: null,
          selectedItemKeys: [],
          currentProjectId: null,
          viewportState: null,
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

      // Metadata Panel Actions
      openMetadataPanel: (attachmentKey) =>
        set({ metadataPanelKey: attachmentKey }),

      closeMetadataPanel: () =>
        set({ metadataPanelKey: null }),

      // UI Actions
      toggleFocusMode: () =>
        set((state) => ({ focusMode: !state.focusMode })),

      toggleNodeCollapsed: (nodeId) =>
        set((state) => ({
          collapsedNodeIds: state.collapsedNodeIds.includes(nodeId)
            ? state.collapsedNodeIds.filter((id) => id !== nodeId)
            : [...state.collapsedNodeIds, nodeId],
        })),

      isNodeCollapsed: (nodeId) => {
        const state = get();
        return state.collapsedNodeIds.includes(nodeId);
      },
    }),
    {
      name: 'liquid-science-storage',
      partialize: (state) => ({
        // Only persist certain state
        nodes: state.nodes,
        edges: state.edges,
        highlights: state.highlights,
        stagedItems: state.stagedItems,
        stagedImages: state.stagedImages,
        stagingExpanded: state.stagingExpanded,
        projectMetadata: state.projectMetadata,
        currentProjectId: state.currentProjectId,
        selectedItemKeys: state.selectedItemKeys,
        selectedPdf: state.selectedPdf,
        pdfViewerState: {
          scale: state.pdfViewerState.scale,
        },
        viewportState: state.viewportState,
      }),
    }
  )
);
