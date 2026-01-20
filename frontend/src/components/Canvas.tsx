import { useCallback, useState, useMemo, useRef, useEffect } from 'react';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  BackgroundVariant,
  ConnectionMode,
  MarkerType,
  useReactFlow,
  ReactFlowProvider,
} from 'reactflow';
import type { NodeTypes, OnNodesChange, OnEdgesChange, OnConnect, Edge, Viewport } from 'reactflow';
import 'reactflow/dist/style.css';
import { toPng, toSvg } from 'html-to-image';
import { jsPDF } from 'jspdf';
import { SnippetNodeComponent } from './SnippetNodeComponent';
import { NoteNodeComponent } from './NoteNodeComponent';
import { EdgeConfigPopover } from './EdgeConfigPopover';
import { useAppStore } from '../store/useAppStore';
import { StickyNote, Map, Download, Image, FileText, Loader2 } from 'lucide-react';
import type { ArrowDirection } from '../types';

// Helper to compute edge markers based on arrow direction
const getEdgeMarkers = (direction: ArrowDirection = 'forward') => {
  const arrowMarker = {
    type: MarkerType.ArrowClosed,
    color: '#1e3a8a',
    width: 20,
    height: 20,
  };

  switch (direction) {
    case 'forward':
      return { markerEnd: arrowMarker };
    case 'backward':
      return { markerStart: arrowMarker };
    case 'both':
      return { markerStart: arrowMarker, markerEnd: arrowMarker };
    case 'none':
      return {};
    default:
      return { markerEnd: arrowMarker };
  }
};

const nodeTypes: NodeTypes = {
  snippetNode: SnippetNodeComponent,
  noteNode: NoteNodeComponent,
};

