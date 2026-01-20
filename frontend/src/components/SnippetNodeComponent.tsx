import { useState, useEffect } from 'react';
import { Handle, Position } from 'reactflow';
import type { NodeProps } from 'reactflow';
import { FileText, Globe, MessageSquare, Info, ChevronDown, ChevronRight } from 'lucide-react';
import type { SnippetNodeData } from '../types';
import { useAppStore } from '../store/useAppStore';
import { ContextMenu } from './ContextMenu';
import { CommentPopover } from './CommentPopover';

export function SnippetNodeComponent({ data, selected, id }: NodeProps<SnippetNodeData>) {
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [contextMenuPos, setContextMenuPos] = useState({ x: 0, y: 0 });
  const [showCommentPopover, setShowCommentPopover] = useState(false);

  const jumpToSource = useAppStore((state) => state.jumpToSource);
  const removeNode = useAppStore((state) => state.removeNode);
  const highlightedAiNodes = useAppStore((state) => state.highlightedAiNodes);
  const openMetadataPanel = useAppStore((state) => state.openMetadataPanel);
  const collapsedNodeIds = useAppStore((state) => state.collapsedNodeIds);
  const toggleNodeCollapsed = useAppStore((state) => state.toggleNodeCollapsed);

  const isAiHighlighted = highlightedAiNodes.includes(id);
  const isCollapsed = collapsedNodeIds.includes(id);

  const comments = data.comments || [];
  const hasComments = comments.length > 0;

  const handleJumpToSource = (e: React.MouseEvent) => {
    e.stopPropagation();
    jumpToSource(data.sourcePdf, data.location, data.sourceName, data.sourceType);
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenuPos({ x: e.clientX, y: e.clientY });
    setShowContextMenu(true);
  };

  const handleDelete = () => {
    setShowContextMenu(false);
    removeNode(id);
  };

  useEffect(() => {
    const handleClickOutside = () => setShowContextMenu(false);
    if (showContextMenu) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [showContextMenu]);

  const displayName = data.sourceName || data.sourcePdf.split(/[/\\]/).pop() || data.sourcePdf;
  const isHtml = data.sourceType === 'html';
  const SourceIcon = isHtml ? Globe : FileText;

  // Show full text (no truncation) since we have scroll now
  const displayText = data.label;
  const isLongContent = data.label.length > 200;

  return (
    <>
      {/* Connection handles - all handles can be both source and target */}
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

      {/* Card - Swiss Structure with spine */}
      <div
        onContextMenu={handleContextMenu}
        className={`
          bg-white shadow-sm rounded-none border-l-4 transition-all
          ${selected ? 'border-l-blue-900 shadow-lg ring-2 ring-blue-900' : 'border-l-blue-900'}
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

          <SourceIcon className={`w-4 h-4 flex-shrink-0 ${isHtml ? 'text-green-600' : 'text-blue-900'}`} />
          <div className="flex-1 min-w-0">
            <div className="text-xs font-bold text-neutral-800 truncate" title={displayName}>
              {displayName}
            </div>
            {!isCollapsed && (
              <div className="text-xs text-neutral-500">
                {isHtml ? 'HTML Snapshot' : `Page ${data.location.pageIndex + 1}`}
              </div>
            )}
          </div>

          {/* Info button - only show when expanded */}
          {!isCollapsed && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                openMetadataPanel(data.sourcePdf);
              }}
              className="p-1 hover:bg-blue-50 rounded-none transition-colors"
              title="View source details"
            >
              <Info className="w-4 h-4 text-neutral-400 hover:text-blue-900" />
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
              <MessageSquare className="w-4 h-4 text-blue-900" />
              <span className="absolute -top-1 -right-1 bg-blue-900 text-white text-[10px] font-bold rounded-none w-4 h-4 flex items-center justify-center">
                {comments.length}
              </span>
            </button>
          )}
        </div>

        {/* Content and footer - only show when expanded */}
        {!isCollapsed && (
          <div className="px-3 pb-3">
            {/* Extracted text content with scroll for long content */}
            <div
              className={`text-sm text-neutral-800 whitespace-pre-wrap mb-3 leading-relaxed ${
                isLongContent ? 'max-h-[200px] overflow-y-auto pr-2' : ''
              }`}
            >
              {displayText}
            </div>

            {/* Footer with actions */}
            <div className="flex gap-3 pt-2 border-t border-neutral-100">
              <button
                onClick={handleJumpToSource}
                className="text-xs font-bold text-blue-900 hover:underline transition-colors uppercase tracking-wide"
              >
                Jump to source
              </button>
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

      {/* Context Menu */}
      {showContextMenu && (
        <ContextMenu
          x={contextMenuPos.x}
          y={contextMenuPos.y}
          onClose={() => setShowContextMenu(false)}
          onAddComment={() => {
            setShowContextMenu(false);
            setShowCommentPopover(true);
          }}
          onDelete={handleDelete}
        />
      )}

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
