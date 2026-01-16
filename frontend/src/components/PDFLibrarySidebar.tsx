import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, Globe, Save, FilePlus, RefreshCw, Plus, Settings } from 'lucide-react';
import { fetchFiles, syncLibrary } from '../api';
import type { FileEntry } from '../api';
import { useAppStore } from '../store/useAppStore';
import { QuickAddModal } from './QuickAddModal';
import { SettingsModal } from './SettingsModal';

export function PDFLibrarySidebar() {
  const [files, setFiles] = useState<FileEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const navigate = useNavigate();

  const selectedPdf = useAppStore((state) => state.selectedPdf);
  const setSelectedPdf = useAppStore((state) => state.setSelectedPdf);
  const saveProject = useAppStore((state) => state.saveProject);
  const isDirty = useAppStore((state) => state.isDirty);
  const projectName = useAppStore((state) => state.projectMetadata.name);
  const selectedItemKeys = useAppStore((state) => state.selectedItemKeys);
  const newProject = useAppStore((state) => state.newProject);

  // Filter files by selected items (show all if none selected for backward compat)
  const filteredFiles = useMemo(() => {
    if (selectedItemKeys.length === 0) {
      return files;
    }
    return files.filter((f) => selectedItemKeys.includes(f.key));
  }, [files, selectedItemKeys]);

  useEffect(() => {
    loadFiles();
  }, []);

  const loadFiles = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchFiles();
      setFiles(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load files');
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async () => {
    try {
      setSyncing(true);
      setError(null);
      await syncLibrary();
      await loadFiles();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sync failed');
    } finally {
      setSyncing(false);
    }
  };

  const handleSelectPdf = (file: FileEntry) => {
    setSelectedPdf(file);
  };

  const handleSaveProject = async () => {
    try {
      await saveProject();
    } catch (error) {
      console.error('Save failed:', error);
      alert('Failed to save project');
    }
  };

  const handleNewProject = () => {
    if (isDirty) {
      const confirmed = confirm(
        'You have unsaved changes. Start a new project anyway?'
      );
      if (!confirmed) return;
    }
    newProject();
    navigate('/');
  };

  return (
    <aside className="h-full bg-white border-r border-neutral-300 flex flex-col overflow-hidden">
      {/* Header - Swiss Style */}
      <div className="p-4 border-b-4 border-blue-900 bg-white">
        <h2 className="text-sm font-extrabold text-blue-900 uppercase tracking-wide mb-1">
          Project
        </h2>
        <p className="text-sm font-medium text-neutral-800 truncate" title={projectName}>
          {projectName}
        </p>
      </div>

      {/* Project Actions */}
      <div className="p-3 border-b border-neutral-300 flex gap-2">
        <button
          onClick={handleNewProject}
          className="flex-1 flex items-center justify-center gap-1 px-2 py-2 text-xs font-medium bg-white border border-neutral-300 text-neutral-700 hover:bg-neutral-100 rounded-none transition-colors"
          title="New Project"
        >
          <FilePlus className="w-4 h-4" />
          New
        </button>
        <button
          onClick={handleSaveProject}
          className={`flex-1 flex items-center justify-center gap-1 px-2 py-2 text-xs font-medium rounded-none transition-colors ${
            isDirty
              ? 'bg-blue-900 text-white hover:bg-blue-800'
              : 'bg-neutral-100 text-neutral-500 border border-neutral-300'
          }`}
          title="Save Project"
        >
          <Save className="w-4 h-4" />
          Save
        </button>
      </div>

      {/* File Library */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-3">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-bold text-neutral-800 uppercase tracking-wide">
              Documents
            </h3>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setShowAddModal(true)}
                className="flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-none transition-colors bg-blue-100 hover:bg-blue-200 text-blue-900"
                title="Add Items to Project"
              >
                <Plus className="w-3 h-3" />
                Add
              </button>
              <button
                onClick={handleSync}
                disabled={syncing}
                className={`flex items-center gap-1 px-2 py-1 text-xs rounded-none transition-colors ${
                  syncing
                    ? 'bg-blue-100 text-blue-900 cursor-wait'
                    : 'bg-neutral-100 hover:bg-neutral-200 text-neutral-600'
                }`}
                title="Sync from Zotero"
              >
                <RefreshCw className={`w-3 h-3 ${syncing ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {loading && (
            <div className="text-sm text-neutral-500 py-4 text-center">
              Loading files...
            </div>
          )}

          {error && (
            <div className="text-sm py-4 px-2 bg-red-50 border-l-4 border-red-500">
              <p className="text-red-700 mb-2">Error: {error}</p>
              <button
                onClick={loadFiles}
                className="text-xs text-blue-900 font-bold hover:underline"
              >
                Retry
              </button>
            </div>
          )}

          {!loading && !error && filteredFiles.length === 0 && (
            <div className="text-sm text-neutral-500 py-4 text-center border border-neutral-300 bg-neutral-50">
              <p className="mb-2">No files in project</p>
              <button
                onClick={() => setShowAddModal(true)}
                className="text-xs text-blue-900 font-bold hover:underline"
              >
                Add documents
              </button>
            </div>
          )}

          {!loading && !error && filteredFiles.length > 0 && (
            <div className="space-y-1">
              {filteredFiles.map((file) => {
                const isSelected = selectedPdf?.path === file.path;
                const isHtml = file.type === 'html';
                const Icon = isHtml ? Globe : FileText;

                return (
                  <button
                    key={file.path}
                    onClick={() => handleSelectPdf(file)}
                    className={`w-full text-left px-3 py-2 rounded-none transition-all flex items-start gap-2 ${
                      isSelected
                        ? 'bg-blue-900 text-white'
                        : 'hover:bg-neutral-100 border-l-2 border-transparent hover:border-blue-900'
                    }`}
                  >
                    <Icon
                      className={`w-4 h-4 mt-0.5 flex-shrink-0 ${
                        isSelected ? 'text-white' : isHtml ? 'text-green-600' : 'text-blue-900'
                      }`}
                    />
                    <div className="flex-1 min-w-0">
                      <div
                        className={`text-sm truncate ${
                          isSelected ? 'font-medium' : 'text-neutral-800'
                        }`}
                        title={file.name}
                      >
                        {file.name}
                      </div>
                      <div className={`text-xs ${isSelected ? 'text-blue-200' : 'text-neutral-500'}`}>
                        <span className="badge text-[10px] px-1 py-0">
                          {isHtml ? 'HTML' : 'PDF'}
                        </span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-neutral-300 text-xs text-neutral-600 bg-neutral-50 flex items-center justify-between">
        <span className="font-medium">
          {(() => {
            const pdfCount = filteredFiles.filter(f => f.type === 'pdf').length;
            const htmlCount = filteredFiles.filter(f => f.type === 'html').length;
            const totalText = selectedItemKeys.length > 0
              ? `${filteredFiles.length} of ${files.length}`
              : `${files.length}`;
            return (
              <>
                {totalText} docs <span className="text-neutral-400">({pdfCount} PDF, {htmlCount} HTML)</span>
              </>
            );
          })()}
        </span>
        <button
          onClick={() => setShowSettingsModal(true)}
          className="p-1.5 hover:bg-neutral-200 rounded-none transition-colors"
          title="AI Brain Settings"
        >
          <Settings className="w-4 h-4 text-neutral-600" />
        </button>
      </div>

      {/* Quick Add Modal */}
      <QuickAddModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
      />

      {/* Settings Modal */}
      <SettingsModal
        isOpen={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
      />
    </aside>
  );
}
