import { Background, BackgroundVariant, Controls, Edge, MarkerType, Node, ReactFlow, applyNodeChanges } from '@xyflow/react';
import RelationshipEdgeComponent from './RelationshipEdgeComponent';
import '@xyflow/react/dist/style.css';
import { useEffect, useState } from 'react';
import { GlossaryCharacter, GlossaryArc, useGlossaryStore } from '../../model/GlossaryModel';
import { Chip } from '@nextui-org/react';

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
    sourceCharacter: string;
    targetCharacter: string;
  };
}

const getRelationshipSentiment = (relType: string): 'positive' | 'negative' | 'neutral' => {
  const positiveKeywords = ['친구', '연인', '가족', '동료', '스승', '제자', 'friend', 'ally', 'lover', 'family', 'mentor', '좋아', '사랑', '존경', '신뢰', '부모', '자식', '형제', '자매', '파트너'];
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

const getSentimentLabel = (sentiment: 'positive' | 'negative' | 'neutral'): string => {
  switch (sentiment) {
    case 'positive':
      return '긍정적';
    case 'negative':
      return '부정적';
    case 'neutral':
      return '중립적';
  }
};

export default function CharacterRelationshipGraph({
  characters,
  onCharacterSelect,
  selectedCharacterId,
}: Props) {
  const [nodes, setNodes] = useState<CharacterNode[]>([]);
  const [edges, setEdges] = useState<RelationshipEdge[]>([]);
  const [selectedEdge, setSelectedEdge] = useState<RelationshipEdge | null>(null);
  const [selectedArcId, setSelectedArcId] = useState<string | null>(null);
  const [positions, setPositions] = useState<Record<string, { x: number, y: number }>>(() => {
    try {
      const raw = localStorage.getItem('vsw.relations.positions') || '{}';
      return JSON.parse(raw);
    } catch { return {}; }
  });

  const arcs = useGlossaryStore((state) => state.arcs);

  // Filter characters by selected arc
  const filteredCharacters = selectedArcId
    ? (() => {
        const selectedArc = arcs.find(a => a.id === selectedArcId);
        if (!selectedArc) return characters;
        return characters.filter(char =>
          selectedArc.characters.some(arcChar => {
            const charName = typeof arcChar === 'string' ? arcChar : arcChar.name;
            return charName.toLowerCase() === char.name.toLowerCase() ||
                   charName.toLowerCase() === char.korean_name?.toLowerCase();
          })
        );
      })()
    : characters;

  useEffect(() => {
    if (filteredCharacters.length === 0) {
      setNodes([]);
      setEdges([]);
      return;
    }

    const centerX = 400;
    const centerY = 300;
    const radius = Math.min(250, 150 + filteredCharacters.length * 20);

    const characterNodes: CharacterNode[] = filteredCharacters.map((char, index) => {
      const saved = positions[char.id];
      const angle = (index / Math.max(filteredCharacters.length,1)) * 2 * Math.PI - Math.PI / 2;
      const x = saved ? saved.x : centerX + radius * Math.cos(angle);
      const y = saved ? saved.y : centerY + radius * Math.sin(angle);

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

    // Filter relationships by selected arc
    const selectedArc = selectedArcId ? arcs.find(a => a.id === selectedArcId) : null;

    filteredCharacters.forEach((char) => {
      if (!char.relationships || char.relationships.length === 0) return;

      char.relationships
        .filter(rel => {
          // If an arc is selected, only show relationships for that arc
          if (!selectedArc) return true;
          return !rel.arc_id || rel.arc_id === selectedArc.name || rel.arc_id === selectedArc.id;
        })
        .forEach((rel) => {
        const targetChar = filteredCharacters.find(
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
              animated: false,
              style: {
                stroke: color,
                strokeWidth: sentiment === 'neutral' ? 2.5 : 3.5,
              },
              labelStyle: {
                fill: color,
                fontWeight: 700,
                fontSize: 13,
              },
              labelBgStyle: {
                fill: 'white',
                fillOpacity: 0.95,
              },
              labelBgPadding: [10, 8],
              markerEnd: {
                type: MarkerType.ArrowClosed,
                width: 24,
                height: 24,
                color: color,
              },
              data: {
                relationship: rel.relationship_type,
                description: rel.description,
                sentiment,
                sourceCharacter: char.name,
                targetCharacter: targetChar.name,
              },
            });
          }
        } else {
          console.warn(`Relationship target not found: "${rel.character_name}" for character "${char.name}"`);
        }
      });
    });

    console.log(`Characters: ${filteredCharacters.length}, Edges: ${relationshipEdges.length}`);

    setNodes(characterNodes);
    setEdges(relationshipEdges);
  }, [filteredCharacters, selectedCharacterId, selectedArcId, arcs]);

  const onNodesChange = (changes: any) => {
    setNodes((nds) => applyNodeChanges(changes, nds));
    const moved = changes.filter((c: any) => c.type === 'position' && c.position);
    if (moved.length > 0) {
      setPositions((prev) => {
        const next = { ...prev };
        moved.forEach((m: any) => {
          next[m.id] = { x: m.position.x, y: m.position.y };
        });
        try { localStorage.setItem('vsw.relations.positions', JSON.stringify(next)); } catch {}
        return next;
      });
    }
  };

  const edgeTypes = { relationshipEdge: RelationshipEdgeComponent as any };

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      {/* Arc filter chips */}
      {arcs.length > 0 && (
        <div style={{
          position: 'absolute',
          top: '10px',
          right: '10px',
          zIndex: 10,
          display: 'flex',
          gap: '8px',
          flexWrap: 'wrap',
          maxWidth: '400px',
          justifyContent: 'flex-end'
        }}>
          <Chip
            color={!selectedArcId ? 'secondary' : 'default'}
            variant={!selectedArcId ? 'solid' : 'bordered'}
            onClick={() => setSelectedArcId(null)}
            style={{ cursor: 'pointer' }}
          >
            All Characters
          </Chip>
          {arcs.map((arc) => (
            <Chip
              key={arc.id}
              color={selectedArcId === arc.id ? 'secondary' : 'default'}
              variant={selectedArcId === arc.id ? 'solid' : 'bordered'}
              onClick={() => setSelectedArcId(arc.id)}
              style={{ cursor: 'pointer' }}
            >
              {arc.name}
            </Chip>
          ))}
        </div>
      )}

      {filteredCharacters.length === 0 ? (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          color: '#999',
          fontSize: '16px'
        }}>
          {selectedArcId ? 'No characters in this arc' : 'No characters to display'}
        </div>
      ) : (
        <ReactFlow
          nodes={nodes}
          edges={edges.map(e => ({ ...e, type: 'relationshipEdge' }))}
          nodesDraggable
          nodesConnectable={false}
          onNodesChange={onNodesChange}
          onNodeClick={(_, node) => {
            const charNode = node as CharacterNode;
            onCharacterSelect(charNode.data.character);
            setSelectedEdge(null);
          }}
          edgeTypes={edgeTypes as any}
          onEdgeClick={(_, edge) => {
            setSelectedEdge(edge as RelationshipEdge);
          }}
          onPaneClick={() => {
            setSelectedEdge(null);
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
        <div style={{ fontWeight: 'bold', fontSize: '13px', marginBottom: '2px' }}>관계 유형</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: '24px', height: '3px', background: '#22c55e', borderRadius: '2px' }} />
          <span>긍정적 (친구, 가족, 연인)</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: '24px', height: '3px', background: '#ef4444', borderRadius: '2px' }} />
          <span>부정적 (적, 라이벌)</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: '24px', height: '2px', background: '#6b7280', borderRadius: '2px' }} />
          <span>중립적</span>
        </div>
      </div>

      {selectedEdge && (
        <div style={{
          position: 'absolute',
          bottom: '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'white',
          padding: '20px 24px',
          borderRadius: '12px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
          maxWidth: '500px',
          width: '90%',
          zIndex: 20,
          border: `3px solid ${getSentimentColor(selectedEdge.data.sentiment)}`
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'start',
            marginBottom: '12px'
          }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '12px', color: '#888', marginBottom: '4px' }}>관계</div>
              <div style={{
                fontSize: '18px',
                fontWeight: 'bold',
                color: getSentimentColor(selectedEdge.data.sentiment),
                marginBottom: '8px'
              }}>
                {selectedEdge.data.relationship}
              </div>
            </div>
            <button
              onClick={() => setSelectedEdge(null)}
              style={{
                background: 'none',
                border: 'none',
                fontSize: '24px',
                cursor: 'pointer',
                color: '#999',
                padding: '0',
                width: '30px',
                height: '30px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              ×
            </button>
          </div>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            marginBottom: '12px',
            padding: '10px',
            background: '#f9fafb',
            borderRadius: '8px'
          }}>
            <div style={{ fontSize: '14px', fontWeight: '600' }}>
              {selectedEdge.data.sourceCharacter}
            </div>
            <div style={{
              fontSize: '20px',
              color: getSentimentColor(selectedEdge.data.sentiment)
            }}>
              ↔
            </div>
            <div style={{ fontSize: '14px', fontWeight: '600' }}>
              {selectedEdge.data.targetCharacter}
            </div>
          </div>

          <div style={{
            display: 'inline-block',
            padding: '4px 10px',
            borderRadius: '6px',
            fontSize: '12px',
            fontWeight: '600',
            marginBottom: '12px',
            background: `${getSentimentColor(selectedEdge.data.sentiment)}20`,
            color: getSentimentColor(selectedEdge.data.sentiment)
          }}>
            {getSentimentLabel(selectedEdge.data.sentiment)} 관계
          </div>

          {selectedEdge.data.description && (
            <div>
              <div style={{ fontSize: '12px', color: '#888', marginBottom: '6px', fontWeight: '600' }}>
                관계 설명
              </div>
              <div style={{
                fontSize: '14px',
                lineHeight: '1.6',
                color: '#333',
                background: '#f9fafb',
                padding: '12px',
                borderRadius: '8px',
                borderLeft: `4px solid ${getSentimentColor(selectedEdge.data.sentiment)}`
              }}>
                {selectedEdge.data.description}
              </div>
            </div>
          )}
        </div>
      )}

      {edges.length === 0 && filteredCharacters.length > 0 && (
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
            관계 정보 없음
          </div>
          <div style={{ fontSize: '13px', color: '#666' }}>
            텍스트 처리 후 인물 간 관계가 표시됩니다
          </div>
        </div>
      )}
    </div>
  );
}
