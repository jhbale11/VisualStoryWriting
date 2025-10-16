import { Background, BackgroundVariant, Controls, Edge, Node, ReactFlow, ReactFlowProvider } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useEffect, useState } from 'react';
import { Character } from '../../model/GlossaryModel';

interface CharacterNode extends Node {
  data: {
    character: Character;
    isSelected: boolean;
  };
}

interface Props {
  characters: Character[];
  onCharacterSelect: (character: Character) => void;
  selectedCharacterId?: string;
}

export default function CharacterRelationshipGraph({
  characters,
  onCharacterSelect,
  selectedCharacterId,
}: Props) {
  const [nodes, setNodes] = useState<CharacterNode[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);

  useEffect(() => {
    if (characters.length === 0) return;

    const centerX = 400;
    const centerY = 300;
    const radius = 200;

    const characterNodes: CharacterNode[] = characters.map((char, index) => {
      const angle = (index / characters.length) * 2 * Math.PI;
      const x = centerX + radius * Math.cos(angle);
      const y = centerY + radius * Math.sin(angle);

      return {
        id: char.id,
        type: 'default',
        position: { x, y },
        data: {
          character: char,
          isSelected: char.id === selectedCharacterId,
          label: (
            <div
              style={{
                padding: '10px',
                background: char.id === selectedCharacterId ? '#667eea' : 'white',
                color: char.id === selectedCharacterId ? 'white' : 'black',
                borderRadius: '8px',
                border: '2px solid #667eea',
                cursor: 'pointer',
                minWidth: '100px',
                textAlign: 'center',
                fontWeight: 'bold',
              }}
            >
              {char.name}
            </div>
          ),
        },
      };
    });

    const relationshipEdges: Edge[] = [];
    characters.forEach((char) => {
      char.relationships.forEach((rel) => {
        const targetChar = characters.find(
          (c) => c.name.toLowerCase() === rel.character_id.toLowerCase()
        );
        if (targetChar) {
          relationshipEdges.push({
            id: `${char.id}-${targetChar.id}`,
            source: char.id,
            target: targetChar.id,
            label: rel.relationship_type,
            animated: true,
            style: { stroke: '#888', strokeWidth: 2 },
          });
        }
      });
    });

    setNodes(characterNodes);
    setEdges(relationshipEdges);
  }, [characters, selectedCharacterId]);

  return (
    <div style={{ width: '100%', height: '100%' }}>
      <ReactFlowProvider>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodeClick={(_, node) => {
            const charNode = node as CharacterNode;
            onCharacterSelect(charNode.data.character);
          }}
          fitView
          attributionPosition="bottom-left"
        >
          <Background variant={BackgroundVariant.Dots} />
          <Controls />
        </ReactFlow>
      </ReactFlowProvider>
    </div>
  );
}
