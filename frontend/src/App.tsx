import { PDFLibrarySidebar } from './components/PDFLibrarySidebar';
import { PDFViewer } from './components/PDFViewer';
import { PDFControls } from './components/PDFControls';
import { Canvas } from './components/Canvas';
import { useAppStore } from './store/useAppStore';

function App() {
  const selectedPdf = useAppStore((state) => state.selectedPdf);

  return (
    <div className="flex h-screen w-full bg-gray-50">
      {/* Sidebar: PDF Library */}
      <PDFLibrarySidebar />

      {/* Main Content: PDF Viewer + Canvas */}
      <div className="flex-1 flex h-full">
        {/* PDF Viewer Panel */}
        <div className="flex-1 flex flex-col border-r bg-gray-100">
          {selectedPdf ? (
            <>
              <PDFControls />
              <div className="flex-1 relative overflow-hidden">
                <PDFViewer />
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-full text-gray-500">
              <div className="text-center">
                <p className="text-lg mb-2">No PDF selected</p>
                <p className="text-sm">Select a PDF from the library to begin</p>
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

export default App;