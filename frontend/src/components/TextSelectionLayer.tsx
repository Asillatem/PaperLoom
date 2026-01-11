import { useRef, useCallback } from 'react';
import { useAppStore } from '../store/useAppStore';
import {
  clientRectsToPageRelative,
  calculateBoundingBox,
  filterSmallRects,
  normalizeRects,
} from '../utils/highlightUtils';
import { domRectToPdfRect } from '../utils/coordinates';
import type { SnippetNode } from '../types';

/**
 * TextSelectionLayer handles native browser text selection on the PDF text layer.
 * When text is selected and the mouse is released, it creates a snippet node
 * with proper multi-line highlight data.
 */
export function TextSelectionLayer() {
  const layerRef = useRef<HTMLDivElement>(null);

  const selectedPdf = useAppStore((state) => state.selectedPdf);
  const pdfViewerState = useAppStore((state) => state.pdfViewerState);
  const nodes = useAppStore((state) => state.nodes);
  const addNode = useAppStore((state) => state.addNode);
  const addHighlight = useAppStore((state) => state.addHighlight);

  const { currentPage, scale } = pdfViewerState;

  const handleMouseUp = useCallback(() => {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) return;

    const text = selection.toString().trim();
    if (!text) return;

    // Get the page container element
    const pageContainer = layerRef.current?.closest('.react-pdf__Page');
    if (!pageContainer) {
      selection.removeAllRanges();
      return;
    }

    // Get all DOMRects from the selection (one per line for multi-line)
    const range = selection.getRangeAt(0);
    const clientRects = Array.from(range.getClientRects());

    if (clientRects.length === 0) {
      selection.removeAllRanges();
      return;
    }

    // Convert client rects to page-relative coordinates
    let pageRelativeRects = clientRectsToPageRelative(clientRects, pageContainer);

    // Filter out tiny artifacts
    pageRelativeRects = filterSmallRects(pageRelativeRects);

    if (pageRelativeRects.length === 0) {
      selection.removeAllRanges();
      return;
    }

    // Normalize to scale 1.0 for storage
    const normalizedRects = normalizeRects(pageRelativeRects, scale);

    // Calculate bounding box for PDF location
    const boundingBox = calculateBoundingBox(normalizedRects);

    // Get page height for coordinate conversion
    // The page element has the actual rendered dimensions
    const pageRect = pageContainer.getBoundingClientRect();
    const pageHeight = pageRect.height / scale;

    // Convert bounding box to PDF coordinates
    const pdfRect = domRectToPdfRect(boundingBox, pageHeight, 1.0);

    // Create the snippet node
    const nodeId = `node-${Date.now()}`;
    const newNode: SnippetNode = {
      id: nodeId,
      type: 'snippetNode',
      data: {
        label: text,
        sourcePdf: selectedPdf?.path || '',
        location: {
          pageIndex: currentPage - 1,
          rect: pdfRect,
          highlightRects: normalizedRects,
        },
        comments: [],
      },
      position: {
        x: 100 + (nodes.length * 30) % 400,
        y: 100 + (nodes.length * 30) % 400,
      },
    };

    addNode(newNode);

    // Also add to highlights for rendering
    addHighlight({
      id: nodeId,
      pdfPath: selectedPdf?.path || '',
      pageIndex: currentPage - 1,
      rects: normalizedRects,
    });

    // Clear the selection
    selection.removeAllRanges();
  }, [selectedPdf, currentPage, scale, nodes.length, addNode, addHighlight]);

  // Don't render if no PDF is selected
  if (!selectedPdf) return null;

  return (
    <div
      ref={layerRef}
      className="absolute inset-0 text-selection-layer"
      style={{
        zIndex: 5,
        pointerEvents: 'none', // Let clicks through to text layer
      }}
      onMouseUp={handleMouseUp}
    >
      {/* This layer captures mouseup events after text selection */}
    </div>
  );
}
