import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  FileEntry,
  PDFViewerState,
  SelectionState,
  ProjectMetadata,
  SnippetNode,
  PDFLocation,
  ProjectData,
} from '../types';

interface AppStore {
  // PDF State
  selectedPdf: FileEntry | null;
  pdfViewerState: PDFViewerState;

  // Canvas State
  nodes: SnippetNode[];

  // Selection State
  selectionState: SelectionState;

  // Project State
  projectMetadata: ProjectMetadata;
  isDirty: boolean;

  // PDF Actions
  setSelectedPdf: (file: FileEntry | null) => void;
  setPdfPage: (page: number) => void;
  setPdfNumPages: (numPages: number) => void;
  setPdfScale: (scale: number) => void;
  setHighlightedRect: (rect: PDFLocation | null) => void;

  // Canvas Actions
  addNode: (node: SnippetNode) => void;
  removeNode: (nodeId: string) => void;
  updateNodePosition: (nodeId: string, position: { x: number; y: number }) => void;

  // Selection Actions
  startSelection: (pageIndex: number, point: { x: number; y: number }) => void;
  updateSelection: (point: { x: number; y: number }) => void;
  finishSelection: () => SelectionState['currentRect'] | null;
  cancelSelection: () => void;

  // Project Actions
  saveProject: () => Promise<void>;
  loadProject: (data: ProjectData) => void;
  newProject: () => void;
  setProjectName: (name: string) => void;
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

      // Initial Canvas State
      nodes: [],

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

      removeNode: (nodeId) =>
        set((state) => ({
          nodes: state.nodes.filter((n) => n.id !== nodeId),
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
          pdfState: {
            activePdf: state.selectedPdf?.path || null,
            currentPage: state.pdfViewerState.currentPage,
            scale: state.pdfViewerState.scale,
          },
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

      loadProject: (data) =>
        set({
          projectMetadata: data.metadata,
          nodes: data.nodes,
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
          selectedPdf: null,
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
    }),
    {
      name: 'liquid-science-storage',
      partialize: (state) => ({
        // Only persist certain state
        nodes: state.nodes,
        projectMetadata: state.projectMetadata,
        selectedPdf: state.selectedPdf,
        pdfViewerState: {
          scale: state.pdfViewerState.scale,
        },
      }),
    }
  )
);
