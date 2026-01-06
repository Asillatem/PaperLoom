import { useEffect, useState } from 'react';
import { FileText, Save, FolderOpen, FilePlus } from 'lucide-react';
import { fetchFiles } from '../api';
import type { FileEntry } from '../api';
import { useAppStore } from '../store/useAppStore';

export function PDFLibrarySidebar() {
  const [files, setFiles] = useState<FileEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const selectedPdf = useAppStore((state) => state.selectedPdf);
  const setSelectedPdf = useAppStore((state) => state.setSelectedPdf);
  const saveProject = useAppStore((state) => state.saveProject);
  const newProject = useAppStore((state) => state.newProject);
  const isDirty = useAppStore((state) => state.isDirty);
  const projectName = useAppStore((state) => state.projectMetadata.name);

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
  };

  return (
    <aside className="w-64 h-full bg-white border-r border-gray-200 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-800 mb-1">
          Liquid Science
        </h2>
        <p className="text-xs text-gray-500">{projectName}</p>
      </div>

      {/* Project Actions */}
      <div className="p-3 border-b border-gray-200 flex gap-2">
        <button
          onClick={handleNewProject}
          className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 text-xs bg-gray-100 hover:bg-gray-200 rounded transition-colors"
          title="New Project"
        >
          <FilePlus className="w-4 h-4" />
          New
        </button>
        <button
          onClick={handleSaveProject}
          className={`flex-1 flex items-center justify-center gap-1 px-2 py-1.5 text-xs rounded transition-colors ${
            isDirty
              ? 'bg-blue-500 text-white hover:bg-blue-600'
              : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
          }`}
          title="Save Project"
        >
          <Save className="w-4 h-4" />
          Save
        </button>
      </div>

      {/* PDF Library */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-3">
          <h3 className="text-sm font-medium text-gray-700 mb-2">
            PDF Library
          </h3>

          {loading && (
            <div className="text-sm text-gray-500 py-4 text-center">
              Loading PDFs...
            </div>
          )}

          {error && (
            <div className="text-sm text-red-500 py-4 px-2">
              <p className="mb-2">Error: {error}</p>
              <button
                onClick={loadFiles}
                className="text-xs text-blue-600 hover:underline"
              >
                Retry
              </button>
            </div>
          )}

          {!loading && !error && files.length === 0 && (
            <div className="text-sm text-gray-500 py-4 text-center">
              No PDFs found
            </div>
          )}

          {!loading && !error && files.length > 0 && (
            <div className="space-y-1">
              {files.map((file) => {
                const isSelected = selectedPdf?.path === file.path;
                return (
                  <button
                    key={file.path}
                    onClick={() => handleSelectPdf(file)}
                    className={`w-full text-left px-3 py-2 rounded transition-colors flex items-start gap-2 ${
                      isSelected
                        ? 'bg-blue-50 border border-blue-200'
                        : 'hover:bg-gray-50 border border-transparent'
                    }`}
                  >
                    <FileText
                      className={`w-4 h-4 mt-0.5 flex-shrink-0 ${
                        isSelected ? 'text-blue-600' : 'text-gray-400'
                      }`}
                    />
                    <div className="flex-1 min-w-0">
                      <div
                        className={`text-sm truncate ${
                          isSelected
                            ? 'text-blue-900 font-medium'
                            : 'text-gray-700'
                        }`}
                        title={file.name}
                      >
                        {file.name}
                      </div>
                      {file.size && (
                        <div className="text-xs text-gray-400">
                          {formatFileSize(file.size)}
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-gray-200 text-xs text-gray-500">
        {files.length} PDF{files.length !== 1 ? 's' : ''} available
      </div>
    </aside>
  );
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
