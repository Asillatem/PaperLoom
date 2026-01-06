import type { NodeProps } from 'reactflow';
import { FileText } from 'lucide-react';
import type { SnippetNodeData } from '../types';
import { useAppStore } from '../store/useAppStore';

export function SnippetNodeComponent({ data, selected }: NodeProps<SnippetNodeData>) {
  const setPdfPage = useAppStore((state) => state.setPdfPage);
  const setHighlightedRect = useAppStore((state) => state.setHighlightedRect);

  const handleJumpToSource = (e: React.MouseEvent) => {
    e.stopPropagation();

    // Navigate to the source page
    setPdfPage(data.location.pageIndex + 1); // Convert to 1-based

    // Highlight the source location
    setHighlightedRect(data.location);
  };

  // Extract filename from path
  const filename = data.sourcePdf.split(/[/\\]/).pop() || data.sourcePdf;

  // Truncate long text for display
  const displayText =
    data.label.length > 200 ? data.label.substring(0, 200) + '...' : data.label;

  return (
    <div
      className={`
        bg-white rounded-lg shadow-lg p-4 border-2 transition-all
        ${selected ? 'border-blue-500 shadow-xl' : 'border-gray-300'}
        min-w-[220px] max-w-[400px]
      `}
    >
      {/* Header with source info */}
      <div className="flex items-center gap-2 mb-2 pb-2 border-b border-gray-200">
        <FileText className="w-4 h-4 text-gray-500 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="text-xs text-gray-600 truncate" title={filename}>
            {filename}
          </div>
          <div className="text-xs text-gray-400">
            Page {data.location.pageIndex + 1}
          </div>
        </div>
      </div>

      {/* Extracted text content */}
      <div className="text-sm text-gray-800 whitespace-pre-wrap mb-3">
        {displayText}
      </div>

      {/* Footer with actions */}
      <div className="flex gap-2 pt-2 border-t border-gray-100">
        <button
          onClick={handleJumpToSource}
          className="text-xs text-blue-600 hover:text-blue-800 hover:underline transition-colors"
        >
          Jump to source
        </button>
      </div>
    </div>
  );
}
