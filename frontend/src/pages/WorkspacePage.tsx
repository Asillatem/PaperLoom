import { useEffect, useCallback } from 'react';
import { useParams, useNavigate, useBlocker } from 'react-router-dom';
import { PDFLibrarySidebar } from '../components/PDFLibrarySidebar';
import { PDFViewer } from '../components/PDFViewer';
import { HTMLViewer } from '../components/HTMLViewer';
import { PDFControls } from '../components/PDFControls';
import { Canvas } from '../components/Canvas';
import { useAppStore } from '../store/useAppStore';
import { loadProjectFromServer } from '../api';

export function WorkspacePage() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const selectedFile = useAppStore((state) => state.selectedPdf);
  const currentProjectId = useAppStore((state) => state.currentProjectId);
  const setCurrentProjectId = useAppStore((state) => state.setCurrentProjectId);
  const loadProject = useAppStore((state) => state.loadProject);
  const isDirty = useAppStore((state) => state.isDirty);

  // Block navigation when there are unsaved changes
  const blocker = useBlocker(
    useCallback(
      ({ currentLocation, nextLocation }) =>
        isDirty && currentLocation.pathname !== nextLocation.pathname,
      [isDirty]
    )
  );

  // Handle blocked navigation
  useEffect(() => {
    if (blocker.state === 'blocked') {
      const confirmed = window.confirm(
        'You have unsaved changes. Are you sure you want to leave?'
      );
      if (confirmed) {
        blocker.proceed();
      } else {
        blocker.reset();
      }
    }
  }, [blocker]);

  // Warn on browser close/refresh
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  useEffect(() => {
    // Load project from server if different from current
    const loadProjectData = async () => {
      if (!projectId) return;

      // Skip if already loaded or if it's a new project
      if (projectId === currentProjectId || projectId.startsWith('new-')) {
        return;
      }

      try {
        const filename = `${decodeURIComponent(projectId)}.json`;
        const data = await loadProjectFromServer(filename);
        loadProject(data, projectId);
      } catch (err) {
        console.error('Failed to load project:', err);
        // If project not found, redirect to home
        navigate('/');
      }
    };

    loadProjectData();
  }, [projectId, currentProjectId, loadProject, navigate, setCurrentProjectId]);

  return (
    <div className="flex h-screen w-full bg-gray-50">
      {/* Sidebar: File Library */}
      <PDFLibrarySidebar />

      {/* Main Content: File Viewer + Canvas */}
      <div className="flex-1 flex h-full">
        {/* File Viewer Panel */}
        <div className="flex-1 flex flex-col border-r bg-gray-100">
          {selectedFile ? (
            <>
              <PDFControls />
              <div className="flex-1 relative overflow-hidden">
                {selectedFile.type === 'pdf' && <PDFViewer />}
                {selectedFile.type === 'html' && <HTMLViewer />}
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-full text-gray-500">
              <div className="text-center">
                <p className="text-lg mb-2">No file selected</p>
                <p className="text-sm">Select a file from the library to begin</p>
              </div>
            </div>
          )}
        </div>

        {/* Canvas Panel */}
        <div className="flex-1 bg-white">
          <Canvas />
        </div>
      </div>
    </div>
  );
}
