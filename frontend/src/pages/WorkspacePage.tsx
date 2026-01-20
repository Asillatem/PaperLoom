import { useEffect, useCallback } from 'react';
import { useParams, useNavigate, useBlocker } from 'react-router-dom';
import { Panel, Group, Separator } from 'react-resizable-panels';
import { PDFLibrarySidebar } from '../components/PDFLibrarySidebar';
import { PDFViewer } from '../components/PDFViewer';
import { HTMLViewer } from '../components/HTMLViewer';
import { PDFControls } from '../components/PDFControls';
import { Canvas } from '../components/Canvas';
import { ChatSidebar } from '../components/ChatSidebar';
import { SnippetMetadataPanel } from '../components/SnippetMetadataPanel';
import { StagingPopup } from '../components/StagingPopup';
import { useAppStore } from '../store/useAppStore';
import { loadProjectFromServer } from '../api';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';

export function WorkspacePage() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const selectedFile = useAppStore((state) => state.selectedPdf);
  const currentProjectId = useAppStore((state) => state.currentProjectId);
  const setCurrentProjectId = useAppStore((state) => state.setCurrentProjectId);
  const loadProject = useAppStore((state) => state.loadProject);
  const isDirty = useAppStore((state) => state.isDirty);
  const metadataPanelKey = useAppStore((state) => state.metadataPanelKey);
  const closeMetadataPanel = useAppStore((state) => state.closeMetadataPanel);
  const focusMode = useAppStore((state) => state.focusMode);

  // Enable keyboard shortcuts
  useKeyboardShortcuts();

  // Block navigation when there are unsaved changes
  const blocker = useBlocker(
    useCallback(
      ({ currentLocation, nextLocation }: { currentLocation: { pathname: string }; nextLocation: { pathname: string } }) =>
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
    <div className="h-screen w-full bg-neutral-200 flex relative">
      {/* Fixed Sidebar: File Library - hidden in focus mode */}
      {!focusMode && (
        <div className="w-64 flex-shrink-0 h-full">
          <PDFLibrarySidebar />
        </div>
      )}

      {/* Resizable Panels for Viewer and Canvas */}
      <Group orientation="horizontal" className="flex-1 h-full">
        {/* File Viewer Panel - expands in focus mode */}
        <Panel defaultSize={focusMode ? 100 : 50} minSize={20}>
          <div className="h-full flex flex-col bg-neutral-100 border-r border-neutral-300 overflow-hidden">
            {selectedFile ? (
              <>
                <PDFControls />
                <div className="flex-1 relative overflow-hidden">
                  {selectedFile.type === 'pdf' && <PDFViewer />}
                  {selectedFile.type === 'html' && <HTMLViewer />}
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center h-full text-neutral-500">
                <div className="text-center">
                  <p className="text-lg font-medium mb-2">No file selected</p>
                  <p className="text-sm">Select a file from the library to begin</p>
                </div>
              </div>
            )}
          </div>
        </Panel>

        {/* Canvas Panel - hidden in focus mode */}
        {!focusMode && (
          <>
            <Separator
              className="panel-resize-handle"
              style={{ width: '8px', cursor: 'col-resize' }}
            />

            <Panel defaultSize={50} minSize={20}>
              <div className="h-full bg-white overflow-hidden">
                <Canvas />
              </div>
            </Panel>
          </>
        )}
      </Group>

      {/* AI Brain Chat Sidebar - hidden in focus mode */}
      {!focusMode && <ChatSidebar />}

      {/* Staging Popup - visible in all modes */}
      <StagingPopup />

      {/* Source Metadata Panel */}
      {metadataPanelKey && (
        <SnippetMetadataPanel
          attachmentKey={metadataPanelKey}
          onClose={closeMetadataPanel}
        />
      )}
    </div>
  );
}
