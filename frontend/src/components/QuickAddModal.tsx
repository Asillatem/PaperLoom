import { useEffect, useState, useMemo } from 'react';
import { X, FileText, Globe, Search, Check } from 'lucide-react';
import { fetchFiles } from '../api';
import type { FileEntry } from '../api';
import { useAppStore } from '../store/useAppStore';

interface QuickAddModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function QuickAddModal({ isOpen, onClose }: QuickAddModalProps) {
  const [files, setFiles] = useState<FileEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [pendingKeys, setPendingKeys] = useState<Set<string>>(new Set());

  const selectedItemKeys = useAppStore((state) => state.selectedItemKeys);
  const addSelectedItemKey = useAppStore((state) => state.addSelectedItemKey);

  useEffect(() => {
    if (isOpen) {
      loadFiles();
      setPendingKeys(new Set());
      setSearchQuery('');
    }
  }, [isOpen]);

  const loadFiles = async () => {
    try {
      setLoading(true);
      const data = await fetchFiles();
      setFiles(data);
    } catch (err) {
      console.error('Failed to load files:', err);
    } finally {
      setLoading(false);
    }
  };

  // Filter to show only items NOT already in the project
  const availableFiles = useMemo(() => {
    return files.filter((f) => !selectedItemKeys.includes(f.key));
  }, [files, selectedItemKeys]);

  // Apply search filter
  const filteredFiles = useMemo(() => {
    if (!searchQuery.trim()) return availableFiles;
    const query = searchQuery.toLowerCase();
    return availableFiles.filter(
      (f) =>
        f.name.toLowerCase().includes(query) ||
        f.filename?.toLowerCase().includes(query)
    );
  }, [availableFiles, searchQuery]);

  const togglePending = (key: string) => {
    setPendingKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const handleAddSelected = () => {
    pendingKeys.forEach((key) => {
      addSelectedItemKey(key);
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold text-gray-900">
            Add Items to Project
          </h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Search */}
        <div className="p-4 border-b">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search items..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Items List */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="text-center text-gray-500 py-8">Loading items...</div>
          ) : filteredFiles.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              {availableFiles.length === 0
                ? 'All items are already in this project'
                : 'No items match your search'}
            </div>
          ) : (
            <div className="space-y-2">
              {filteredFiles.map((file) => {
                const isSelected = pendingKeys.has(file.key);
                const isHtml = file.type === 'html';
                const Icon = isHtml ? Globe : FileText;

                return (
                  <button
                    key={file.key}
                    onClick={() => togglePending(file.key)}
                    className={`w-full text-left p-3 rounded-lg border transition-colors flex items-start gap-3 ${
                      isSelected
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <div
                      className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 mt-0.5 ${
                        isSelected
                          ? 'border-blue-500 bg-blue-500'
                          : 'border-gray-300'
                      }`}
                    >
                      {isSelected && <Check className="w-3 h-3 text-white" />}
                    </div>
                    <Icon
                      className={`w-4 h-4 mt-0.5 flex-shrink-0 ${
                        isHtml ? 'text-green-500' : 'text-blue-500'
                      }`}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-900 truncate">
                        {file.name}
                      </div>
                      <div className="text-xs text-gray-500">
                        {isHtml ? 'HTML Snapshot' : 'PDF'}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t bg-gray-50">
          <div className="text-sm text-gray-600">
            {pendingKeys.size > 0
              ? `${pendingKeys.size} item${pendingKeys.size > 1 ? 's' : ''} selected`
              : 'Select items to add'}
          </div>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleAddSelected}
              disabled={pendingKeys.size === 0}
              className={`px-4 py-2 text-sm rounded-lg transition-colors ${
                pendingKeys.size > 0
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              Add to Project
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
