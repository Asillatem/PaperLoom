import { useState, useEffect, useRef } from 'react';
import { Handle, Position } from 'reactflow';
import type { NodeProps } from 'reactflow';
import { Trash2, Edit2, Check, X, ChevronDown, ChevronRight } from 'lucide-react';
import type { NoteNodeData } from '../types';
import { useAppStore } from '../store/useAppStore';

const colorClasses = {
  yellow: 'bg-yellow-100 border-yellow-300',
  blue: 'bg-blue-100 border-blue-300',
  green: 'bg-green-100 border-green-300',
  pink: 'bg-pink-100 border-pink-300',
  purple: 'bg-purple-100 border-purple-300',
};

const headerColorClasses = {
  yellow: 'bg-yellow-200',
  blue: 'bg-blue-200',
  green: 'bg-green-200',
  pink: 'bg-pink-200',
  purple: 'bg-purple-200',
};

export function NoteNodeComponent({ data, selected, id }: NodeProps<NoteNodeData>) {
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(data.label);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const removeNode = useAppStore((state) => state.removeNode);
  const updateNoteContent = useAppStore((state) => state.updateNoteContent);
  const highlightedAiNodes = useAppStore((state) => state.highlightedAiNodes);
  const collapsedNodeIds = useAppStore((state) => state.collapsedNodeIds);
  const toggleNodeCollapsed = useAppStore((state) => state.toggleNodeCollapsed);

  const isAiHighlighted = highlightedAiNodes.includes(id);
  const isCollapsed = collapsedNodeIds.includes(id);
  const isLongContent = data.label.length > 200;

  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.select();
    }
  }, [isEditing]);

  const handleSave = () => {
    if (editText.trim()) {
      updateNoteContent(id, editText.trim());
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditText(data.label);
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      handleSave();
    }
    if (e.key === 'Escape') {
      handleCancel();
    }
  };

  const handleDelete = () => {
    removeNode(id);
  };

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

      {/* Note Card */}
      <div
        className={`
          shadow-md rounded-none border-2 transition-all
          ${colorClasses[data.color]}
          ${selected ? 'ring-2 ring-blue-900 shadow-lg' : ''}
          ${isAiHighlighted ? 'node-ai-glow ring-2 ring-yellow-400' : ''}
          ${isCollapsed ? 'min-w-[140px] max-w-[200px]' : 'min-w-[180px] max-w-[280px]'}
        `}
      >
        {/* Header strip */}
        <div className={`px-2 py-1.5 ${headerColorClasses[data.color]} flex items-center justify-between gap-1`}>
          {/* Collapse toggle */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              toggleNodeCollapsed(id);
            }}
            className="p-0.5 hover:bg-black/10 rounded-none transition-colors"
            title={isCollapsed ? 'Expand' : 'Collapse'}
          >
            {isCollapsed ? (
              <ChevronRight className="w-3 h-3 text-neutral-600" />
            ) : (
              <ChevronDown className="w-3 h-3 text-neutral-600" />
            )}
          </button>

          <span className="text-xs font-bold text-neutral-700 uppercase tracking-wide flex-1">Note</span>
          <div className="flex items-center gap-1">
            {!isEditing && !isCollapsed && (
              <>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsEditing(true);
                  }}
                  className="p-1 hover:bg-black/10 rounded-none transition-colors"
                  title="Edit note"
                >
                  <Edit2 className="w-3 h-3 text-neutral-600" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete();
                  }}
                  className="p-1 hover:bg-red-200 rounded-none transition-colors"
                  title="Delete note"
                >
                  <Trash2 className="w-3 h-3 text-red-600" />
                </button>
              </>
            )}
          </div>
        </div>

        {/* Content - only show when expanded */}
        {!isCollapsed && (
          <div className="p-3">
            {isEditing ? (
              <div className="space-y-2">
                <textarea
                  ref={textareaRef}
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="w-full p-2 text-sm border border-neutral-300 rounded-none resize-none focus:outline-none focus:ring-1 focus:ring-blue-900 bg-white"
                  rows={4}
                  placeholder="Enter note text..."
                />
                <div className="flex gap-1 justify-end">
                  <button
                    onClick={handleCancel}
                    className="p-1.5 hover:bg-neutral-200 rounded-none transition-colors"
                    title="Cancel"
                  >
                    <X className="w-4 h-4 text-neutral-600" />
                  </button>
                  <button
                    onClick={handleSave}
                    className="p-1.5 bg-blue-900 hover:bg-blue-800 rounded-none transition-colors"
                    title="Save (Ctrl+Enter)"
                  >
                    <Check className="w-4 h-4 text-white" />
                  </button>
                </div>
              </div>
            ) : (
              <p
                className={`text-sm text-neutral-800 whitespace-pre-wrap cursor-pointer ${
                  isLongContent ? 'max-h-[200px] overflow-y-auto pr-2' : ''
                }`}
                onDoubleClick={() => setIsEditing(true)}
              >
                {data.label || 'Double-click to edit...'}
              </p>
            )}
          </div>
        )}
      </div>
    </>
  );
}
