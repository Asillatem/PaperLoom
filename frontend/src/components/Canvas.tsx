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
  SelectionMode,
} from 'reactflow';
import type { NodeTypes, OnNodesChange, OnEdgesChange, OnConnect, Edge, Viewport } from 'reactflow';
import 'reactflow/dist/style.css';
import { toPng, toSvg } from 'html-to-image';
import { jsPDF } from 'jspdf';
import { SnippetNodeComponent } from './SnippetNodeComponent';
import { NoteNodeComponent } from './NoteNodeComponent';
import { ImageNodeComponent } from './ImageNodeComponent';
import { EdgeConfigPopover } from './EdgeConfigPopover';
import { useAppStore } from '../store/useAppStore';
import { StickyNote, Map, Download, Image, FileText, Loader2, Sparkles, X, LayoutGrid, ArrowDown, ArrowRight, Circle } from 'lucide-react';
import type { ArrowDirection, CanvasNode, SnippetEdge } from '../types';
import { synthesizeNodes, type SynthesisMode } from '../api';
import Dagre from '@dagrejs/dagre';

// Layout direction types
type LayoutDirection = 'TB' | 'LR' | 'radial';

// Apply dagre layout to nodes
const getLayoutedElements = (
  nodes: CanvasNode[],
  edges: SnippetEdge[],
  direction: LayoutDirection
) => {
  const g = new Dagre.graphlib.Graph().setDefaultEdgeLabel(() => ({}));

  // Node dimensions (approximate)
  const nodeWidth = 280;
  const nodeHeight = 150;

  // Configure graph based on direction
  if (direction === 'radial') {
    // For radial, we'll use TB and then transform
    g.setGraph({ rankdir: 'TB', ranksep: 100, nodesep: 80 });
  } else {
    g.setGraph({ rankdir: direction, ranksep: 80, nodesep: 60 });
  }

  // Add nodes to graph
  nodes.forEach((node) => {
    g.setNode(node.id, { width: nodeWidth, height: nodeHeight });
  });

  // Add edges to graph
  edges.forEach((edge) => {
    g.setEdge(edge.source, edge.target);
  });

  // Run layout
  Dagre.layout(g);

  // Get new positions
  const layoutedNodes = nodes.map((node) => {
    const nodeWithPosition = g.node(node.id);
    if (!nodeWithPosition) return node;

    let x = nodeWithPosition.x - nodeWidth / 2;
    let y = nodeWithPosition.y - nodeHeight / 2;

    // For radial layout, transform coordinates
    if (direction === 'radial') {
      const centerX = 400;
      const centerY = 400;
      const angle = (nodeWithPosition.y / 200) * Math.PI * 2;
      const radius = 150 + nodeWithPosition.x * 0.8;
      x = centerX + Math.cos(angle) * radius - nodeWidth / 2;
      y = centerY + Math.sin(angle) * radius - nodeHeight / 2;
    }

    return {
      ...node,
      position: { x, y },
    };
  });

  return layoutedNodes;
};

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
  imageNode: ImageNodeComponent,
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
  const moveImageToCanvas = useAppStore((state) => state.moveImageToCanvas);

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

  // Synthesize state
  const [showSynthesizeModal, setShowSynthesizeModal] = useState(false);
  const [synthesizing, setSynthesizing] = useState(false);
  const { getNodes, fitView } = useReactFlow();

  // Layout state
  const [showLayoutMenu, setShowLayoutMenu] = useState(false);

  // Get selected nodes count
  const selectedNodes = useMemo(() => {
    return nodes.filter((n) => n.selected === true);
  }, [nodes]);

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

  // Get store actions for selection
  const updateNodeSelection = useAppStore((state) => state.updateNodeSelection);

  const onNodesChange: OnNodesChange = useCallback(
    (changes) => {
      // Apply changes to update node positions and track selection
      changes.forEach((change) => {
        if (change.type === 'position' && change.position) {
          updateNodePosition(change.id, change.position);
        }
        if (change.type === 'select') {
          // Update selection in store for multi-select support
          updateNodeSelection(change.id, change.selected);
          if (change.selected) {
            setSelectedNodeId(change.id);
          }
        }
      });
    },
    [updateNodePosition, updateNodeSelection]
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

  // Handle synthesize with mode
  const handleSynthesize = useCallback(
    async (mode: SynthesisMode) => {
      if (selectedNodes.length < 2) return;

      setSynthesizing(true);
      setShowSynthesizeModal(false);

      try {
        const nodeIds = selectedNodes.map((n) => n.id);
        const result = await synthesizeNodes(nodeIds, nodes, mode);

        // Calculate position for new note (average X, below the lowest selected node)
        const avgX = selectedNodes.reduce((sum, n) => sum + n.position.x, 0) / selectedNodes.length;
        const maxY = Math.max(...selectedNodes.map((n) => n.position.y));

        // Create new blue note with synthesis result
        // Position it below the average, with some offset
        addNoteNode({ x: avgX, y: maxY + 250 }, 'blue');

        // Get the newly created note and update its content
        // Note: addNoteNode creates a note with empty label, we need to update it
        setTimeout(() => {
          const allNodes = getNodes();
          const newNote = allNodes.find((n) => n.type === 'noteNode' && n.data.label === '');
          if (newNote) {
            useAppStore.getState().updateNoteContent(newNote.id, result.synthesis);
          }
        }, 50);
      } catch (error) {
        console.error('Synthesis failed:', error);
        alert(`Synthesis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      } finally {
        setSynthesizing(false);
      }
    },
    [selectedNodes, nodes, addNoteNode, getNodes]
  );

  // Handle auto-layout
  const handleLayout = useCallback(
    (direction: LayoutDirection) => {
      if (nodes.length === 0) return;

      setShowLayoutMenu(false);
      const layoutedNodes = getLayoutedElements(nodes, edges, direction);

      // Update all node positions
      layoutedNodes.forEach((node) => {
        updateNodePosition(node.id, node.position);
      });

      // Fit view after layout with a small delay
      setTimeout(() => {
        fitView({ padding: 0.2, duration: 300 });
      }, 50);
    },
    [nodes, edges, updateNodePosition, fitView]
  );

  // Handle drag over to allow drop
  const handleDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  // Handle drop from staging area (text snippets and images)
  const handleDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      const stagedItemId = event.dataTransfer.getData('application/staged-item');
      const stagedImageId = event.dataTransfer.getData('application/staged-image');

      // Convert screen coordinates to flow coordinates
      const flowPosition = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      if (stagedItemId) {
        // Move the staged text item to canvas at drop position
        moveToCanvas(stagedItemId, flowPosition);
      } else if (stagedImageId) {
        // Move the staged image to canvas at drop position
        moveImageToCanvas(stagedImageId, flowPosition);
      }
    },
    [screenToFlowPosition, moveToCanvas, moveImageToCanvas]
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
        selectionOnDrag={true}
        selectionMode={SelectionMode.Partial}
        multiSelectionKeyCode="Control"
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

        {/* Auto-Layout Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowLayoutMenu(!showLayoutMenu)}
            disabled={nodes.length === 0}
            className="flex items-center gap-2 px-3 py-2 bg-white hover:bg-neutral-50 border border-neutral-300 rounded-none shadow-sm transition-colors disabled:opacity-50"
            title="Auto-arrange nodes"
          >
            <LayoutGrid className="w-4 h-4 text-neutral-600" />
            <span className="text-sm font-medium text-neutral-700">Layout</span>
          </button>
          {showLayoutMenu && (
            <div className="absolute right-0 top-full mt-1 bg-white border border-neutral-200 shadow-lg rounded-none min-w-[160px] z-20">
              <div className="px-3 py-1.5 text-xs font-bold text-neutral-500 uppercase tracking-wide border-b border-neutral-100">
                Arrange Nodes
              </div>
              <button
                onClick={() => handleLayout('TB')}
                className="w-full px-3 py-2 text-left text-sm text-neutral-700 hover:bg-blue-50 flex items-center gap-2"
              >
                <ArrowDown className="w-4 h-4" />
                Top to Bottom
              </button>
              <button
                onClick={() => handleLayout('LR')}
                className="w-full px-3 py-2 text-left text-sm text-neutral-700 hover:bg-blue-50 flex items-center gap-2"
              >
                <ArrowRight className="w-4 h-4" />
                Left to Right
              </button>
              <button
                onClick={() => handleLayout('radial')}
                className="w-full px-3 py-2 text-left text-sm text-neutral-700 hover:bg-blue-50 flex items-center gap-2"
              >
                <Circle className="w-4 h-4" />
                Radial
              </button>
            </div>
          )}
        </div>

        {/* Synthesize Button - shown when 2+ nodes selected */}
        {selectedNodes.length >= 2 && (
          <button
            onClick={() => setShowSynthesizeModal(true)}
            disabled={synthesizing}
            className="flex items-center gap-2 px-3 py-2 bg-purple-100 hover:bg-purple-200 border-2 border-purple-300 rounded-none shadow-sm transition-colors"
            title={`Synthesize ${selectedNodes.length} selected nodes`}
          >
            {synthesizing ? (
              <Loader2 className="w-4 h-4 text-purple-700 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4 text-purple-700" />
            )}
            <span className="text-sm font-medium text-purple-800">
              Synthesize ({selectedNodes.length})
            </span>
          </button>
        )}

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

      {/* Synthesize Mode Modal */}
      {showSynthesizeModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-none shadow-xl border-l-4 border-purple-600 w-[360px] max-w-[90vw]">
            <div className="flex items-center justify-between p-4 border-b border-neutral-200">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-purple-600" />
                <h3 className="font-bold text-neutral-800">Synthesize {selectedNodes.length} Nodes</h3>
              </div>
              <button
                onClick={() => setShowSynthesizeModal(false)}
                className="p-1 hover:bg-neutral-100 rounded"
              >
                <X className="w-4 h-4 text-neutral-500" />
              </button>
            </div>
            <div className="p-4 space-y-2">
              <p className="text-sm text-neutral-600 mb-4">
                Choose how to combine the selected content:
              </p>
              <button
                onClick={() => handleSynthesize('summary')}
                className="w-full p-3 text-left border border-neutral-200 hover:border-purple-300 hover:bg-purple-50 transition-colors"
              >
                <div className="font-medium text-neutral-800">Summary</div>
                <div className="text-sm text-neutral-500">Concise summary of key points</div>
              </button>
              <button
                onClick={() => handleSynthesize('compare')}
                className="w-full p-3 text-left border border-neutral-200 hover:border-purple-300 hover:bg-purple-50 transition-colors"
              >
                <div className="font-medium text-neutral-800">Compare</div>
                <div className="text-sm text-neutral-500">Find similarities and differences</div>
              </button>
              <button
                onClick={() => handleSynthesize('narrative')}
                className="w-full p-3 text-left border border-neutral-200 hover:border-purple-300 hover:bg-purple-50 transition-colors"
              >
                <div className="font-medium text-neutral-800">Narrative</div>
                <div className="text-sm text-neutral-500">Weave into a coherent story</div>
              </button>
            </div>
          </div>
        </div>
      )}

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
