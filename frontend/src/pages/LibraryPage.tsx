import { useEffect, useState } from 'react';
import { Search, RefreshCw, FileText, Globe } from 'lucide-react';
import { PageLayout } from '../components/PageLayout';
import { fetchFiles, syncLibrary } from '../api';
import type { FileEntry } from '../types';

export function LibraryPage() {
  const [items, setItems] = useState<FileEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadItems();
  }, []);

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

  const handleSync = async () => {
    try {
      setSyncing(true);
      setError(null);
      await syncLibrary();
      await loadItems();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sync failed');
    } finally {
      setSyncing(false);
    }
  };

  const filteredItems = items.filter((item) =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.filename.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const pdfCount = items.filter((i) => i.type === 'pdf').length;
  const htmlCount = items.filter((i) => i.type === 'html').length;

  return (
    <PageLayout>
      <div className="h-full flex flex-col">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="max-w-6xl mx-auto flex items-center justify-between">
            <div>
              <h1 className="text-xl font-semibold text-gray-900">
                Zotero Library
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                {items.length} items ({pdfCount} PDFs, {htmlCount} HTML snapshots)
              </p>
            </div>
            <button
              onClick={handleSync}
              disabled={syncing}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                syncing
                  ? 'bg-blue-100 text-blue-600 cursor-wait'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
              {syncing ? 'Syncing...' : 'Sync from Zotero'}
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="bg-white border-b border-gray-200 px-6 py-3">
          <div className="max-w-6xl mx-auto">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search library..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Items Grid */}
        <div className="flex-1 overflow-auto px-6 py-6">
          <div className="max-w-6xl mx-auto">
            {loading && (
              <div className="text-center py-12 text-gray-500">
                Loading library...
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

            {!loading && !error && items.length === 0 && (
              <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
                <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Library is empty
                </h3>
                <p className="text-gray-500 mb-6">
                  Click "Sync from Zotero" to load your library
                </p>
                <button
                  onClick={handleSync}
                  disabled={syncing}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
                  Sync from Zotero
                </button>
              </div>
            )}

            {!loading && !error && filteredItems.length === 0 && items.length > 0 && (
              <div className="text-center py-12 text-gray-500">
                No items match your search
              </div>
            )}

            {!loading && !error && filteredItems.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                {filteredItems.map((item) => {
                  const Icon = item.type === 'html' ? Globe : FileText;
                  const iconColor = item.type === 'html' ? 'text-green-500' : 'text-blue-500';

                  return (
                    <div
                      key={item.key}
                      className="p-4 rounded-lg border border-gray-200 bg-white hover:border-gray-300 transition-colors"
                    >
                      <div className="flex items-start gap-3">
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
