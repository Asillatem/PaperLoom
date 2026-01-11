import { MessageSquare, Trash2 } from 'lucide-react';

interface ContextMenuProps {
  x: number;
  y: number;
  onClose: () => void;
  onAddComment: () => void;
  onDelete: () => void;
}

export function ContextMenu({ x, y, onAddComment, onDelete }: ContextMenuProps) {
  return (
    <div
      className="fixed bg-white rounded-none shadow-xl border-l-4 border-blue-900 py-1 z-50 min-w-[160px] context-menu-enter"
      style={{ left: x, top: y }}
      onClick={(e) => e.stopPropagation()}
    >
      <button
        onClick={onAddComment}
        className="w-full px-4 py-2 text-left text-sm text-neutral-700 hover:bg-blue-50 hover:text-blue-900 flex items-center gap-2 transition-colors"
      >
        <MessageSquare className="w-4 h-4" />
        Add Comment
      </button>
      <div className="border-t border-neutral-200 my-1" />
      <button
        onClick={onDelete}
        className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 transition-colors"
      >
        <Trash2 className="w-4 h-4" />
        Delete
      </button>
    </div>
  );
}
