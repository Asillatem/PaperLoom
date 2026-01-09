import { useEffect, useRef, useCallback } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/TextLayer.css';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import { useAppStore } from '../store/useAppStore';
import { getPdfUrl } from '../api';
import { SelectionLayer } from './SelectionLayer';
import { HighlightOverlay } from './HighlightOverlay';
import { PersistentHighlights } from './PersistentHighlights';
import {
  clientRectsToPageRelative,
  calculateBoundingBox,
  filterSmallRects,
  normalizeRects,
} from '../utils/highlightUtils';
import { domRectToPdfRect } from '../utils/coordinates';
import type { SnippetNode } from '../types';

// Configure PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

export function PDFViewer() {
  const containerRef = useRef<HTMLDivElement>(null);
  const selectedPdf = useAppStore((state) => state.selectedPdf);
  const pdfViewerState = useAppStore((state) => state.pdfViewerState);
  const nodes = useAppStore((state) => state.nodes);
  const setPdfNumPages = useAppStore((state) => state.setPdfNumPages);
  const addNode = useAppStore((state) => state.addNode);
  const addHighlight = useAppStore((state) => state.addHighlight);

  const { currentPage, scale } = pdfViewerState;
  const pdfUrl = selectedPdf ? getPdfUrl(selectedPdf.path) : null;

  // Handle native text selection
  const handleTextSelection = useCallback(() => {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) return;

    const text = selection.toString().trim();
    // Require minimum 3 characters to prevent accidental selections
    if (!text || text.length < 3) return;

    // Ensure selection is within our PDF container
    const anchorNode = selection.anchorNode;
    if (!anchorNode || !containerRef.current?.contains(anchorNode)) {
      return;
    }

    // Get the page container element
    const pageContainer = containerRef.current?.querySelector('.react-pdf__Page');
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

    // Filter out tiny artifacts (increased thresholds)
    pageRelativeRects = filterSmallRects(pageRelativeRects, 5, 5);

    if (pageRelativeRects.length === 0) {
      selection.removeAllRanges();
      return;
    }

    // Calculate total selection area to prevent marking the whole page
    const totalArea = pageRelativeRects.reduce((sum, r) => sum + r.width * r.height, 0);
    const pageRect = pageContainer.getBoundingClientRect();
    const pageArea = pageRect.width * pageRect.height;

    // If selection covers more than 50% of the page, it's probably an error
    if (totalArea > pageArea * 0.5) {
      selection.removeAllRanges();
      return;
    }

    // Normalize to scale 1.0 for storage
    const normalizedRects = normalizeRects(pageRelativeRects, scale);

    // Calculate bounding box for PDF location
    const boundingBox = calculateBoundingBox(normalizedRects);

    // Get page height for coordinate conversion
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
        sourceName: selectedPdf?.name || 'Unknown',
        sourceType: 'pdf',
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

    // Also add to highlights for rendering (include pdfPath)
    addHighlight({
      id: nodeId,
      pdfPath: selectedPdf?.path || '',
      pageIndex: currentPage - 1,
      rects: normalizedRects,
    });

    // Clear the selection
    selection.removeAllRanges();
  }, [selectedPdf, currentPage, scale, nodes.length, addNode, addHighlight]);

  // Listen for mouseup to handle text selection
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener('mouseup', handleTextSelection);
    return () => {
      container.removeEventListener('mouseup', handleTextSelection);
    };
  }, [handleTextSelection]);

  // Handle document load success
  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setPdfNumPages(numPages);
  };

  // Handle document load error
  const onDocumentLoadError = (error: Error) => {
    console.error('Failed to load PDF:', error);
  };

  if (!pdfUrl) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500">
        <div className="text-center">
          <p className="text-lg mb-2">No PDF selected</p>
          <p className="text-sm">Select a PDF from the library to begin</p>
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="h-full flex flex-col bg-gray-100">
      <div className="flex-1 overflow-auto">
        <div className="flex justify-center p-4">
          <div className="relative">
            <Document
              file={pdfUrl}
              onLoadSuccess={onDocumentLoadSuccess}
              onLoadError={onDocumentLoadError}
              loading={
                <div className="flex items-center justify-center p-8">
                  <div className="text-gray-500">Loading PDF...</div>
                </div>
              }
              error={
                <div className="flex items-center justify-center p-8">
                  <div className="text-red-500">
                    Failed to load PDF. Please check the file and try again.
                  </div>
                </div>
              }
            >
              <Page
                pageNumber={pdfViewerState.currentPage}
                scale={pdfViewerState.scale}
                renderTextLayer={true}
                renderAnnotationLayer={false}
                loading={
                  <div className="flex items-center justify-center p-8 bg-white">
                    <div className="text-gray-400">Loading page...</div>
                  </div>
                }
              />
            </Document>

            {/* Persistent text highlights */}
            <PersistentHighlights />

            {/* Selection overlay for bounding-box text extraction (fallback mode) */}
            <SelectionLayer />

            {/* Highlight overlay for bi-directional linking */}
            <HighlightOverlay />
          </div>
        </div>
      </div>
    </div>
  );
}
