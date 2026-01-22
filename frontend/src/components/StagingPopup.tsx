import { ChevronDown, ChevronUp, X, Inbox, Trash2, ArrowRight, GripVertical, Image, FileText } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';

/** Format relative time (e.g., "2m ago", "1h ago") */
function formatRelativeTime(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function StagingPopup() {
  // Text items
  const stagedItems = useAppStore((state) => state.stagedItems);
  const removeFromStaging = useAppStore((state) => state.removeFromStaging);
  const clearStaging = useAppStore((state) => state.clearStaging);
  const moveToCanvas = useAppStore((state) => state.moveToCanvas);
  const moveAllToCanvas = useAppStore((state) => state.moveAllToCanvas);

  // Image items
  const stagedImages = useAppStore((state) => state.stagedImages);
  const removeImageFromStaging = useAppStore((state) => state.removeImageFromStaging);
  const clearImageStaging = useAppStore((state) => state.clearImageStaging);
  const moveImageToCanvas = useAppStore((state) => state.moveImageToCanvas);

  // UI state
  const stagingExpanded = useAppStore((state) => state.stagingExpanded);
  const toggleStagingExpanded = useAppStore((state) => state.toggleStagingExpanded);

  const totalCount = stagedItems.length + stagedImages.length;

  const handleTextDragStart = (e: React.DragEvent, itemId: string) => {
    e.dataTransfer.setData('application/staged-item', itemId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleImageDragStart = (e: React.DragEvent, itemId: string) => {
    e.dataTransfer.setData('application/staged-image', itemId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleClearAll = () => {
    clearStaging();
    clearImageStaging();
  };

  const handleAddAllToCanvas = () => {
    moveAllToCanvas();
    // Move all images one by one
    stagedImages.forEach((img) => {
      moveImageToCanvas(img.id);
    });
  };

  // Don't render if no items
  if (totalCount === 0) {
    return null;
  }

  return (
    <div className="fixed bottom-0 left-1/2 -translate-x-1/2 z-40 w-full max-w-3xl">
      {/* Toggle Tab */}
      <button
        onClick={toggleStagingExpanded}
        className="mx-auto flex items-center gap-2 px-4 py-2 bg-blue-900 text-white hover:bg-blue-800 transition-colors shadow-lg"
        style={{ borderRadius: '8px 8px 0 0' }}
      >
        <Inbox className="w-4 h-4" />
        <span className="text-sm font-medium">
          Staging ({totalCount})
        </span>
        {stagedItems.length > 0 && (
          <span className="flex items-center gap-0.5 text-xs opacity-80">
            <FileText className="w-3 h-3" />
            {stagedItems.length}
          </span>
        )}
        {stagedImages.length > 0 && (
          <span className="flex items-center gap-0.5 text-xs opacity-80">
            <Image className="w-3 h-3" />
            {stagedImages.length}
          </span>
        )}
        {stagingExpanded ? (
          <ChevronDown className="w-4 h-4" />
        ) : (
          <ChevronUp className="w-4 h-4" />
        )}
      </button>

      {/* Expanded Panel */}
      {stagingExpanded && (
        <div className="bg-white border border-neutral-300 border-b-0 shadow-2xl">
          {/* Header with batch actions */}
          <div className="px-4 py-2 flex items-center justify-between border-b border-neutral-200 bg-neutral-50">
            <span className="text-xs font-bold text-neutral-600 uppercase tracking-wide">
              Captured Items
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={handleAddAllToCanvas}
                className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-blue-900 text-white hover:bg-blue-800 transition-colors"
                title="Add all to canvas"
              >
                <ArrowRight className="w-3 h-3" />
                Add All
              </button>
              <button
                onClick={handleClearAll}
                className="flex items-center gap-1 px-2 py-1.5 text-xs font-medium bg-white border border-neutral-300 text-neutral-600 hover:bg-red-50 hover:border-red-300 hover:text-red-600 transition-colors"
                title="Clear all"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* Items List - horizontal scrolling */}
          <div className="flex gap-3 p-3 overflow-x-auto">
            {/* Text snippets */}
            {stagedItems.map((item) => (
              <div
                key={item.id}
                draggable
                onDragStart={(e) => handleTextDragStart(e, item.id)}
                className="group flex-shrink-0 w-64 bg-neutral-50 border border-neutral-200 hover:border-blue-300 hover:shadow-md cursor-grab active:cursor-grabbing transition-all"
              >
                {/* Card Header */}
                <div className="flex items-center justify-between px-3 py-1.5 border-b border-neutral-200 bg-white">
                  <div className="flex items-center gap-2">
                    <GripVertical className="w-3 h-3 text-neutral-400" />
                    <FileText className="w-3 h-3 text-blue-900" />
                    <span
                      className="text-[10px] text-neutral-500 truncate max-w-[120px]"
                      title={item.sourceName}
                    >
                      {item.sourceName}
                    </span>
                  </div>
                  <span className="text-[10px] text-neutral-400">
                    {formatRelativeTime(item.capturedAt)}
                  </span>
                </div>

                {/* Card Content */}
                <div className="p-3">
                  <p className="text-xs text-neutral-700 line-clamp-3 leading-relaxed min-h-[3.75rem]">
                    {item.text.length > 120 ? item.text.slice(0, 120) + '...' : item.text}
                  </p>
                </div>

                {/* Card Actions */}
                <div className="flex items-center justify-end gap-1 px-2 py-1.5 border-t border-neutral-200 bg-white opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => moveToCanvas(item.id)}
                    className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-blue-900 hover:bg-blue-100 transition-colors"
                    title="Add to canvas"
                  >
                    <ArrowRight className="w-3 h-3" />
                    Add
                  </button>
                  <button
                    onClick={() => removeFromStaging(item.id)}
                    className="p-1 text-neutral-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                    title="Remove"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}

            {/* Image captures */}
            {stagedImages.map((item) => (
              <div
                key={item.id}
                draggable
                onDragStart={(e) => handleImageDragStart(e, item.id)}
                className="group flex-shrink-0 w-64 bg-neutral-50 border border-teal-200 hover:border-teal-400 hover:shadow-md cursor-grab active:cursor-grabbing transition-all"
              >
                {/* Card Header */}
                <div className="flex items-center justify-between px-3 py-1.5 border-b border-teal-200 bg-teal-50">
                  <div className="flex items-center gap-2">
                    <GripVertical className="w-3 h-3 text-neutral-400" />
                    <Image className="w-3 h-3 text-teal-600" />
                    <span
                      className="text-[10px] text-neutral-500 truncate max-w-[120px]"
                      title={item.sourceName}
                    >
                      {item.sourceName}
                    </span>
                  </div>
                  <span className="text-[10px] text-neutral-400">
                    {formatRelativeTime(item.capturedAt)}
                  </span>
                </div>

                {/* Card Content - Image Preview */}
                <div className="p-2 bg-white">
                  <img
                    src={item.imageData}
                    alt="Captured region"
                    className="w-full h-20 object-contain bg-neutral-100"
                    draggable={false}
                  />
                  <p className="text-[10px] text-neutral-500 text-center mt-1">
                    Page {item.pageIndex + 1} • Region Capture
                  </p>
                </div>

                {/* Card Actions */}
                <div className="flex items-center justify-end gap-1 px-2 py-1.5 border-t border-teal-200 bg-teal-50 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => moveImageToCanvas(item.id)}
                    className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-teal-700 hover:bg-teal-100 transition-colors"
                    title="Add to canvas"
                  >
                    <ArrowRight className="w-3 h-3" />
                    Add
                  </button>
                  <button
                    onClick={() => removeImageFromStaging(item.id)}
                    className="p-1 text-neutral-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                    title="Remove"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Footer hint */}
          <div className="px-4 py-2 text-[10px] text-neutral-400 text-center border-t border-neutral-200 bg-neutral-50">
            Drag cards to canvas or click Add to place them
          </div>
        </div>
      )}
    </div>
  );
}
