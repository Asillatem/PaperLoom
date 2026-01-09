import { useCallback, useState, useMemo } from 'react';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  BackgroundVariant,
  ConnectionMode,
} from 'reactflow';
import type { NodeTypes, OnNodesChange, OnEdgesChange, OnConnect } from 'reactflow';
import 'reactflow/dist/style.css';
import { SnippetNodeComponent } from './SnippetNodeComponent';
import { useAppStore } from '../store/useAppStore';

const nodeTypes: NodeTypes = {
  snippetNode: SnippetNodeComponent,
};

export function Canvas() {
  const nodes = useAppStore((state) => state.nodes);
  const edges = useAppStore((state) => state.edges);
  const updateNodePosition = useAppStore((state) => state.updateNodePosition);
  const storeOnEdgesChange = useAppStore((state) => state.onEdgesChange);
  const storeOnConnect = useAppStore((state) => state.onConnect);

  // Track selected node to bring it to front
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

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

  return (
    <div className="h-full w-full bg-gray-50">
      <ReactFlow
        nodes={nodesWithZIndex}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        connectionMode={ConnectionMode.Loose}
        fitView
        minZoom={0.1}
        maxZoom={2}
        defaultViewport={{ x: 0, y: 0, zoom: 1 }}
        onlyRenderVisibleElements={true}
        defaultEdgeOptions={{
          type: 'smoothstep',
          style: { stroke: '#3b82f6', strokeWidth: 2 },
        }}
      >
        <Background variant={BackgroundVariant.Dots} gap={16} size={1} color="#e5e7eb" />
        <Controls />
        <MiniMap
          nodeColor={(node) => {
            return '#3b82f6';
          }}
          maskColor="rgba(0, 0, 0, 0.1)"
          className="bg-white border border-gray-300"
        />
      </ReactFlow>

      {/* Empty state */}
      {nodes.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center text-gray-400">
            <p className="text-lg mb-2">No snippets yet</p>
            <p className="text-sm">
              Select text on a PDF to create snippets
            </p>
            <p className="text-xs mt-1">
              Drag between cards to create connections
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
