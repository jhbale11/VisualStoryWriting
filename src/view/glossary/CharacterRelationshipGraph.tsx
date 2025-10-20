import { Background, BackgroundVariant, Controls, Edge, MarkerType, Node, ReactFlow } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useEffect, useState } from 'react';
import { GlossaryCharacter } from '../../model/GlossaryModel';

interface CharacterNode extends Node {
  data: {
    character: GlossaryCharacter;
    isSelected: boolean;
    label: JSX.Element;
  };
}

interface Props {
  characters: GlossaryCharacter[];
  onCharacterSelect: (character: GlossaryCharacter) => void;
  selectedCharacterId?: string;
}

interface RelationshipEdge extends Edge {
  data: {
    relationship: string;
    description: string;
    sentiment: 'positive' | 'negative' | 'neutral';
  };
}

const getRelationshipSentiment = (relType: string): 'positive' | 'negative' | 'neutral' => {
  const positiveKeywords = ['친구', '연인', '가족', '동료', '스승', '제자', 'friend', 'ally', 'lover', 'family', 'mentor', '좋아', '사랑', '존경', '신뢰', '부모', '자식', '형제', '자매', '동료', '파트너'];
  const negativeKeywords = ['적', '라이벌', '싫어', '미워', '원수', 'enemy', 'rival', 'hate', 'antagonist', '질투', '증오', '반목', '대립'];

  const lowerType = relType.toLowerCase();

  if (positiveKeywords.some(kw => lowerType.includes(kw))) {
    return 'positive';
  }
  if (negativeKeywords.some(kw => lowerType.includes(kw))) {
    return 'negative';
  }
  return 'neutral';
};

const getSentimentColor = (sentiment: 'positive' | 'negative' | 'neutral'): string => {
  switch (sentiment) {
    case 'positive':
      return '#22c55e';
    case 'negative':
      return '#ef4444';
    case 'neutral':
      return '#6b7280';
  }
};

