import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Trash2, Clock, FileText, Layers, Download } from 'lucide-react';
import { PageLayout } from '../components/PageLayout';
import { fetchProjects, deleteProject, exportProject } from '../api';
import { useAppStore } from '../store/useAppStore';
import type { ProjectSummary } from '../types';

export function HomePage() {
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const newProject = useAppStore((state) => state.newProject);

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchProjects();
      setProjects(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load projects');
    } finally {
      setLoading(false);
    }
  };

  const handleNewProject = () => {
    newProject();
    const projectId = `new-${Date.now()}`;
    navigate(`/project/${projectId}/items`);
  };

  const handleOpenProject = (project: ProjectSummary) => {
    const projectId = project.filename.replace('.json', '');
    navigate(`/project/${encodeURIComponent(projectId)}/workspace`);
  };

  const handleDeleteProject = async (project: ProjectSummary, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(`Delete "${project.name}"? This cannot be undone.`)) return;

    try {
      await deleteProject(project.filename);
      await loadProjects();
    } catch (err) {
      alert('Failed to delete project');
    }
  };

  const handleExportProject = async (project: ProjectSummary, format: 'json' | 'markdown', e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await exportProject(project.filename, format);
    } catch (err) {
      alert(`Failed to export project: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <PageLayout>
      <div className="h-full overflow-auto p-8">
        <div className="max-w-5xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-2xl font-extrabold text-neutral-800">Projects</h1>
              <p className="text-neutral-600 mt-1">
                Create and manage your research annotation projects
              </p>
            </div>
            <button
              onClick={handleNewProject}
              className="btn-primary flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              New Project
            </button>
          </div>

          {/* Loading State */}
          {loading && (
            <div className="text-center py-12 text-neutral-500">
              Loading projects...
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="alert-box text-center py-8">
              <p className="text-blue-900 mb-4">{error}</p>
              <button
                onClick={loadProjects}
                className="text-blue-900 font-bold hover:underline"
              >
                Try again
              </button>
            </div>
          )}

          {/* Empty State */}
          {!loading && !error && projects.length === 0 && (
            <div className="card text-center py-16 border-l-4 border-blue-900">
              <FileText className="w-12 h-12 text-neutral-300 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-neutral-800 mb-2">
                No projects yet
              </h3>
              <p className="text-neutral-600 mb-6">
                Create your first project to start annotating documents
              </p>
              <button
                onClick={handleNewProject}
                className="btn-primary inline-flex items-center gap-2"
              >
                <Plus className="w-5 h-5" />
                Create Project
              </button>
            </div>
          )}

          {/* Projects Grid */}
          {!loading && !error && projects.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {projects.map((project) => (
                <div
                  key={project.filename}
                  onClick={() => handleOpenProject(project)}
                  className="card-spine cursor-pointer group"
                >
                  <div className="flex items-start justify-between mb-4">
                    <h3 className="font-bold text-neutral-800 truncate flex-1 text-lg">
                      {project.name}
                    </h3>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {/* Export dropdown */}
                      <div className="relative group/export">
                        <button
                          onClick={(e) => e.stopPropagation()}
                          className="p-1.5 text-neutral-400 hover:text-blue-900 hover:bg-blue-50 rounded-none"
                          title="Export project"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                        <div className="absolute right-0 top-full mt-1 bg-white border border-neutral-200 shadow-lg rounded-none hidden group-hover/export:block z-10 min-w-[140px]">
                          <button
                            onClick={(e) => handleExportProject(project, 'markdown', e)}
                            className="w-full px-3 py-2 text-left text-sm text-neutral-700 hover:bg-blue-50 flex items-center gap-2"
                          >
                            <FileText className="w-4 h-4" />
                            Markdown
                          </button>
                          <button
                            onClick={(e) => handleExportProject(project, 'json', e)}
                            className="w-full px-3 py-2 text-left text-sm text-neutral-700 hover:bg-blue-50 flex items-center gap-2"
                          >
                            <Layers className="w-4 h-4" />
                            JSON (full)
                          </button>
                        </div>
                      </div>
                      <button
                        onClick={(e) => handleDeleteProject(project, e)}
                        className="p-1.5 text-neutral-400 hover:text-red-600 hover:bg-red-50 rounded-none"
                        title="Delete project"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2 text-sm text-neutral-600 mb-4">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-neutral-400" />
                      <span>{formatDate(project.modified)}</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="flex items-center gap-1">
                        <Layers className="w-4 h-4 text-neutral-400" />
                        {project.nodeCount} snippets
                      </span>
                      <span>{project.itemCount} items</span>
                    </div>
                  </div>

                  {/* Progress indicator */}
                  <div className="w-full bg-neutral-200 h-1 rounded-none">
                    <div
                      className="bg-blue-900 h-1 rounded-none transition-all"
                      style={{ width: `${Math.min(project.nodeCount * 10, 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </PageLayout>
  );
}
