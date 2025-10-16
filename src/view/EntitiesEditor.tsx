import { ReactFlow, Node, Edge, Controls, Background, useNodesState, useEdgesState, Position } from '@xyflow/react';
import { useEffect } from 'react';
import '@xyflow/react/dist/style.css';

interface Character {
  id: string;
  name: string;
  emoji: string;
  korean_name?: string;
}

interface Event {
  id: string;
  description: string;
  involved_characters: string[];
  locations: string[];
  importance: number;
}

interface EntitiesEditorProps {
  characters: Character[];
  events: Event[];
}

export default function EntitiesEditor({ characters, events }: EntitiesEditorProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  useEffect(() => {
    const characterNodes: Node[] = characters.map((char, idx) => ({
      id: char.id,
      type: 'default',
      position: {
        x: 150 + (idx % 4) * 200,
        y: 100 + Math.floor(idx / 4) * 150
      },
      data: {
        label: (
          <div style={{ textAlign: 'center', padding: '5px' }}>
            <div style={{ fontSize: '24px' }}>{char.emoji}</div>
            <div style={{ fontSize: '12px', fontWeight: 'bold' }}>{char.name}</div>
            {char.korean_name && (
              <div style={{ fontSize: '10px', color: '#666' }}>{char.korean_name}</div>
            )}
          </div>
        )
      },
      sourcePosition: Position.Right,
      targetPosition: Position.Left,
      style: {
        background: 'white',
        border: '2px solid #667eea',
        borderRadius: '50%',
        width: 100,
        height: 100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'grab'
      }
    }));

    const eventEdges: Edge[] = events.flatMap((event, idx) => {
      const involvedChars = event.involved_characters.filter(charName =>
        characters.some(c => c.name === charName)
      );

      if (involvedChars.length < 2) return [];

      return involvedChars.slice(0, -1).map((source, i) => {
        const sourceChar = characters.find(c => c.name === source);
        const targetChar = characters.find(c => c.name === involvedChars[i + 1]);

        if (!sourceChar || !targetChar) return null;

        return {
          id: `${event.id}-${i}`,
          source: sourceChar.id,
          target: targetChar.id,
          label: event.description.slice(0, 30) + '...',
          type: 'smoothstep',
          animated: true,
          style: { stroke: '#667eea', strokeWidth: 2 },
          labelStyle: { fontSize: 10, fill: '#666' }
        };
      }).filter(Boolean) as Edge[];
    });

    setNodes(characterNodes);
    setEdges(eventEdges);
  }, [characters, events, setNodes, setEdges]);

  return (
    <div style={{ width: '100%', height: '100%', background: '#F3F4F6' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
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
