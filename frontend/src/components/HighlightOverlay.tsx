import { useEffect, useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import { pdfRectToDomRect } from '../utils/coordinates';

export function HighlightOverlay() {
  const pdfViewerState = useAppStore((state) => state.pdfViewerState);
  const setHighlightedRect = useAppStore((state) => state.setHighlightedRect);
  const [pageHeight, setPageHeight] = useState<number>(842); // Default A4 height

  const { highlightedRect, scale } = pdfViewerState;

  // Auto-dismiss highlight after 3 seconds
  useEffect(() => {
    if (highlightedRect) {
      const timer = setTimeout(() => {
        setHighlightedRect(null);
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [highlightedRect, setHighlightedRect]);

  if (!highlightedRect) return null;

  // Convert PDF coordinates to DOM coordinates
  const domRect = pdfRectToDomRect(highlightedRect.rect, pageHeight, scale);

  return (
    <div
      className="absolute border-2 border-yellow-400 bg-yellow-200 bg-opacity-30 pointer-events-none animate-pulse"
      style={{
        left: domRect.x,
        top: domRect.y,
        width: domRect.width,
        height: domRect.height,
        zIndex: 15,
        transition: 'opacity 0.3s ease-in-out',
      }}
    />
  );
}
