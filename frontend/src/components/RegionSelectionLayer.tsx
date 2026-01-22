import { useState, useCallback, useRef } from 'react';
import { useAppStore } from '../store/useAppStore';
import type { StagedImageItem } from '../types';

interface RegionSelectionLayerProps {
  pageContainer: HTMLElement | null;
  currentPage: number;
}

export function RegionSelectionLayer({ pageContainer, currentPage }: RegionSelectionLayerProps) {
  const [isSelecting, setIsSelecting] = useState(false);
  const [startPoint, setStartPoint] = useState<{ x: number; y: number } | null>(null);
  const [currentRect, setCurrentRect] = useState<{ x: number; y: number; width: number; height: number } | null>(null);

  const regionSelectMode = useAppStore((state) => state.regionSelectMode);
  const addImageToStaging = useAppStore((state) => state.addImageToStaging);
  const selectedPdf = useAppStore((state) => state.selectedPdf);
  const scale = useAppStore((state) => state.pdfViewerState.scale);

  const layerRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (!regionSelectMode || !pageContainer) return;

      e.preventDefault();
      e.stopPropagation();

      const rect = pageContainer.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      setIsSelecting(true);
      setStartPoint({ x, y });
      setCurrentRect({ x, y, width: 0, height: 0 });
    },
    [regionSelectMode, pageContainer]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isSelecting || !startPoint || !pageContainer) return;

      const rect = pageContainer.getBoundingClientRect();
      const currentX = e.clientX - rect.left;
      const currentY = e.clientY - rect.top;

      const x = Math.min(startPoint.x, currentX);
      const y = Math.min(startPoint.y, currentY);
      const width = Math.abs(currentX - startPoint.x);
      const height = Math.abs(currentY - startPoint.y);

      setCurrentRect({ x, y, width, height });
    },
    [isSelecting, startPoint, pageContainer]
  );

  const handleMouseUp = useCallback(
    async (e: React.MouseEvent) => {
      if (!isSelecting || !currentRect || !pageContainer || !selectedPdf) {
        setIsSelecting(false);
        setStartPoint(null);
        setCurrentRect(null);
        return;
      }

      e.preventDefault();
      e.stopPropagation();

      // Minimum selection size
      if (currentRect.width < 20 || currentRect.height < 20) {
        setIsSelecting(false);
        setStartPoint(null);
        setCurrentRect(null);
        return;
      }

      try {
        // Get the canvas element from the PDF page
        const canvas = pageContainer.querySelector('canvas');
        if (!canvas) {
          console.error('PDF canvas not found');
          setIsSelecting(false);
          setStartPoint(null);
          setCurrentRect(null);
          return;
        }

        // Create a new canvas to extract the region
        const extractCanvas = document.createElement('canvas');
        const ctx = extractCanvas.getContext('2d');
        if (!ctx) {
          setIsSelecting(false);
          setStartPoint(null);
          setCurrentRect(null);
          return;
        }

        // Calculate the actual pixel coordinates on the PDF canvas
        // The PDF canvas might have a different scale from the DOM
        const canvasRect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / canvasRect.width;
        const scaleY = canvas.height / canvasRect.height;

        const sourceX = currentRect.x * scaleX;
        const sourceY = currentRect.y * scaleY;
        const sourceWidth = currentRect.width * scaleX;
        const sourceHeight = currentRect.height * scaleY;

        // Set the extract canvas size
        extractCanvas.width = sourceWidth;
        extractCanvas.height = sourceHeight;

        // Draw the selected region to the extract canvas
        ctx.drawImage(
          canvas,
          sourceX,
          sourceY,
          sourceWidth,
          sourceHeight,
          0,
          0,
          sourceWidth,
          sourceHeight
        );

        // Convert to base64
        const imageData = extractCanvas.toDataURL('image/png');

        // Create staged image item
        const stagedImage: StagedImageItem = {
          id: `staged-image-${Date.now()}`,
          imageData,
          sourcePdf: selectedPdf.path,
          sourceName: selectedPdf.name || 'Unknown',
          pageIndex: currentPage - 1,
          capturedAt: Date.now(),
        };

        addImageToStaging(stagedImage);
      } catch (error) {
        console.error('Failed to capture region:', error);
      }

      setIsSelecting(false);
      setStartPoint(null);
      setCurrentRect(null);
    },
    [isSelecting, currentRect, pageContainer, selectedPdf, currentPage, addImageToStaging]
  );

  if (!regionSelectMode) return null;

  return (
    <div
      ref={layerRef}
      className="absolute inset-0 z-20 cursor-crosshair"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={() => {
        if (isSelecting) {
          setIsSelecting(false);
          setStartPoint(null);
          setCurrentRect(null);
        }
      }}
    >
      {/* Selection Rectangle */}
      {currentRect && currentRect.width > 0 && currentRect.height > 0 && (
        <div
          className="absolute border-2 border-teal-500 bg-teal-500/20 pointer-events-none"
          style={{
            left: currentRect.x,
            top: currentRect.y,
            width: currentRect.width,
            height: currentRect.height,
          }}
        >
          {/* Size indicator */}
          <div className="absolute -top-6 left-0 bg-teal-600 text-white text-xs px-1.5 py-0.5 rounded-none font-mono">
            {Math.round(currentRect.width / scale)} x {Math.round(currentRect.height / scale)}
          </div>
        </div>
      )}

      {/* Visual indicator that region select mode is active */}
      <div className="absolute top-2 left-2 bg-teal-600 text-white text-xs px-2 py-1 rounded-none flex items-center gap-1 pointer-events-none">
        <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="3" width="18" height="18" rx="0" />
          <path d="M3 9h18M9 3v18" />
        </svg>
        Region Select Mode
      </div>
    </div>
  );
}