function CanvasInner() {
  const nodes = useAppStore((state) => state.nodes);
  const edges = useAppStore((state) => state.edges);
  const viewportState = useAppStore((state) => state.viewportState);
  const setViewportState = useAppStore((state) => state.setViewportState);
  const updateNodePosition = useAppStore((state) => state.updateNodePosition);
  const storeOnEdgesChange = useAppStore((state) => state.onEdgesChange);
  const storeOnConnect = useAppStore((state) => state.onConnect);
  const addNoteNode = useAppStore((state) => state.addNoteNode);
  const moveToCanvas = useAppStore((state) => state.moveToCanvas);

  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const { screenToFlowPosition } = useReactFlow();
  const viewportTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Track selected node to bring it to front
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  // Context menu state
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; flowX: number; flowY: number } | null>(null);

  // Edge config popover state
  const [selectedEdge, setSelectedEdge] = useState<{ id: string; position: { x: number; y: number } } | null>(null);

  // Minimap visibility state
  const [showMinimap, setShowMinimap] = useState(false);

  // Export state
  const [exporting, setExporting] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);

  // Export canvas functions
  const exportCanvas = useCallback(async (format: 'png' | 'svg' | 'pdf') => {
    const element = document.querySelector('.react-flow') as HTMLElement;
    if (!element) return;

    setExporting(true);
    setShowExportMenu(false);

    try {
      // Use higher resolution for better quality
      const options = {
        backgroundColor: '#f5f5f5',
        pixelRatio: 2,
      };

      if (format === 'png') {
        const dataUrl = await toPng(element, options);
        const link = document.createElement('a');
        link.download = 'canvas.png';
        link.href = dataUrl;
        link.click();
      } else if (format === 'svg') {
        const dataUrl = await toSvg(element, options);
        const link = document.createElement('a');
        link.download = 'canvas.svg';
        link.href = dataUrl;
        link.click();
      } else if (format === 'pdf') {
        const dataUrl = await toPng(element, { ...options, pixelRatio: 2 });
        const pdf = new jsPDF({
          orientation: element.offsetWidth > element.offsetHeight ? 'landscape' : 'portrait',
          unit: 'px',
          format: [element.offsetWidth, element.offsetHeight],
        });
        pdf.addImage(dataUrl, 'PNG', 0, 0, element.offsetWidth, element.offsetHeight);
        pdf.save('canvas.pdf');
      }
    } catch (error) {
      console.error('Export failed:', error);
      alert('Failed to export canvas. Try again.');
    } finally {
      setExporting(false);
    }
  }, []);

  // Debounced viewport change handler
  const handleViewportChange = useCallback(
    (viewport: Viewport) => {
      // Clear previous timeout
      if (viewportTimeoutRef.current) {
        clearTimeout(viewportTimeoutRef.current);
      }
      // Debounce: save viewport after 300ms of no changes
      viewportTimeoutRef.current = setTimeout(() => {
        setViewportState({ x: viewport.x, y: viewport.y, zoom: viewport.zoom });
      }, 300);
    },
    [setViewportState]
  );

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (viewportTimeoutRef.current) {
        clearTimeout(viewportTimeoutRef.current);
      }
    };
  }, []);

  // Add zIndex to nodes - selected node gets highest z-index
  const nodesWithZIndex = useMemo(() => {
    return nodes.map((node) => ({
      ...node,
      zIndex: node.id === selectedNodeId ? 1000 : 0,
    }));
  }, [nodes, selectedNodeId]);

  // Transform edges to include computed markers based on arrowDirection
  const edgesWithMarkers = useMemo(() => {
    return edges.map((edge) => ({
      ...edge,
      ...getEdgeMarkers(edge.arrowDirection),
    }));
  }, [edges]);

  const onNodesChange: OnNodesChange = useCallback(
    (changes) => {
      // Apply changes to update node positions and track selection
      changes.forEach((change) => {
        if (change.type === 'position' && change.position) {
          updateNodePosition(change.id, change.position);
        }
        if (change.type === 'select' && change.selected) {
          setSelectedNodeId(change.id);
        }
      });
    },
    [updateNodePosition]
  );

  const onEdgesChange: OnEdgesChange = useCallback(
    (changes) => {
      storeOnEdgesChange(changes);
    },
    [storeOnEdgesChange]
  );

  const onConnect: OnConnect = useCallback(
    (connection) => {
      storeOnConnect(connection);
    },
    [storeOnConnect]
  );

  // Handle edge click to show config popover
  const onEdgeClick = useCallback(
    (event: React.MouseEvent, edge: Edge) => {
      event.stopPropagation();
      setSelectedEdge({
        id: edge.id,
        position: { x: event.clientX, y: event.clientY },
      });
    },
    []
  );

  // Close edge config popover
  const closeEdgeConfig = useCallback(() => {
    setSelectedEdge(null);
  }, []);

  // Handle right-click on canvas
  const onPaneContextMenu = useCallback(
    (event: React.MouseEvent) => {
      event.preventDefault();
      const flowPosition = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });
      setContextMenu({
        x: event.clientX,
        y: event.clientY,
        flowX: flowPosition.x,
        flowY: flowPosition.y,
      });
    },
    [screenToFlowPosition]
  );

  // Close context menu
  const closeContextMenu = useCallback(() => {
    setContextMenu(null);
  }, []);

  // Add note at position
  const handleAddNote = useCallback(
    (color: 'yellow' | 'blue' | 'green' | 'pink' | 'purple' = 'yellow') => {
      if (contextMenu) {
        addNoteNode({ x: contextMenu.flowX, y: contextMenu.flowY }, color);
        closeContextMenu();
      }
    },
    [contextMenu, addNoteNode, closeContextMenu]
  );

  // Add note at center of viewport
  const handleAddNoteButton = useCallback(() => {
    if (reactFlowWrapper.current) {
      const rect = reactFlowWrapper.current.getBoundingClientRect();
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      const flowPosition = screenToFlowPosition({ x: rect.left + centerX, y: rect.top + centerY });
      addNoteNode(flowPosition, 'yellow');
    }
  }, [screenToFlowPosition, addNoteNode]);

  // Handle drag over to allow drop
  const handleDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  // Handle drop from staging area
  const handleDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      const stagedItemId = event.dataTransfer.getData('application/staged-item');

      if (stagedItemId) {
        // Convert screen coordinates to flow coordinates
        const flowPosition = screenToFlowPosition({
          x: event.clientX,
          y: event.clientY,
        });

        // Move the staged item to canvas at drop position
        moveToCanvas(stagedItemId, flowPosition);
      }
    },
    [screenToFlowPosition, moveToCanvas]
  );

  return (
    <div
      ref={reactFlowWrapper}
      className="h-full w-full bg-neutral-100 relative"
      onClick={closeContextMenu}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <ReactFlow
        nodes={nodesWithZIndex}
        edges={edgesWithMarkers}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onPaneContextMenu={onPaneContextMenu}
        onEdgeClick={onEdgeClick}
        onMoveEnd={(_, viewport) => handleViewportChange(viewport)}
        connectionMode={ConnectionMode.Loose}
        fitView={!viewportState}
        minZoom={0.1}
        maxZoom={2}
        defaultViewport={viewportState ?? { x: 0, y: 0, zoom: 1 }}
        onlyRenderVisibleElements={true}
        snapToGrid={true}
        snapGrid={[16, 16]}
        defaultEdgeOptions={{
          type: 'smoothstep',
          style: { stroke: '#1e3a8a', strokeWidth: 2 },
        }}
      >
        <Background variant={BackgroundVariant.Dots} gap={16} size={1} color="#d4d4d4" />
        <Controls className="bg-white border border-neutral-300 rounded-none">
          {/* Map toggle button integrated into Controls */}
          <button
            onClick={() => setShowMinimap(!showMinimap)}
            className={`react-flow__controls-button ${showMinimap ? 'bg-blue-100' : ''}`}
            title={showMinimap ? 'Hide minimap' : 'Show minimap'}
          >
            <Map className="w-3 h-3" />
          </button>
        </Controls>
        {showMinimap && (
          <MiniMap
            nodeColor={(node) => node.type === 'noteNode' ? '#fbbf24' : '#1e3a8a'}
            maskColor="rgba(0, 0, 0, 0.1)"
            className="bg-white border border-neutral-300 rounded-none !left-2 !bottom-36"
            position="bottom-left"
          />
        )}
      </ReactFlow>

      {/* Canvas Actions */}
      <div className="absolute top-4 right-4 flex items-center gap-2 z-10">
        {/* Export Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowExportMenu(!showExportMenu)}
            disabled={exporting}
            className="flex items-center gap-2 px-3 py-2 bg-white hover:bg-neutral-50 border border-neutral-300 rounded-none shadow-sm transition-colors"
            title="Export canvas"
          >
            {exporting ? (
              <Loader2 className="w-4 h-4 text-neutral-600 animate-spin" />
            ) : (
              <Download className="w-4 h-4 text-neutral-600" />
            )}
            <span className="text-sm font-medium text-neutral-700">Export</span>
          </button>
          {showExportMenu && (
            <div className="absolute right-0 top-full mt-1 bg-white border border-neutral-200 shadow-lg rounded-none min-w-[140px]">
              <button
                onClick={() => exportCanvas('png')}
                className="w-full px-3 py-2 text-left text-sm text-neutral-700 hover:bg-blue-50 flex items-center gap-2"
              >
                <Image className="w-4 h-4" />
                PNG Image
              </button>
              <button
                onClick={() => exportCanvas('svg')}
                className="w-full px-3 py-2 text-left text-sm text-neutral-700 hover:bg-blue-50 flex items-center gap-2"
              >
                <Image className="w-4 h-4" />
                SVG Vector
              </button>
              <button
                onClick={() => exportCanvas('pdf')}
                className="w-full px-3 py-2 text-left text-sm text-neutral-700 hover:bg-blue-50 flex items-center gap-2"
              >
                <FileText className="w-4 h-4" />
                PDF Document
              </button>
            </div>
          )}
        </div>

        {/* Add Note Button */}
        <button
          onClick={handleAddNoteButton}
          className="flex items-center gap-2 px-3 py-2 bg-yellow-100 hover:bg-yellow-200 border-2 border-yellow-300 rounded-none shadow-sm transition-colors"
          title="Add a note"
        >
          <StickyNote className="w-4 h-4 text-yellow-700" />
          <span className="text-sm font-medium text-yellow-800">Add Note</span>
        </button>
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <div
          className="fixed bg-white rounded-none shadow-xl border-l-4 border-blue-900 py-2 z-50 min-w-[180px] context-menu-enter"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="px-3 py-1 text-xs font-bold text-neutral-500 uppercase tracking-wide">Add Note</div>
          <button
            onClick={() => handleAddNote('yellow')}
            className="w-full px-4 py-2 text-left text-sm text-neutral-700 hover:bg-yellow-50 flex items-center gap-2"
          >
            <div className="w-4 h-4 bg-yellow-200 border border-yellow-400 rounded-none" />
            Yellow
          </button>
          <button
            onClick={() => handleAddNote('blue')}
            className="w-full px-4 py-2 text-left text-sm text-neutral-700 hover:bg-blue-50 flex items-center gap-2"
          >
            <div className="w-4 h-4 bg-blue-200 border border-blue-400 rounded-none" />
            Blue
          </button>
          <button
            onClick={() => handleAddNote('green')}
            className="w-full px-4 py-2 text-left text-sm text-neutral-700 hover:bg-green-50 flex items-center gap-2"
          >
            <div className="w-4 h-4 bg-green-200 border border-green-400 rounded-none" />
            Green
          </button>
          <button
            onClick={() => handleAddNote('pink')}
            className="w-full px-4 py-2 text-left text-sm text-neutral-700 hover:bg-pink-50 flex items-center gap-2"
          >
            <div className="w-4 h-4 bg-pink-200 border border-pink-400 rounded-none" />
            Pink
          </button>
          <button
            onClick={() => handleAddNote('purple')}
            className="w-full px-4 py-2 text-left text-sm text-neutral-700 hover:bg-purple-50 flex items-center gap-2"
          >
            <div className="w-4 h-4 bg-purple-200 border border-purple-400 rounded-none" />
            Purple
          </button>
        </div>
      )}

      {/* Edge Config Popover */}
      {selectedEdge && (
        <EdgeConfigPopover
          edgeId={selectedEdge.id}
          position={selectedEdge.position}
          currentDirection={edges.find((e) => e.id === selectedEdge.id)?.arrowDirection || 'forward'}
          onClose={closeEdgeConfig}
        />
      )}

      {/* Empty state */}
      {nodes.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center text-neutral-400">
            <p className="text-lg font-medium mb-2">No snippets yet</p>
            <p className="text-sm">
              Select text on a document to create snippets
            </p>
            <p className="text-xs mt-1">
              Right-click to add notes, drag between cards to connect
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// Wrap in ReactFlowProvider for useReactFlow hook
export function Canvas() {
  return (
    <ReactFlowProvider>
      <CanvasInner />
    </ReactFlowProvider>
  );
}
