import { useState, useEffect } from 'react';
import { Handle, Position } from 'reactflow';
import type { NodeProps } from 'reactflow';
import { Image, MessageSquare, Trash2, Edit2, Check, X, ChevronDown, ChevronRight } from 'lucide-react';
import type { ImageNodeData } from '../types';
import { useAppStore } from '../store/useAppStore';
import { CommentPopover } from './CommentPopover';

export function ImageNodeComponent({ data, selected, id }: NodeProps<ImageNodeData>) {
  const [showCommentPopover, setShowCommentPopover] = useState(false);
  const [isEditingCaption, setIsEditingCaption] = useState(false);
  const [captionText, setCaptionText] = useState(data.caption || '');

  const removeNode = useAppStore((state) => state.removeNode);
  const updateImageCaption = useAppStore((state) => state.updateImageCaption);
  const highlightedAiNodes = useAppStore((state) => state.highlightedAiNodes);
  const collapsedNodeIds = useAppStore((state) => state.collapsedNodeIds);
  const toggleNodeCollapsed = useAppStore((state) => state.toggleNodeCollapsed);
  const jumpToSource = useAppStore((state) => state.jumpToSource);

  const isAiHighlighted = highlightedAiNodes.includes(id);
  const isCollapsed = collapsedNodeIds.includes(id);

  const comments = data.comments || [];
  const hasComments = comments.length > 0;

  const displayName = data.sourceName || data.sourcePdf.split(/[/\\]/).pop() || 'Unknown';

  const handleSaveCaption = () => {
    updateImageCaption(id, captionText.trim());
    setIsEditingCaption(false);
  };

  const handleCancelCaption = () => {
    setCaptionText(data.caption || '');
    setIsEditingCaption(false);
  };

  const handleJumpToSource = (e: React.MouseEvent) => {
    e.stopPropagation();
    jumpToSource(data.sourcePdf, {
      pageIndex: data.pageIndex,
      rect: { x: 0, y: 0, width: 0, height: 0 }, // Just jump to the page
    }, data.sourceName, 'pdf');
  };

  useEffect(() => {
    setCaptionText(data.caption || '');
  }, [data.caption]);

  return (
    <>
      {/* Connection handles */}
      <Handle
        type="source"
        position={Position.Top}
        id="top"
        isConnectableStart={true}
        isConnectableEnd={true}
        className="!w-3 !h-3 !bg-blue-900 !border-2 !border-white !rounded-none snippet-handle"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="bottom"
        isConnectableStart={true}
        isConnectableEnd={true}
        className="!w-3 !h-3 !bg-blue-900 !border-2 !border-white !rounded-none snippet-handle"
      />
      <Handle
        type="source"
        position={Position.Left}
        id="left"
        isConnectableStart={true}
        isConnectableEnd={true}
        className="!w-3 !h-3 !bg-blue-900 !border-2 !border-white !rounded-none snippet-handle"
      />
      <Handle
        type="source"
        position={Position.Right}
        id="right"
        isConnectableStart={true}
        isConnectableEnd={true}
        className="!w-3 !h-3 !bg-blue-900 !border-2 !border-white !rounded-none snippet-handle"
      />

      {/* Image Card - Swiss Structure with teal spine */}
      <div
        className={`
          bg-white shadow-sm rounded-none border-l-4 transition-all
          ${selected ? 'border-l-teal-600 shadow-lg ring-2 ring-teal-600' : 'border-l-teal-600'}
          ${isAiHighlighted ? 'node-ai-glow ring-2 ring-yellow-400' : ''}
          ${isCollapsed ? 'min-w-[180px] max-w-[300px]' : 'min-w-[220px] max-w-[400px]'}
        `}
      >
        {/* Header with source info */}
        <div className={`flex items-center gap-2 p-3 ${!isCollapsed ? 'pb-2 border-b border-neutral-200' : ''}`}>
          {/* Collapse toggle */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              toggleNodeCollapsed(id);
            }}
            className="p-0.5 hover:bg-neutral-100 rounded-none transition-colors"
            title={isCollapsed ? 'Expand' : 'Collapse'}
          >
            {isCollapsed ? (
              <ChevronRight className="w-4 h-4 text-neutral-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-neutral-400" />
            )}
          </button>

          <Image className="w-4 h-4 flex-shrink-0 text-teal-600" />
          <div className="flex-1 min-w-0">
            <div className="text-xs font-bold text-neutral-800 truncate" title={displayName}>
              {displayName}
            </div>
            {!isCollapsed && (
              <div className="text-xs text-neutral-500">
                Page {data.pageIndex + 1} • Region Capture
              </div>
            )}
          </div>

          {/* Delete button */}
          {!isCollapsed && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                removeNode(id);
              }}
              className="p-1 hover:bg-red-50 rounded-none transition-colors"
              title="Delete"
            >
              <Trash2 className="w-4 h-4 text-neutral-400 hover:text-red-600" />
            </button>
          )}

          {/* Comment indicator */}
          {hasComments && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowCommentPopover(!showCommentPopover);
              }}
              className="relative p-1 hover:bg-blue-50 rounded-none transition-colors"
              title={`${comments.length} comment${comments.length !== 1 ? 's' : ''}`}
            >
              <MessageSquare className="w-4 h-4 text-teal-600" />
              <span className="absolute -top-1 -right-1 bg-teal-600 text-white text-[10px] font-bold rounded-none w-4 h-4 flex items-center justify-center">
                {comments.length}
              </span>
            </button>
          )}
        </div>

        {/* Content - only show when expanded */}
        {!isCollapsed && (
          <div className="px-3 pb-3">
            {/* Captured image */}
            <div className="mb-2 bg-neutral-100 border border-neutral-200 overflow-hidden">
              <img
                src={data.imageData}
                alt="Captured region"
                className="w-full h-auto max-h-[300px] object-contain"
                draggable={false}
              />
            </div>

            {/* Caption */}
            {isEditingCaption ? (
              <div className="mb-2">
                <input
                  type="text"
                  value={captionText}
                  onChange={(e) => setCaptionText(e.target.value)}
                  placeholder="Add a caption..."
                  className="w-full px-2 py-1 text-xs border border-neutral-300 rounded-none focus:outline-none focus:ring-1 focus:ring-teal-600"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveCaption();
                    if (e.key === 'Escape') handleCancelCaption();
                  }}
                />
                <div className="flex gap-1 mt-1 justify-end">
                  <button
                    onClick={handleCancelCaption}
                    className="p-1 hover:bg-neutral-200 rounded-none"
                    title="Cancel"
                  >
                    <X className="w-3 h-3 text-neutral-600" />
                  </button>
                  <button
                    onClick={handleSaveCaption}
                    className="p-1 bg-teal-600 hover:bg-teal-700 rounded-none"
                    title="Save"
                  >
                    <Check className="w-3 h-3 text-white" />
                  </button>
                </div>
              </div>
            ) : data.caption ? (
              <div
                className="text-xs text-neutral-700 italic mb-2 cursor-pointer hover:bg-neutral-50 p-1 -ml-1"
                onClick={() => setIsEditingCaption(true)}
                title="Click to edit caption"
              >
                "{data.caption}"
              </div>
            ) : null}

            {/* Footer with actions */}
            <div className="flex gap-3 pt-2 border-t border-neutral-100">
              <button
                onClick={handleJumpToSource}
                className="text-xs font-bold text-teal-600 hover:underline transition-colors uppercase tracking-wide"
              >
                Jump to source
              </button>
              {!data.caption && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsEditingCaption(true);
                  }}
                  className="text-xs text-neutral-500 hover:text-neutral-700 transition-colors flex items-center gap-1"
                >
                  <Edit2 className="w-3 h-3" />
                  Add caption
                </button>
              )}
              {!hasComments && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowCommentPopover(true);
                  }}
                  className="text-xs text-neutral-500 hover:text-neutral-700 transition-colors"
                >
                  Add comment
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Comment Popover */}
      {showCommentPopover && (
        <CommentPopover
          nodeId={id}
          comments={comments}
          onClose={() => setShowCommentPopover(false)}
        />
      )}
    </>
  );
}
