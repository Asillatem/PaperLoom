import { useCallback } from 'react';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  applyNodeChanges,
  BackgroundVariant,
} from 'reactflow';
import type { NodeTypes, OnNodesChange } from 'reactflow';
import 'reactflow/dist/style.css';
import { SnippetNodeComponent } from './SnippetNodeComponent';
import { useAppStore } from '../store/useAppStore';

const nodeTypes: NodeTypes = {
  snippetNode: SnippetNodeComponent,
};

export function Canvas() {
  const nodes = useAppStore((state) => state.nodes);
  const updateNodePosition = useAppStore((state) => state.updateNodePosition);

  const onNodesChange: OnNodesChange = useCallback(
    (changes) => {
      // Apply changes to update node positions
      changes.forEach((change) => {
        if (change.type === 'position' && change.position) {
          updateNodePosition(change.id, change.position);
        }
      });
    },
    [updateNodePosition]
  );

  return (
    <div className="h-full w-full bg-gray-50">
      <ReactFlow
        nodes={nodes}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        fitView
        minZoom={0.1}
        maxZoom={2}
        defaultViewport={{ x: 0, y: 0, zoom: 1 }}
        onlyRenderVisibleElements={true}
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
              Select text on a PDF to create your first snippet
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
