import { useRef, useState } from 'react';
import { pdfjs } from 'react-pdf';
import { useAppStore } from '../store/useAppStore';
import { domRectToPdfRect } from '../utils/coordinates';
import { extractTextFromRect } from '../utils/textExtraction';
import type { SnippetNode } from '../types';

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
  const layerRef = useRef<HTMLDivElement>(null);
  const pageRef = useRef<{ width: number; height: number }>({ width: 0, height: 0 });

  // Get PDF document for text extraction
  const loadPdfDocument = async () => {
    if (!selectedPdf || pdfDoc) return;

    try {
      const url = `http://localhost:8000/pdf/${encodeURIComponent(selectedPdf.path)}`;
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

  return (
    <>
      {/* Invisible overlay for capturing mouse events */}
      <div
        ref={layerRef}
        className="absolute inset-0 cursor-crosshair"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        style={{ zIndex: 10 }}
      />

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
    </>
  );
}
