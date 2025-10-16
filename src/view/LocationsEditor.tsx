import { ReactFlow, Node, useNodesState, Controls, Background, Position } from '@xyflow/react';
import { useEffect } from 'react';
import '@xyflow/react/dist/style.css';

interface Location {
  id: string;
  name: string;
  emoji: string;
  description: string;
}

interface LocationsEditorProps {
  locations: Location[];
}

export default function LocationsEditor({ locations }: LocationsEditorProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);

  useEffect(() => {
    const locationNodes: Node[] = locations.map((loc, idx) => {
      const angle = (idx / locations.length) * 2 * Math.PI;
      const radius = Math.min(250, 150 + locations.length * 20);
      const x = 400 + radius * Math.cos(angle);
      const y = 300 + radius * Math.sin(angle);

      return {
        id: loc.id,
        type: 'default',
        position: { x, y },
        data: {
          label: (
            <div style={{ textAlign: 'center', padding: '10px' }}>
              <div style={{ fontSize: '32px', marginBottom: '5px' }}>{loc.emoji}</div>
              <div style={{ fontSize: '14px', fontWeight: 'bold' }}>{loc.name}</div>
            </div>
          )
        },
        sourcePosition: Position.Right,
        targetPosition: Position.Left,
        style: {
          background: 'white',
          border: '3px solid #764ba2',
          borderRadius: '50%',
          width: 120,
          height: 120,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'grab'
        }
      };
    });

    setNodes(locationNodes);
  }, [locations, setNodes]);

  return (
    <div style={{ width: '100%', height: '100%', background: '#F3F4F6' }}>
      <ReactFlow
        nodes={nodes}
        onNodesChange={onNodesChange}
        fitView
        minZoom={0.5}
        maxZoom={1.5}
      >
        <Background />
        <Controls />
      </ReactFlow>
    </div>
  );
}
