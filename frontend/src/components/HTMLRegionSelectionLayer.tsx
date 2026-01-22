import { useState, useCallback, useRef } from 'react';
import html2canvas from 'html2canvas';
import { useAppStore } from '../store/useAppStore';
import type { StagedImageItem } from '../types';

interface HTMLRegionSelectionLayerProps {
  iframeRef: React.RefObject<HTMLIFrameElement | null>;
}

export function HTMLRegionSelectionLayer({ iframeRef }: HTMLRegionSelectionLayerProps) {
  const [isSelecting, setIsSelecting] = useState(false);
  const [startPoint, setStartPoint] = useState<{ x: number; y: number } | null>(null);
  const [currentRect, setCurrentRect] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);

  const regionSelectMode = useAppStore((state) => state.regionSelectMode);
  const addImageToStaging = useAppStore((state) => state.addImageToStaging);
  const selectedFile = useAppStore((state) => state.selectedPdf);

  const layerRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (!regionSelectMode || isCapturing) return;

      e.preventDefault();
      e.stopPropagation();

      const layerRect = layerRef.current?.getBoundingClientRect();
      if (!layerRect) return;

      const x = e.clientX - layerRect.left;
      const y = e.clientY - layerRect.top;

      setIsSelecting(true);
      setStartPoint({ x, y });
      setCurrentRect({ x, y, width: 0, height: 0 });
    },
    [regionSelectMode, isCapturing]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isSelecting || !startPoint) return;

      const layerRect = layerRef.current?.getBoundingClientRect();
      if (!layerRect) return;

      const currentX = e.clientX - layerRect.left;
      const currentY = e.clientY - layerRect.top;

      const x = Math.min(startPoint.x, currentX);
      const y = Math.min(startPoint.y, currentY);
      const width = Math.abs(currentX - startPoint.x);
      const height = Math.abs(currentY - startPoint.y);

      setCurrentRect({ x, y, width, height });
    },
    [isSelecting, startPoint]
  );

  const handleMouseUp = useCallback(
    async (e: React.MouseEvent) => {
      if (!isSelecting || !currentRect || !selectedFile) {
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

      setIsCapturing(true);

      try {
        const iframe = iframeRef.current;
        if (!iframe?.contentDocument?.body) {
          console.error('Cannot access iframe content');
          return;
        }

        // Get the iframe's scroll position
        const iframeWindow = iframe.contentWindow;
        const scrollX = iframeWindow?.scrollX || 0;
        const scrollY = iframeWindow?.scrollY || 0;

        // Capture the entire iframe content as a canvas
        const canvas = await html2canvas(iframe.contentDocument.body, {
          allowTaint: true,
          useCORS: true,
          logging: false,
          scale: window.devicePixelRatio || 1,
          scrollX: -scrollX,
          scrollY: -scrollY,
          windowWidth: iframe.contentDocument.documentElement.scrollWidth,
          windowHeight: iframe.contentDocument.documentElement.scrollHeight,
        });

        // Create a new canvas to extract the selected region
        const extractCanvas = document.createElement('canvas');
        const ctx = extractCanvas.getContext('2d');
        if (!ctx) {
          return;
        }

        // Account for device pixel ratio
        const dpr = window.devicePixelRatio || 1;

        // Calculate the source coordinates accounting for scroll and pixel ratio
        const sourceX = (currentRect.x + scrollX) * dpr;
        const sourceY = (currentRect.y + scrollY) * dpr;
        const sourceWidth = currentRect.width * dpr;
        const sourceHeight = currentRect.height * dpr;

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
          sourcePdf: selectedFile.path,
          sourceName: selectedFile.name || 'Unknown',
          pageIndex: 0, // HTML doesn't have pages
          capturedAt: Date.now(),
        };

        addImageToStaging(stagedImage);
      } catch (error) {
        console.error('Failed to capture HTML region:', error);
      } finally {
        setIsCapturing(false);
        setIsSelecting(false);
        setStartPoint(null);
        setCurrentRect(null);
      }
    },
    [isSelecting, currentRect, selectedFile, iframeRef, addImageToStaging]
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
        if (isSelecting && !isCapturing) {
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
            {Math.round(currentRect.width)} x {Math.round(currentRect.height)}
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

      {/* Capturing indicator */}
      {isCapturing && (
        <div className="absolute inset-0 bg-black/30 flex items-center justify-center pointer-events-none">
          <div className="bg-white px-4 py-2 rounded-none shadow-lg text-sm font-medium">
            Capturing...
          </div>
        </div>
      )}
    </div>
  );
}
