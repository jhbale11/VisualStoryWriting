import { Background, BackgroundVariant, Controls, Edge, MarkerType, Node, ReactFlow } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useEffect, useMemo, useState } from 'react';
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
  const positiveKeywords = ['친구', '연인', '가족', '동료', '스승', '제자', 'friend', 'ally', 'lover', 'family', 'mentor', '좋아', '사랑', '존경', '신뢰'];
  const negativeKeywords = ['적', '라이벌', '싫어', '미워', '원수', 'enemy', 'rival', 'hate', 'antagonist', '질투', '증오', '반목'];

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
    if (characters.length === 0) return;

    const centerX = 400;
    const centerY = 300;
    const radius = Math.min(250, 150 + characters.length * 20);

    const characterNodes: CharacterNode[] = characters.map((char, index) => {
      const angle = (index / characters.length) * 2 * Math.PI - Math.PI / 2;
      const x = centerX + radius * Math.cos(angle);
      const y = centerY + radius * Math.sin(angle);

      const relationshipCount = char.relationships.length;
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
                padding: '12px 16px',
                background: isSelected ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : 'white',
                color: isSelected ? 'white' : 'black',
                borderRadius: '12px',
                border: isSelected ? '3px solid #667eea' : '2px solid #e5e7eb',
                cursor: 'pointer',
                minWidth: '120px',
                textAlign: 'center',
                fontWeight: isSelected ? 'bold' : '600',
                boxShadow: isSelected ? '0 8px 20px rgba(102, 126, 234, 0.3)' : '0 2px 8px rgba(0,0,0,0.1)',
                transition: 'all 0.3s ease',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              <div style={{ fontSize: '24px' }}>{char.emoji}</div>
              <div style={{ fontSize: '14px', fontWeight: 'bold' }}>{char.name}</div>
              {relationshipCount > 0 && (
                <div style={{
                  fontSize: '10px',
                  opacity: 0.7,
                  marginTop: '2px'
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
      char.relationships.forEach((rel) => {
        const targetChar = characters.find(
          (c) => c.name.toLowerCase() === rel.character_name.toLowerCase()
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
                fontSize: 12,
              },
              labelBgStyle: {
                fill: 'white',
                fillOpacity: 0.9,
              },
              markerEnd: {
                type: MarkerType.ArrowClosed,
                width: 20,
                height: 20,
                color: color,
              },
              data: {
                relationship: rel.relationship_type,
                description: rel.description,
                sentiment,
              },
            });
          }
        }
      });
    });

    setNodes(characterNodes);
    setEdges(relationshipEdges);
  }, [characters, selectedCharacterId]);

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
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

      <div style={{
        position: 'absolute',
        top: '10px',
        left: '10px',
        background: 'white',
        padding: '10px 15px',
        borderRadius: '8px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        fontSize: '12px',
        display: 'flex',
        flexDirection: 'column',
        gap: '6px'
      }}>
        <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>Relationship Legend</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: '20px', height: '3px', background: '#22c55e' }} />
          <span>Positive</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: '20px', height: '3px', background: '#ef4444' }} />
          <span>Negative</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: '20px', height: '2px', background: '#6b7280' }} />
          <span>Neutral</span>
        </div>
      </div>
    </div>
  );
}
