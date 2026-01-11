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
      <div className="h-full flex flex-col bg-neutral-200">
        {/* Header */}
        <div className="bg-white border-b-4 border-blue-900 px-6 py-4">
          <div className="max-w-6xl mx-auto flex items-center justify-between">
            <div>
              <h1 className="text-xl font-extrabold text-neutral-800 uppercase tracking-wide">
                Zotero Library
              </h1>
              <p className="text-sm text-neutral-600 mt-1">
                {items.length} items <span className="text-neutral-400">({pdfCount} PDFs, {htmlCount} HTML snapshots)</span>
              </p>
            </div>
            <button
              onClick={handleSync}
              disabled={syncing}
              className={`flex items-center gap-2 px-4 py-2 rounded-none transition-colors ${
                syncing
                  ? 'bg-blue-100 text-blue-900 cursor-wait'
                  : 'bg-blue-900 text-white hover:bg-blue-800'
              }`}
            >
              <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
              {syncing ? 'Syncing...' : 'Sync from Zotero'}
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="bg-white border-b border-neutral-300 px-6 py-3">
          <div className="max-w-6xl mx-auto">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
              <input
                type="text"
                placeholder="Search library..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input-field w-full pl-10 pr-4 py-2"
              />
            </div>
          </div>
        </div>

        {/* Items Grid */}
        <div className="flex-1 overflow-auto px-6 py-6">
          <div className="max-w-6xl mx-auto">
            {loading && (
              <div className="text-center py-12 text-neutral-500">
                Loading library...
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

            {!loading && !error && items.length === 0 && (
              <div className="card text-center py-16 border-l-4 border-blue-900">
                <FileText className="w-12 h-12 text-neutral-300 mx-auto mb-4" />
                <h3 className="text-lg font-bold text-neutral-800 mb-2">
                  Library is empty
                </h3>
                <p className="text-neutral-600 mb-6">
                  Click "Sync from Zotero" to load your library
                </p>
                <button
                  onClick={handleSync}
                  disabled={syncing}
                  className="btn-primary inline-flex items-center gap-2"
                >
                  <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
                  Sync from Zotero
                </button>
              </div>
            )}

            {!loading && !error && filteredItems.length === 0 && items.length > 0 && (
              <div className="card text-center py-12 text-neutral-500 border-l-4 border-blue-900">
                No items match your search
              </div>
            )}

            {!loading && !error && filteredItems.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                {filteredItems.map((item) => {
                  const Icon = item.type === 'html' ? Globe : FileText;
                  const iconColor = item.type === 'html' ? 'text-green-600' : 'text-blue-900';

                  return (
                    <div
                      key={item.key}
                      className="card-spine p-4"
                    >
                      <div className="flex items-start gap-3">
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
