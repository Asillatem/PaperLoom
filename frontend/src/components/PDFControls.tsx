import {
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Maximize,
} from 'lucide-react';
import { useAppStore } from '../store/useAppStore';

export function PDFControls() {
  const pdfViewerState = useAppStore((state) => state.pdfViewerState);
  const setPdfPage = useAppStore((state) => state.setPdfPage);
  const setPdfScale = useAppStore((state) => state.setPdfScale);

  const { currentPage, numPages, scale } = pdfViewerState;

  const canGoPrev = currentPage > 1;
  const canGoNext = numPages ? currentPage < numPages : false;

  const handlePrevPage = () => {
    if (canGoPrev) {
      setPdfPage(currentPage - 1);
    }
  };

  const handleNextPage = () => {
    if (canGoNext) {
      setPdfPage(currentPage + 1);
    }
  };

  const handleZoomIn = () => {
    setPdfScale(Math.min(scale + 0.25, 3.0));
  };

  const handleZoomOut = () => {
    setPdfScale(Math.max(scale - 0.25, 0.5));
  };

  const handleFitWidth = () => {
    setPdfScale(1.0);
  };

  const handleFitPage = () => {
    setPdfScale(0.8);
  };

  return (
    <div className="flex items-center justify-between px-4 py-2 bg-white border-b border-gray-200">
      {/* Page Navigation */}
      <div className="flex items-center gap-2">
        <button
          onClick={handlePrevPage}
          disabled={!canGoPrev}
          className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          title="Previous page"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        <span className="text-sm text-gray-700 min-w-[100px] text-center">
          Page {currentPage} {numPages ? `of ${numPages}` : ''}
        </span>

        <button
          onClick={handleNextPage}
          disabled={!canGoNext}
          className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          title="Next page"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Zoom Controls */}
      <div className="flex items-center gap-2">
        <button
          onClick={handleZoomOut}
          className="p-1.5 rounded hover:bg-gray-100 transition-colors"
          title="Zoom out"
        >
          <ZoomOut className="w-5 h-5" />
        </button>

        <span className="text-sm text-gray-700 min-w-[60px] text-center font-mono">
          {Math.round(scale * 100)}%
        </span>

        <button
          onClick={handleZoomIn}
          className="p-1.5 rounded hover:bg-gray-100 transition-colors"
          title="Zoom in"
        >
          <ZoomIn className="w-5 h-5" />
        </button>

        <div className="h-4 w-px bg-gray-300 mx-1" />

        <button
          onClick={handleFitWidth}
          className="px-2 py-1 text-xs rounded hover:bg-gray-100 transition-colors"
          title="Fit width (100%)"
        >
          Fit Width
        </button>

        <button
          onClick={handleFitPage}
          className="p-1.5 rounded hover:bg-gray-100 transition-colors"
          title="Fit page (80%)"
        >
          <Maximize className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