export default function CharacterRelationshipGraph({
  characters,
  onCharacterSelect,
  selectedCharacterId,
}: Props) {
  const [nodes, setNodes] = useState<CharacterNode[]>([]);
  const [edges, setEdges] = useState<RelationshipEdge[]>([]);

  useEffect(() => {
    if (characters.length === 0) {
      setNodes([]);
      setEdges([]);
      return;
    }

    const centerX = 400;
    const centerY = 300;
    const radius = Math.min(250, 150 + characters.length * 20);

    const characterNodes: CharacterNode[] = characters.map((char, index) => {
      const angle = (index / characters.length) * 2 * Math.PI - Math.PI / 2;
      const x = centerX + radius * Math.cos(angle);
      const y = centerY + radius * Math.sin(angle);

      const relationshipCount = char.relationships?.length || 0;
      const isSelected = char.id === selectedCharacterId;

      return {
        id: char.id,
        type: 'default',
        position: { x, y },
        data: {
          character: char,
          isSelected,
          label: (
            <div
              style={{
                padding: '14px 18px',
                background: isSelected ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : 'white',
                color: isSelected ? 'white' : 'black',
                borderRadius: '12px',
                border: isSelected ? '3px solid #667eea' : '2px solid #e5e7eb',
                cursor: 'pointer',
                minWidth: '130px',
                textAlign: 'center',
                fontWeight: isSelected ? 'bold' : '600',
                boxShadow: isSelected ? '0 8px 20px rgba(102, 126, 234, 0.3)' : '0 2px 8px rgba(0,0,0,0.1)',
                transition: 'all 0.3s ease',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <div style={{ fontSize: '28px' }}>{char.emoji}</div>
              <div style={{ fontSize: '15px', fontWeight: 'bold', lineHeight: '1.2' }}>
                {char.name}
              </div>
              {char.korean_name && (
                <div style={{
                  fontSize: '11px',
                  opacity: 0.8,
                  fontWeight: 'normal'
                }}>
                  {char.korean_name}
                </div>
              )}
              {relationshipCount > 0 && (
                <div style={{
                  fontSize: '10px',
                  opacity: 0.7,
                  marginTop: '2px',
                  padding: '2px 6px',
                  background: isSelected ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.05)',
                  borderRadius: '4px'
                }}>
                  {relationshipCount} {relationshipCount === 1 ? 'relation' : 'relations'}
                </div>
              )}
            </div>
          ),
        },
      };
    });

    const relationshipEdges: RelationshipEdge[] = [];
    const processedPairs = new Set<string>();

    characters.forEach((char) => {
      if (!char.relationships || char.relationships.length === 0) return;

      char.relationships.forEach((rel) => {
        const targetChar = characters.find(
          (c) => c.name.toLowerCase().trim() === rel.character_name.toLowerCase().trim() ||
                 c.korean_name?.toLowerCase().trim() === rel.character_name.toLowerCase().trim() ||
                 c.english_name?.toLowerCase().trim() === rel.character_name.toLowerCase().trim()
        );

        if (targetChar) {
          const pairKey1 = `${char.id}-${targetChar.id}`;
          const pairKey2 = `${targetChar.id}-${char.id}`;

          if (!processedPairs.has(pairKey1) && !processedPairs.has(pairKey2)) {
            processedPairs.add(pairKey1);

            const sentiment = rel.sentiment || getRelationshipSentiment(rel.relationship_type);
            const color = getSentimentColor(sentiment);

            relationshipEdges.push({
              id: `${char.id}-${targetChar.id}`,
              source: char.id,
              target: targetChar.id,
              label: rel.relationship_type,
              animated: sentiment !== 'neutral',
              style: {
                stroke: color,
                strokeWidth: sentiment === 'neutral' ? 2 : 3,
              },
              labelStyle: {
                fill: color,
                fontWeight: 600,
                fontSize: 13,
              },
              labelBgStyle: {
                fill: 'white',
                fillOpacity: 0.95,
                rx: 4,
                ry: 4,
              },
              labelBgPadding: [8, 6],
              markerEnd: {
                type: MarkerType.ArrowClosed,
                width: 22,
                height: 22,
                color: color,
              },
              data: {
                relationship: rel.relationship_type,
                description: rel.description,
                sentiment,
              },
            });
          }
        } else {
          console.warn(`Relationship target not found: "${rel.character_name}" for character "${char.name}"`);
        }
      });
    });

    console.log(`Characters: ${characters.length}, Edges: ${relationshipEdges.length}`);

    setNodes(characterNodes);
    setEdges(relationshipEdges);
  }, [characters, selectedCharacterId]);

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      {characters.length === 0 ? (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          color: '#999',
          fontSize: '16px'
        }}>
          No characters to display
        </div>
      ) : (
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodeClick={(_, node) => {
            const charNode = node as CharacterNode;
            onCharacterSelect(charNode.data.character);
          }}
          fitView
          attributionPosition="bottom-left"
          minZoom={0.5}
          maxZoom={2}
        >
          <Background variant={BackgroundVariant.Dots} gap={16} size={1} color="#e5e7eb" />
          <Controls />
        </ReactFlow>
      )}

      <div style={{
        position: 'absolute',
        top: '10px',
        left: '10px',
        background: 'white',
        padding: '12px 16px',
        borderRadius: '10px',
        boxShadow: '0 2px 12px rgba(0,0,0,0.12)',
        fontSize: '12px',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        zIndex: 10
      }}>
        <div style={{ fontWeight: 'bold', fontSize: '13px', marginBottom: '2px' }}>Relationship Types</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: '24px', height: '3px', background: '#22c55e', borderRadius: '2px' }} />
          <span>Positive (친구, 가족, 연인)</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: '24px', height: '3px', background: '#ef4444', borderRadius: '2px' }} />
          <span>Negative (적, 라이벌)</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: '24px', height: '2px', background: '#6b7280', borderRadius: '2px' }} />
          <span>Neutral</span>
        </div>
      </div>

      {edges.length === 0 && characters.length > 0 && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          background: 'rgba(255, 255, 255, 0.95)',
          padding: '20px 30px',
          borderRadius: '12px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          textAlign: 'center',
          zIndex: 5
        }}>
          <div style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '8px', color: '#667eea' }}>
            No relationships found
          </div>
          <div style={{ fontSize: '13px', color: '#666' }}>
            Relationships will appear after processing the text
          </div>
        </div>
      )}
    </div>
  );
}
