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

  return (
    <PageLayout title="Select Items">
      <div className="h-full flex flex-col bg-neutral-200">
        {/* Header */}
        <div className="bg-white border-b-4 border-blue-900 px-6 py-4">
          <div className="max-w-5xl mx-auto flex items-center justify-between">
            <div>
              <h1 className="text-xl font-extrabold text-neutral-800 uppercase tracking-wide">
                Select Items
              </h1>
              <p className="text-sm text-neutral-600 mt-1">
                Choose which Zotero items to include in this project
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-neutral-600">
                {selectedItemKeys.length} selected
              </span>
              <button
                onClick={handleSkip}
                className="btn-secondary px-4 py-2 text-sm"
              >
                Skip
              </button>
              <button
                onClick={handleContinue}
                className="btn-primary flex items-center gap-2 px-4 py-2 text-sm"
              >
                Continue
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="bg-white border-b border-neutral-300 px-6 py-3">
          <div className="max-w-5xl mx-auto">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
              <input
                type="text"
                placeholder="Search items..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input-field w-full pl-10 pr-4 py-2"
              />
            </div>
          </div>
        </div>

        {/* Items Grid */}
        <div className="flex-1 overflow-auto px-6 py-6">
          <div className="max-w-5xl mx-auto">
            {loading && (
              <div className="text-center py-12 text-neutral-500">
                Loading items...
              </div>
            )}

            {error && (
              <div className="alert-box text-center py-8">
                <p className="text-blue-900 mb-4">{error}</p>
                <button
                  onClick={loadItems}
                  className="text-blue-900 font-bold hover:underline"
                >
                  Try again
                </button>
              </div>
            )}

            {!loading && !error && filteredItems.length === 0 && (
              <div className="card text-center py-12 text-neutral-500 border-l-4 border-blue-900">
                {searchQuery ? 'No items match your search' : 'No items found. Sync your Zotero library first.'}
              </div>
            )}

            {!loading && !error && filteredItems.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {filteredItems.map((item) => {
                  const isSelected = selectedItemKeys.includes(item.key);
                  const Icon = item.type === 'html' ? Globe : FileText;
                  const iconColor = item.type === 'html' ? 'text-green-600' : 'text-blue-900';

                  return (
                    <div
                      key={item.key}
                      onClick={() => toggleItem(item.key)}
                      className={`relative p-4 rounded-none cursor-pointer transition-all border-l-4 ${
                        isSelected
                          ? 'border-l-blue-900 bg-blue-50 ring-2 ring-blue-900'
                          : 'border-l-neutral-300 bg-white hover:border-l-blue-900 hover:translate-x-1'
                      }`}
                    >
                      {/* Selection Indicator */}
                      <div
                        className={`absolute top-3 right-3 w-5 h-5 rounded-none border-2 flex items-center justify-center transition-colors ${
                          isSelected
                            ? 'border-blue-900 bg-blue-900'
                            : 'border-neutral-300'
                        }`}
                      >
                        {isSelected && <Check className="w-3 h-3 text-white" />}
                      </div>

                      {/* Content */}
                      <div className="flex items-start gap-3 pr-6">
                        <Icon className={`w-5 h-5 mt-0.5 flex-shrink-0 ${iconColor}`} />
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium text-neutral-800 text-sm line-clamp-2">
                            {item.name}
                          </h3>
                          <p className="text-xs text-neutral-500 mt-1 truncate">
                            {item.filename}
                          </p>
                          <span className="badge mt-2 inline-block">
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
