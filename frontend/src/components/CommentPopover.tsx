import { useState, useRef, useEffect } from 'react';
import { X, Send, Trash2, Edit2, Check } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import type { Comment } from '../types';

interface CommentPopoverProps {
  nodeId: string;
  comments: Comment[];
  onClose: () => void;
}

export function CommentPopover({ nodeId, comments, onClose }: CommentPopoverProps) {
  const [newComment, setNewComment] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  const addComment = useAppStore((state) => state.addComment);
  const updateComment = useAppStore((state) => state.updateComment);
  const deleteComment = useAppStore((state) => state.deleteComment);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    addComment(nodeId, newComment.trim());
    setNewComment('');
  };

  const handleEdit = (comment: Comment) => {
    setEditingId(comment.id);
    setEditText(comment.text);
  };

  const handleSaveEdit = (commentId: string) => {
    if (!editText.trim()) return;

    updateComment(nodeId, commentId, editText.trim());
    setEditingId(null);
    setEditText('');
  };

  const handleDelete = (commentId: string) => {
    deleteComment(nodeId, commentId);
  };

  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div
      ref={popoverRef}
      className="absolute left-full top-0 ml-2 bg-white rounded-none shadow-xl border-l-4 border-blue-900 w-72 z-50 comment-popover-enter"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-neutral-200">
        <span className="text-sm font-bold text-neutral-800 uppercase tracking-wide">
          Comments ({comments.length})
        </span>
        <button
          onClick={onClose}
          className="p-1 hover:bg-neutral-100 rounded-none transition-colors"
        >
          <X className="w-4 h-4 text-neutral-500" />
        </button>
      </div>

      {/* Comments list */}
      <div className="max-h-64 overflow-y-auto">
        {comments.length === 0 ? (
          <div className="px-3 py-4 text-sm text-neutral-400 text-center">
            No comments yet
          </div>
        ) : (
          <div className="divide-y divide-neutral-100">
            {comments.map((comment) => (
              <div key={comment.id} className="px-3 py-2 group">
                {editingId === comment.id ? (
                  <div className="space-y-2">
                    <textarea
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      className="w-full px-2 py-1 text-sm border border-neutral-300 rounded-none resize-none focus:outline-none focus:ring-1 focus:ring-blue-900 focus:border-blue-900"
                      rows={2}
                      autoFocus
                    />
                    <div className="flex gap-1 justify-end">
                      <button
                        onClick={() => setEditingId(null)}
                        className="px-2 py-1 text-xs text-neutral-500 hover:bg-neutral-100 rounded-none"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => handleSaveEdit(comment.id)}
                        className="px-2 py-1 text-xs bg-blue-900 text-white hover:bg-blue-800 rounded-none flex items-center gap-1"
                      >
                        <Check className="w-3 h-3" />
                        Save
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <p className="text-sm text-neutral-800 whitespace-pre-wrap">
                      {comment.text}
                    </p>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-xs text-neutral-400">
                        {formatTimestamp(comment.timestamp)}
                        {comment.edited && ' (edited)'}
                      </span>
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                        <button
                          onClick={() => handleEdit(comment)}
                          className="p-1 hover:bg-neutral-100 rounded-none"
                          title="Edit"
                        >
                          <Edit2 className="w-3 h-3 text-neutral-400" />
                        </button>
                        <button
                          onClick={() => handleDelete(comment.id)}
                          className="p-1 hover:bg-red-50 rounded-none"
                          title="Delete"
                        >
                          <Trash2 className="w-3 h-3 text-red-400" />
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* New comment form */}
      <form onSubmit={handleSubmit} className="p-3 border-t border-neutral-200 bg-neutral-50">
        <div className="flex gap-2">
          <textarea
            ref={inputRef}
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Add a comment..."
            className="flex-1 px-2 py-1 text-sm border border-neutral-300 rounded-none resize-none focus:outline-none focus:ring-1 focus:ring-blue-900 focus:border-blue-900"
            rows={2}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                handleSubmit(e);
              }
            }}
          />
          <button
            type="submit"
            disabled={!newComment.trim()}
            className="self-end p-2 bg-blue-900 text-white rounded-none hover:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            title="Add comment (Ctrl+Enter)"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
        <p className="text-xs text-neutral-400 mt-1">Ctrl+Enter to submit</p>
      </form>
    </div>
  );
}
