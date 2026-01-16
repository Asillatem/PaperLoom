import { useEffect, useRef } from 'react';
import { ArrowRight, ArrowLeft, ArrowLeftRight, Minus, Trash2 } from 'lucide-react';
import type { ArrowDirection } from '../types';
import { useAppStore } from '../store/useAppStore';

interface EdgeConfigPopoverProps {
  edgeId: string;
  position: { x: number; y: number };
  currentDirection: ArrowDirection;
  currentLabel?: string;
  onClose: () => void;
}

const directionOptions: { value: ArrowDirection; icon: typeof ArrowRight; label: string }[] = [
  { value: 'forward', icon: ArrowRight, label: 'Forward' },
  { value: 'backward', icon: ArrowLeft, label: 'Backward' },
  { value: 'both', icon: ArrowLeftRight, label: 'Both' },
  { value: 'none', icon: Minus, label: 'None' },
];

export function EdgeConfigPopover({
  edgeId,
  position,
  currentDirection,
  onClose,
}: EdgeConfigPopoverProps) {
  const popoverRef = useRef<HTMLDivElement>(null);
  const updateEdgeConfig = useAppStore((state) => state.updateEdgeConfig);
  const removeEdge = useAppStore((state) => state.removeEdge);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    // Delay adding listener to prevent immediate close
    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
    }, 0);

    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onClose]);

  // Close on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleDirectionChange = (direction: ArrowDirection) => {
    updateEdgeConfig(edgeId, { arrowDirection: direction });
  };

  const handleDelete = () => {
    removeEdge(edgeId);
    onClose();
  };

  // Adjust position to keep popover on screen
  const adjustedPosition = {
    x: Math.min(position.x, window.innerWidth - 200),
    y: Math.min(position.y, window.innerHeight - 200),
  };

  return (
    <div
      ref={popoverRef}
      className="fixed bg-white rounded-none shadow-xl border-l-4 border-blue-900 py-2 z-50 min-w-[180px] context-menu-enter"
      style={{ left: adjustedPosition.x, top: adjustedPosition.y }}
    >
      {/* Header */}
      <div className="px-3 py-1 text-xs font-bold text-neutral-500 uppercase tracking-wide border-b border-neutral-200 mb-2">
        Arrow Direction
      </div>

      {/* Direction Options */}
      <div className="px-2 grid grid-cols-4 gap-1 mb-2">
        {directionOptions.map(({ value, icon: Icon, label }) => (
          <button
            key={value}
            onClick={() => handleDirectionChange(value)}
            className={`
              p-2 flex flex-col items-center justify-center gap-1 rounded-none transition-colors
              ${currentDirection === value
                ? 'bg-blue-900 text-white'
                : 'bg-neutral-100 text-neutral-700 hover:bg-blue-50'
              }
            `}
            title={label}
          >
            <Icon className="w-4 h-4" />
            <span className="text-[10px] font-medium">{label}</span>
          </button>
        ))}
      </div>

      {/* Delete Button */}
      <div className="border-t border-neutral-200 pt-2 px-2">
        <button
          onClick={handleDelete}
          className="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 rounded-none transition-colors"
        >
          <Trash2 className="w-4 h-4" />
          Delete Connection
        </button>
      </div>
    </div>
  );
}
