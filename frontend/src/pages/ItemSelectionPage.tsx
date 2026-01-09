import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Search, Check, FileText, Globe, ArrowRight } from 'lucide-react';
import { PageLayout } from '../components/PageLayout';
import { fetchFiles } from '../api';
import { useAppStore } from '../store/useAppStore';
import type { FileEntry } from '../types';

export function ItemSelectionPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const [items, setItems] = useState<FileEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const selectedItemKeys = useAppStore((state) => state.selectedItemKeys);
  const setSelectedItemKeys = useAppStore((state) => state.setSelectedItemKeys);
  const addSelectedItemKey = useAppStore((state) => state.addSelectedItemKey);
  const removeSelectedItemKey = useAppStore((state) => state.removeSelectedItemKey);
  const setCurrentProjectId = useAppStore((state) => state.setCurrentProjectId);

  useEffect(() => {
    loadItems();
    // Set current project ID
    if (projectId) {
      setCurrentProjectId(projectId);
    }
  }, [projectId, setCurrentProjectId]);

  const loadItems = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchFiles();
      setItems(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load items');
    } finally {
      setLoading(false);
    }
  };

  const toggleItem = (key: string) => {
    if (selectedItemKeys.includes(key)) {
      removeSelectedItemKey(key);
    } else {
      addSelectedItemKey(key);
    }
  };

  const handleContinue = () => {
    navigate(`/project/${projectId}/workspace`);
  };

  const handleSkip = () => {
    // Clear selection and go to workspace
    setSelectedItemKeys([]);
    navigate(`/project/${projectId}/workspace`);
  };

  const filteredItems = items.filter((item) =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.filename.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Group items by parent (for better organization)
  const groupedByParent = filteredItems.reduce((acc, item) => {
    const parentKey = item.parentKey || 'other';
    if (!acc[parentKey]) {
      acc[parentKey] = [];
    }
    acc[parentKey].push(item);
    return acc;
  }, {} as Record<string, FileEntry[]>);

  return (
    <PageLayout title="Select Items">
      <div className="h-full flex flex-col">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="max-w-5xl mx-auto flex items-center justify-between">
            <div>
              <h1 className="text-xl font-semibold text-gray-900">
                Select Items for Your Project
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                Choose which Zotero items to include in this project
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-500">
                {selectedItemKeys.length} selected
              </span>
              <button
                onClick={handleSkip}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Skip
              </button>
              <button
                onClick={handleContinue}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Continue
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="bg-white border-b border-gray-200 px-6 py-3">
          <div className="max-w-5xl mx-auto">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search items..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Items Grid */}
        <div className="flex-1 overflow-auto px-6 py-6">
          <div className="max-w-5xl mx-auto">
            {loading && (
              <div className="text-center py-12 text-gray-500">
                Loading items...
              </div>
            )}

            {error && (
              <div className="text-center py-12">
                <p className="text-red-500 mb-4">{error}</p>
                <button
                  onClick={loadItems}
                  className="text-blue-600 hover:underline"
                >
                  Try again
                </button>
              </div>
            )}

            {!loading && !error && filteredItems.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                {searchQuery ? 'No items match your search' : 'No items found. Sync your Zotero library first.'}
              </div>
            )}

            {!loading && !error && filteredItems.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {filteredItems.map((item) => {
                  const isSelected = selectedItemKeys.includes(item.key);
                  const Icon = item.type === 'html' ? Globe : FileText;
                  const iconColor = item.type === 'html' ? 'text-green-500' : 'text-blue-500';

                  return (
                    <div
                      key={item.key}
                      onClick={() => toggleItem(item.key)}
                      className={`relative p-4 rounded-lg border-2 cursor-pointer transition-all ${
                        isSelected
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 bg-white hover:border-gray-300'
                      }`}
                    >
                      {/* Selection Indicator */}
                      <div
                        className={`absolute top-3 right-3 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                          isSelected
                            ? 'border-blue-500 bg-blue-500'
                            : 'border-gray-300'
                        }`}
                      >
                        {isSelected && <Check className="w-3 h-3 text-white" />}
                      </div>

                      {/* Content */}
                      <div className="flex items-start gap-3 pr-6">
                        <Icon className={`w-5 h-5 mt-0.5 flex-shrink-0 ${iconColor}`} />
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium text-gray-900 text-sm line-clamp-2">
                            {item.name}
                          </h3>
                          <p className="text-xs text-gray-500 mt-1 truncate">
                            {item.filename}
                          </p>
                          <span
                            className={`inline-block mt-2 text-xs px-2 py-0.5 rounded ${
                              item.type === 'html'
                                ? 'bg-green-100 text-green-700'
                                : 'bg-blue-100 text-blue-700'
                            }`}
                          >
                            {item.type.toUpperCase()}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </PageLayout>
  );
}
