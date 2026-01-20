import {
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Maximize,
  Globe,
  Focus,
  Minimize2,
} from 'lucide-react';
import { useAppStore } from '../store/useAppStore';

export function PDFControls() {
  const pdfViewerState = useAppStore((state) => state.pdfViewerState);
  const selectedFile = useAppStore((state) => state.selectedPdf);
  const setPdfPage = useAppStore((state) => state.setPdfPage);
  const setPdfScale = useAppStore((state) => state.setPdfScale);
  const focusMode = useAppStore((state) => state.focusMode);
  const toggleFocusMode = useAppStore((state) => state.toggleFocusMode);

  const { currentPage, numPages, scale } = pdfViewerState;
  const isPdf = selectedFile?.type === 'pdf';

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

  // Extract filename from path
  const filename = selectedFile?.name || 'Unknown';

  return (
    <div className="flex items-center justify-between px-4 py-2 bg-white border-b border-neutral-300">
      {/* Left side: File info or Page Navigation */}
      <div className="flex items-center gap-2">
        {isPdf ? (
          <>
            <button
              onClick={handlePrevPage}
              disabled={!canGoPrev}
              className="p-1.5 rounded-none hover:bg-neutral-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              title="Previous page"
            >
              <ChevronLeft className="w-5 h-5 text-neutral-700" />
            </button>

            <span className="text-sm font-medium text-neutral-700 min-w-[100px] text-center">
              Page {currentPage} {numPages ? `of ${numPages}` : ''}
            </span>

            <button
              onClick={handleNextPage}
              disabled={!canGoNext}
              className="p-1.5 rounded-none hover:bg-neutral-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              title="Next page"
            >
              <ChevronRight className="w-5 h-5 text-neutral-700" />
            </button>
          </>
        ) : (
          <div className="flex items-center gap-2">
            <Globe className="w-4 h-4 text-green-600" />
            <span className="text-sm font-medium text-neutral-700 truncate max-w-[200px]" title={filename}>
              {filename}
            </span>
            <span className="badge bg-green-100 text-green-700">
              HTML
            </span>
          </div>
        )}
      </div>

      {/* Right side controls */}
      <div className="flex items-center gap-2">
        {/* Zoom Controls - only for PDF */}
        {isPdf && (
          <>
            <button
              onClick={handleZoomOut}
              className="p-1.5 rounded-none hover:bg-neutral-100 transition-colors"
              title="Zoom out"
            >
              <ZoomOut className="w-5 h-5 text-neutral-700" />
            </button>

            <span className="text-sm font-mono text-neutral-700 min-w-[60px] text-center">
              {Math.round(scale * 100)}%
            </span>

            <button
              onClick={handleZoomIn}
              className="p-1.5 rounded-none hover:bg-neutral-100 transition-colors"
              title="Zoom in"
            >
              <ZoomIn className="w-5 h-5 text-neutral-700" />
            </button>

            <div className="h-4 w-px bg-neutral-300 mx-1" />

            <button
              onClick={handleFitWidth}
              className="px-2 py-1 text-xs font-medium rounded-none hover:bg-neutral-100 transition-colors text-neutral-700"
              title="Fit width (100%)"
            >
              Fit Width
            </button>

            <button
              onClick={handleFitPage}
              className="p-1.5 rounded-none hover:bg-neutral-100 transition-colors"
              title="Fit page (80%)"
            >
              <Maximize className="w-5 h-5 text-neutral-700" />
            </button>

            <div className="h-4 w-px bg-neutral-300 mx-1" />
          </>
        )}

        {/* Focus Mode Toggle */}
        <button
          onClick={toggleFocusMode}
          className={`p-1.5 rounded-none transition-colors ${
            focusMode
              ? 'bg-blue-900 text-white hover:bg-blue-800'
              : 'hover:bg-neutral-100 text-neutral-700'
          }`}
          title={focusMode ? 'Exit Focus Mode (F)' : 'Enter Focus Mode (F)'}
        >
          {focusMode ? <Minimize2 className="w-5 h-5" /> : <Focus className="w-5 h-5" />}
        </button>
      </div>
    </div>
  );
}
