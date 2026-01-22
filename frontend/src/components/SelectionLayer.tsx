import { useRef, useState, useEffect } from 'react';
import { pdfjs } from 'react-pdf';
import { useAppStore } from '../store/useAppStore';
import { domRectToPdfRect } from '../utils/coordinates';
import { extractTextFromRect } from '../utils/textExtraction';
import { getPdfUrl } from '../api';
import type { SnippetNode } from '../types';

/**
 * SelectionLayer provides bounding-box text extraction as a fallback mode.
 * Hold Alt key to use bounding-box selection instead of native text selection.
 */
export function SelectionLayer() {
  const selectionState = useAppStore((state) => state.selectionState);
  const pdfViewerState = useAppStore((state) => state.pdfViewerState);
  const selectedPdf = useAppStore((state) => state.selectedPdf);
  const startSelection = useAppStore((state) => state.startSelection);
  const updateSelection = useAppStore((state) => state.updateSelection);
  const finishSelection = useAppStore((state) => state.finishSelection);
  const cancelSelection = useAppStore((state) => state.cancelSelection);
  const addNode = useAppStore((state) => state.addNode);
  const nodes = useAppStore((state) => state.nodes);

  const [pdfDoc, setPdfDoc] = useState<pdfjs.PDFDocumentProxy | null>(null);
  const [altKeyPressed, setAltKeyPressed] = useState(false);
  const layerRef = useRef<HTMLDivElement>(null);
  const pageRef = useRef<{ width: number; height: number }>({ width: 0, height: 0 });

  // Track Alt key state for fallback bounding-box mode
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.altKey) setAltKeyPressed(true);
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (!e.altKey) setAltKeyPressed(false);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // Get PDF document for text extraction
  const loadPdfDocument = async () => {
    if (!selectedPdf || pdfDoc) return;

    try {
      const url = getPdfUrl(selectedPdf.path);
      const loadingTask = pdfjs.getDocument(url);
      const doc = await loadingTask.promise;
      setPdfDoc(doc);

      // Get page dimensions
      const page = await doc.getPage(pdfViewerState.currentPage);
      const viewport = page.getViewport({ scale: 1.0 });
      pageRef.current = {
        width: viewport.width,
        height: viewport.height,
      };
    } catch (error) {
      console.error('Failed to load PDF for text extraction:', error);
    }
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!layerRef.current) return;

    // Load PDF document if not already loaded
    if (!pdfDoc) {
      loadPdfDocument();
    }

    const rect = layerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    startSelection(pdfViewerState.currentPage - 1, { x, y });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!selectionState.isSelecting || !layerRef.current) return;

    const rect = layerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    updateSelection({ x, y });
  };

  const handleMouseUp = async () => {
    if (!selectionState.isSelecting) return;

    const rect = finishSelection();

    if (!rect || rect.width < 5 || rect.height < 5) {
      // Selection too small, ignore
      return;
    }

    // Convert DOM rect to PDF coordinates
    const pdfRect = domRectToPdfRect(
      rect,
      pageRef.current.height,
      pdfViewerState.scale
    );

    // Extract text from the selected region
    if (pdfDoc && selectedPdf) {
      try {
        const text = await extractTextFromRect(
          pdfDoc,
          pdfViewerState.currentPage - 1,
          pdfRect
        );

        if (text.trim()) {
          // Create a new snippet node
          const newNode: SnippetNode = {
            id: `node-${Date.now()}`,
            type: 'snippetNode',
            data: {
              label: text,
              sourcePdf: selectedPdf.path,
              location: {
                pageIndex: pdfViewerState.currentPage - 1,
                rect: pdfRect,
              },
              comments: [],
            },
            position: {
              // Position nodes in a cascading layout
              x: 100 + (nodes.length * 30) % 400,
              y: 100 + (nodes.length * 30) % 400,
            },
          };

          addNode(newNode);
        }
      } catch (error) {
        console.error('Text extraction failed:', error);
      }
    }
  };

  const handleMouseLeave = () => {
    if (selectionState.isSelecting) {
      cancelSelection();
    }
  };

  // Don't render if no PDF is selected
  if (!selectedPdf) return null;

  // Only show the overlay when Alt key is pressed (bounding-box fallback mode)
  // or when actively selecting
  const showOverlay = altKeyPressed || selectionState.isSelecting;

  return (
    <>
      {/* Invisible overlay for capturing mouse events - only active with Alt key */}
      {showOverlay && (
        <div
          ref={layerRef}
          className="absolute inset-0 cursor-crosshair"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseLeave}
          style={{ zIndex: 10 }}
        />
      )}

      {/* Visual feedback for selection rectangle */}
      {selectionState.isSelecting && selectionState.currentRect && (
        <div
          className="absolute border-2 border-blue-500 bg-blue-200 bg-opacity-30 pointer-events-none"
          style={{
            left: selectionState.currentRect.x,
            top: selectionState.currentRect.y,
            width: selectionState.currentRect.width,
            height: selectionState.currentRect.height,
            zIndex: 20,
          }}
        />
      )}

      {/* Hint when Alt is pressed */}
      {altKeyPressed && !selectionState.isSelecting && (
        <div className="absolute top-2 left-2 bg-black bg-opacity-70 text-white text-xs px-2 py-1 rounded pointer-events-none" style={{ zIndex: 25 }}>
          Bounding-box mode: Drag to select area
        </div>
      )}
    </>
  );
}
