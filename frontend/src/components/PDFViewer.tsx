import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/TextLayer.css';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import { useAppStore } from '../store/useAppStore';
import { getPdfUrl } from '../api';
import { SelectionLayer } from './SelectionLayer';
import { HighlightOverlay } from './HighlightOverlay';

// Configure PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

export function PDFViewer() {
  const selectedPdf = useAppStore((state) => state.selectedPdf);
  const pdfViewerState = useAppStore((state) => state.pdfViewerState);
  const setPdfNumPages = useAppStore((state) => state.setPdfNumPages);

  const pdfUrl = selectedPdf ? getPdfUrl(selectedPdf.path) : null;

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
    <div className="h-full flex flex-col bg-gray-100">
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

            {/* Selection overlay for text extraction */}
            <SelectionLayer />

            {/* Highlight overlay for bi-directional linking */}
            <HighlightOverlay />
          </div>
        </div>
      </div>
    </div>
  );
}
