import { useCallback, useState, useMemo, useRef } from 'react';
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
import type { NodeTypes, OnNodesChange, OnEdgesChange, OnConnect } from 'reactflow';
import 'reactflow/dist/style.css';
import { SnippetNodeComponent } from './SnippetNodeComponent';
import { NoteNodeComponent } from './NoteNodeComponent';
import { useAppStore } from '../store/useAppStore';
import { StickyNote } from 'lucide-react';

const nodeTypes: NodeTypes = {
  snippetNode: SnippetNodeComponent,
  noteNode: NoteNodeComponent,
};

function CanvasInner() {
  const nodes = useAppStore((state) => state.nodes);
  const edges = useAppStore((state) => state.edges);
  const updateNodePosition = useAppStore((state) => state.updateNodePosition);
  const storeOnEdgesChange = useAppStore((state) => state.onEdgesChange);
  const storeOnConnect = useAppStore((state) => state.onConnect);
  const addNoteNode = useAppStore((state) => state.addNoteNode);

  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const { screenToFlowPosition } = useReactFlow();

  // Track selected node to bring it to front
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  // Context menu state
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; flowX: number; flowY: number } | null>(null);

  // Add zIndex to nodes - selected node gets highest z-index
  const nodesWithZIndex = useMemo(() => {
    return nodes.map((node) => ({
      ...node,
      zIndex: node.id === selectedNodeId ? 1000 : 0,
    }));
  }, [nodes, selectedNodeId]);

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

  return (
    <div ref={reactFlowWrapper} className="h-full w-full bg-neutral-100 relative" onClick={closeContextMenu}>
      <ReactFlow
        nodes={nodesWithZIndex}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onPaneContextMenu={onPaneContextMenu}
        connectionMode={ConnectionMode.Loose}
        fitView
        minZoom={0.1}
        maxZoom={2}
        defaultViewport={{ x: 0, y: 0, zoom: 1 }}
        onlyRenderVisibleElements={true}
        defaultEdgeOptions={{
          type: 'smoothstep',
          style: { stroke: '#1e3a8a', strokeWidth: 2 },
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color: '#1e3a8a',
            width: 20,
            height: 20,
          },
        }}
      >
        <Background variant={BackgroundVariant.Dots} gap={16} size={1} color="#d4d4d4" />
        <Controls className="bg-white border border-neutral-300 rounded-none" />
        <MiniMap
          nodeColor={(node) => node.type === 'noteNode' ? '#fbbf24' : '#1e3a8a'}
          maskColor="rgba(0, 0, 0, 0.1)"
          className="bg-white border border-neutral-300 rounded-none"
        />
      </ReactFlow>

      {/* Add Note Button */}
      <button
        onClick={handleAddNoteButton}
        className="absolute top-4 right-4 flex items-center gap-2 px-3 py-2 bg-yellow-100 hover:bg-yellow-200 border-2 border-yellow-300 rounded-none shadow-sm transition-colors z-10"
        title="Add a note"
      >
        <StickyNote className="w-4 h-4 text-yellow-700" />
        <span className="text-sm font-medium text-yellow-800">Add Note</span>
      </button>

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
