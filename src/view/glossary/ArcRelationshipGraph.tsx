import { Background, BackgroundVariant, Controls, Edge, MarkerType, Node, ReactFlow, applyNodeChanges, NodeChange } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useEffect, useState, useMemo } from 'react';
import { GlossaryCharacter, GlossaryArc } from '../../model/GlossaryModel';
import { Card, CardBody, Chip } from '@nextui-org/react';
import RelationshipEdgeComponent from './RelationshipEdgeComponent';

interface CharacterNode extends Node {
  data: {
    character: GlossaryCharacter;
    emoji: string;
    name: string;
    label: JSX.Element;
  };
}

interface Props {
  arc: GlossaryArc;
  characters: GlossaryCharacter[];
}

interface RelationshipEdge extends Edge {
  data: {
    relationship: string;
    description: string;
    sentiment: 'positive' | 'negative' | 'neutral';
    sourceCharacter: string;
    targetCharacter: string;
    addressing?: string;
  };
}

const getSentimentColor = (sentiment: 'positive' | 'negative' | 'neutral'): string => {
  switch (sentiment) {
    case 'positive':
      return '#22c55e'; // green
    case 'negative':
      return '#ef4444'; // red
    case 'neutral':
      return '#6b7280'; // gray
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

const edgeTypes = {
  relationshipEdge: RelationshipEdgeComponent as any,
};

export default function ArcRelationshipGraph({ arc, characters }: Props) {
  const [nodes, setNodes] = useState<CharacterNode[]>([]);
  const [edges, setEdges] = useState<RelationshipEdge[]>([]);
  const [selectedEdge, setSelectedEdge] = useState<RelationshipEdge | null>(null);
  const [positions, setPositions] = useState<Record<string, { x: number, y: number }>>(() => {
    try {
      const key = `vsw.arc.${arc.id}.positions`;
      const raw = localStorage.getItem(key) || '{}';
      return JSON.parse(raw);
    } catch { return {}; }
  });

  // Get characters in this arc - use arc.characters directly since they're complete GlossaryCharacter objects
  const arcCharacters = useMemo(() => {
    console.log(`🔍 ArcRelationshipGraph - Getting characters for arc: ${arc.name}`);
    console.log(`   - Arc has ${arc.characters?.length || 0} characters`);
    console.log(`   - Characters prop has ${characters.length} characters`);
    
    // arc.characters are already complete GlossaryCharacter objects
    const validChars = (arc.characters || []).filter(char => 
      char && char.name && typeof char === 'object'
    );
    
    console.log(`   - Valid characters: ${validChars.length}`);
    validChars.forEach((char, i) => {
      console.log(`     ${i + 1}. ${char.name} (${char.korean_name || 'no korean name'})`);
    });
    
    return validChars;
  }, [arc, characters]);

  // Build nodes and edges
  useEffect(() => {
    console.log(`🎨 Building Arc Relationship Graph for: ${arc.name}`);
    console.log(`   - Arc characters: ${arcCharacters.length}`);
    console.log(`   - Arc relationships: ${arc.relationships?.length || 0}`);
    
    if (!arc || arcCharacters.length === 0) {
      setNodes([]);
      setEdges([]);
      return;
    }
    
    if (!arc.relationships || arc.relationships.length === 0) {
      console.warn(`⚠️ No relationships found in arc: ${arc.name}`);
    }

    // Create nodes in a circular layout
    const centerX = 400;
    const centerY = 300;
    const radius = Math.min(250, 100 + arcCharacters.length * 20);

    const newNodes: CharacterNode[] = arcCharacters.map((char, idx) => {
      const angle = (idx / arcCharacters.length) * 2 * Math.PI - Math.PI / 2;
      const defaultX = centerX + radius * Math.cos(angle);
      const defaultY = centerY + radius * Math.sin(angle);
      
      const savedPos = positions[char.id];
      
      // Count relationships for this character
      const relationshipCount = (arc.relationships || []).filter(rel => 
        rel.character_a === char.name || rel.character_a === char.korean_name ||
        rel.character_b === char.name || rel.character_b === char.korean_name
      ).length;
      
      return {
        id: char.id,
        type: 'default',
        position: savedPos || { x: defaultX, y: defaultY },
        data: {
          character: char,
          emoji: char.emoji,
          name: char.name,
          label: (
            <div style={{
              padding: '14px 18px',
              background: 'white',
              border: '2px solid #667eea',
              borderRadius: '12px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
              cursor: 'grab',
              minWidth: '130px',
              textAlign: 'center',
              transition: 'all 0.3s ease'
            }}>
              <div style={{ fontSize: '28px', marginBottom: '6px' }}>{char.emoji}</div>
              <div style={{ fontSize: '15px', fontWeight: 'bold', color: '#333', lineHeight: '1.2' }}>
                {char.name}
              </div>
              {char.korean_name && (
                <div style={{ fontSize: '11px', color: '#888', marginTop: '4px', opacity: 0.8 }}>
                  {char.korean_name}
                </div>
              )}
              {relationshipCount > 0 && (
                <div style={{
                  fontSize: '10px',
                  marginTop: '4px',
                  padding: '2px 6px',
                  background: 'rgba(102, 126, 234, 0.1)',
                  borderRadius: '4px',
                  color: '#667eea'
                }}>
                  {relationshipCount} {relationshipCount === 1 ? 'relation' : 'relations'}
                </div>
              )}
            </div>
          ),
        },
      };
    });

    // Create edges from relationships
    console.log(`🔗 Creating edges from ${arc.relationships?.length || 0} relationships`);
    const newEdges: RelationshipEdge[] = (arc.relationships || [])
      .map((rel, idx) => {
        console.log(`   Processing relationship ${idx}: ${rel.character_a} → ${rel.character_b}`);
        console.log(`      Type: ${rel.relationship_type}, Addressing: ${rel.addressing || 'none'}`);
        
        const sourceNode = newNodes.find(n => 
          n.data.character.name.toLowerCase() === rel.character_a.toLowerCase() ||
          n.data.character.korean_name?.toLowerCase() === rel.character_a.toLowerCase()
        );
        const targetNode = newNodes.find(n => 
          n.data.character.name.toLowerCase() === rel.character_b.toLowerCase() ||
          n.data.character.korean_name?.toLowerCase() === rel.character_b.toLowerCase()
        );

        if (!sourceNode || !targetNode) {
          console.warn(`⚠️ Relationship character not found: "${rel.character_a}" or "${rel.character_b}"`);
          console.warn(`   Available characters: ${newNodes.map(n => n.data.character.name).join(', ')}`);
          return null;
        }
        
        console.log(`   ✅ Edge created: ${sourceNode.data.character.name} → ${targetNode.data.character.name}`);

        const sentiment = rel.sentiment || 'neutral';
        const color = getSentimentColor(sentiment);
        
        // Create label with addressing info if available
        const labelText = rel.addressing 
          ? `${rel.relationship_type}\n[${rel.addressing}]`
          : rel.relationship_type;

        return {
          id: `rel-${idx}`,
          type: 'relationshipEdge',
          source: sourceNode.id,
          target: targetNode.id,
          label: labelText,
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
          labelBgPadding: [10, 8] as [number, number],
          markerEnd: {
            type: MarkerType.ArrowClosed,
            width: 24,
            height: 24,
            color: color,
          },
          data: {
            relationship: rel.relationship_type,
            description: rel.description,
            sentiment: sentiment,
            sourceCharacter: sourceNode.data.character.name,
            targetCharacter: targetNode.data.character.name,
            addressing: rel.addressing,
          },
        };
      })
      .filter(Boolean) as RelationshipEdge[];

    console.log(`📊 Final result: ${newNodes.length} nodes, ${newEdges.length} edges`);
    
    setNodes(newNodes);
    setEdges(newEdges);
  }, [arc, arcCharacters]);

  const onNodesChange = (changes: NodeChange[]) => {
    setNodes((nds) => applyNodeChanges(changes, nds) as CharacterNode[]);
    
    // Save positions on position change
    const moved = changes.filter((c: any) => c.type === 'position' && c.position);
    if (moved.length > 0) {
      setPositions((prev) => {
        const next = { ...prev };
        moved.forEach((m: any) => {
          next[m.id] = { x: m.position.x, y: m.position.y };
        });
        
        try {
          const key = `vsw.arc.${arc.id}.positions`;
          localStorage.setItem(key, JSON.stringify(next));
        } catch (e) {
          console.error('Failed to save positions:', e);
        }
        
        return next;
      });
    }
  };

  // Count relationships by sentiment
  const positiveCount = edges.filter(e => e.data.sentiment === 'positive').length;
  const negativeCount = edges.filter(e => e.data.sentiment === 'negative').length;
  const neutralCount = edges.filter(e => e.data.sentiment === 'neutral').length;

  if (!arc || !arc.relationships || arc.relationships.length === 0) {
    return (
      <div style={{
        padding: '40px',
        textAlign: 'center',
        color: '#999',
        background: 'white',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔗</div>
        <div>No relationships in this arc</div>
      </div>
    );
  }

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      {/* Arc Info Header */}
      <Card style={{ 
        position: 'absolute', 
        top: '10px', 
        left: '10px', 
        zIndex: 10, 
        maxWidth: '300px',
        background: 'rgba(255, 255, 255, 0.95)'
      }}>
        <CardBody>
          <div style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '8px', color: '#667eea' }}>
            {arc.name}
          </div>
          <div style={{ fontSize: '11px', color: '#666', marginBottom: '10px', lineHeight: 1.4 }}>
            {arc.description}
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', fontSize: '11px' }}>
            <Chip size="sm" color="success" variant="flat">
              💚 {positiveCount}
            </Chip>
            <Chip size="sm" color="danger" variant="flat">
              ⚔️ {negativeCount}
            </Chip>
            <Chip size="sm" color="default" variant="flat">
              🤝 {neutralCount}
            </Chip>
          </div>
        </CardBody>
      </Card>

      {/* Legend */}
      <div style={{
        position: 'absolute',
        bottom: '10px',
        left: '10px',
        zIndex: 10,
        background: 'rgba(255, 255, 255, 0.95)',
        padding: '12px 16px',
        borderRadius: '10px',
        boxShadow: '0 2px 12px rgba(0,0,0,0.12)',
        fontSize: '12px'
      }}>
        <div style={{ fontWeight: 'bold', fontSize: '13px', marginBottom: '8px' }}>관계 유형</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
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
      </div>

      {/* Relationship Details (when edge is selected) */}
      {selectedEdge && (
        <Card style={{
          position: 'absolute',
          bottom: '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 20,
          maxWidth: '500px',
          width: '90%',
          background: 'rgba(255, 255, 255, 0.98)',
          border: `3px solid ${getSentimentColor(selectedEdge.data.sentiment)}`
        }}>
          <CardBody>
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

            {selectedEdge.data.addressing && (
              <div style={{ marginBottom: '12px' }}>
                <div style={{ fontSize: '12px', color: '#888', marginBottom: '6px', fontWeight: '600' }}>
                  💬 호칭
                </div>
                <div style={{
                  fontSize: '16px',
                  fontWeight: 'bold',
                  color: '#667eea',
                  background: '#f0f9ff',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  border: '2px solid #bfdbfe',
                  textAlign: 'center'
                }}>
                  {selectedEdge.data.sourceCharacter} → {selectedEdge.data.targetCharacter}: "{selectedEdge.data.addressing}"
                </div>
              </div>
            )}

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
          </CardBody>
        </Card>
      )}

      <ReactFlow
        nodes={nodes}
        edges={edges.map(e => ({ ...e, type: 'relationshipEdge' }))}
        nodesDraggable
        nodesConnectable={false}
        onNodesChange={onNodesChange}
        edgeTypes={edgeTypes}
        onEdgeClick={(_, edge) => {
          setSelectedEdge(edge as RelationshipEdge);
        }}
        onPaneClick={() => {
          setSelectedEdge(null);
        }}
        fitView
        attributionPosition="bottom-right"
        minZoom={0.3}
        maxZoom={1.5}
      >
        <Background variant={BackgroundVariant.Dots} gap={16} size={1} color="#e5e7eb" />
        <Controls />
      </ReactFlow>

      {/* No relationships message */}
      {edges.length === 0 && arcCharacters.length > 0 && (
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
            이 Arc에 인물 간 관계가 표시되지 않았습니다
          </div>
        </div>
      )}
    </div>
  );
}

