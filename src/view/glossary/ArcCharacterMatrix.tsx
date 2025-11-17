import { Card, CardBody, CardHeader, Chip, Divider } from '@nextui-org/react';
import { GlossaryArc, GlossaryCharacter } from '../../model/GlossaryModel';

interface Props {
  arcs: GlossaryArc[];
  characters: GlossaryCharacter[];
  selectedArcId?: string | null;
  onArcSelect: (arcId: string | null) => void;
  onCharacterSelect: (characterId: string) => void;
}

export default function ArcCharacterMatrix({
  arcs,
  characters,
  selectedArcId,
  onArcSelect,
  onCharacterSelect,
}: Props) {
  if (arcs.length === 0) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        padding: '40px',
        textAlign: 'center',
        color: '#999'
      }}>
        <div>
          <div style={{ fontSize: '48px', marginBottom: '20px' }}>📖</div>
          <div style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '8px' }}>No Arcs Found</div>
          <div style={{ fontSize: '13px' }}>
            Arcs will be automatically extracted when you process text.
            <br />
            Each arc represents a major story phase or chapter.
          </div>
        </div>
      </div>
    );
  }

  // Check which characters appear in which arcs
  const characterArcAppearance: Record<string, Set<string>> = {};
  characters.forEach(char => {
    characterArcAppearance[char.id] = new Set();
    arcs.forEach(arc => {
      const appearsInArc = arc.characters.some(arcChar => {
        const charName = typeof arcChar === 'string' ? arcChar : arcChar.name;
        return charName.toLowerCase() === char.name.toLowerCase() ||
               charName.toLowerCase() === char.korean_name?.toLowerCase();
      });
      if (appearsInArc) {
        characterArcAppearance[char.id].add(arc.id);
      }
    });
  });

  // Count relationships per arc (from arc's own relationship data)
  const arcRelationshipCount: Record<string, number> = {};
  arcs.forEach(arc => {
    arcRelationshipCount[arc.id] = arc.relationships.length;
  });

  const selectedArc = selectedArcId ? arcs.find(a => a.id === selectedArcId) : null;
  const filteredCharacters = selectedArcId
    ? characters.filter(char => characterArcAppearance[char.id]?.has(selectedArcId))
    : characters;

  return (
    <div style={{ 
      width: '100%', 
      height: '100%', 
      display: 'flex', 
      flexDirection: 'column',
      background: '#f9fafb',
      overflowY: 'auto'
    }}>
      {/* Arc Selection */}
      <div style={{ 
        padding: '20px', 
        background: 'white',
        borderBottom: '2px solid #e5e7eb',
        position: 'sticky',
        top: 0,
        zIndex: 10
      }}>
        <h3 style={{ 
          fontSize: '16px', 
          fontWeight: 'bold', 
          marginBottom: '12px',
          color: '#667eea'
        }}>
          Story Arcs
        </h3>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <Chip
            onClick={() => onArcSelect(null)}
            color={!selectedArcId ? 'secondary' : 'default'}
            variant={!selectedArcId ? 'solid' : 'bordered'}
            size="md"
            style={{ cursor: 'pointer' }}
          >
            All Arcs
          </Chip>
          {arcs.map((arc) => (
            <Chip
              key={arc.id}
              onClick={() => onArcSelect(arc.id)}
              color={selectedArcId === arc.id ? 'secondary' : 'default'}
              variant={selectedArcId === arc.id ? 'solid' : 'bordered'}
              size="md"
              style={{ cursor: 'pointer' }}
            >
              {arc.name}
            </Chip>
          ))}
        </div>
      </div>

      {/* Arc Details (if selected) */}
      {selectedArc && (
        <div style={{ padding: '20px', background: 'white', marginBottom: '10px' }}>
          <Card style={{ background: 'linear-gradient(135deg, #667eea22 0%, #764ba222 100%)' }}>
            <CardHeader>
              <div style={{ width: '100%' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                  <div style={{ fontSize: '16px', color: '#667eea', fontWeight: 'bold' }}>
                    {selectedArc.name}
                  </div>
                  {selectedArc.theme && (
                    <Chip size="sm" variant="flat" color="secondary">
                      {selectedArc.theme}
                    </Chip>
                  )}
                </div>
                <div style={{ fontSize: '13px', color: '#666', marginBottom: '12px' }}>
                  {selectedArc.description}
                </div>
              </div>
            </CardHeader>
            <Divider />
            <CardBody>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                {/* Stats */}
                <div style={{ display: 'flex', gap: '20px', fontSize: '12px', flexWrap: 'wrap' }}>
                  <div>
                    <span style={{ color: '#888' }}>Characters: </span>
                    <span style={{ fontWeight: 'bold', color: '#667eea' }}>
                      {filteredCharacters.length}
                    </span>
                  </div>
                  <div>
                    <span style={{ color: '#888' }}>Relationships: </span>
                    <span style={{ fontWeight: 'bold', color: '#667eea' }}>
                      {arcRelationshipCount[selectedArc.id] || 0}
                    </span>
                  </div>
                  <div>
                    <span style={{ color: '#888' }}>Key Events: </span>
                    <span style={{ fontWeight: 'bold', color: '#667eea' }}>
                      {selectedArc.key_events.length}
                    </span>
                  </div>
                  <div>
                    <span style={{ color: '#888' }}>Terms: </span>
                    <span style={{ fontWeight: 'bold', color: '#667eea' }}>
                      {selectedArc.terms.length}
                    </span>
                  </div>
                  <div>
                    <span style={{ color: '#888' }}>Chunks: </span>
                    <span style={{ fontWeight: 'bold', color: '#667eea' }}>
                      {selectedArc.start_chunk !== undefined ? selectedArc.start_chunk : '?'} - {selectedArc.end_chunk !== undefined ? selectedArc.end_chunk : '?'}
                    </span>
                  </div>
                </div>

                {/* Key Events */}
                {selectedArc.key_events.length > 0 && (
                  <div>
                    <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#888', marginBottom: '6px' }}>
                      Key Events:
                    </div>
                    <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '12px', color: '#555' }}>
                      {selectedArc.key_events.slice(0, 3).map((event, idx) => (
                        <li key={idx} style={{ marginBottom: '4px' }}>{event}</li>
                      ))}
                      {selectedArc.key_events.length > 3 && (
                        <li style={{ color: '#888', fontStyle: 'italic' }}>
                          +{selectedArc.key_events.length - 3} more...
                        </li>
                      )}
                    </ul>
                  </div>
                )}

                {/* Background Changes */}
                {selectedArc.background_changes && selectedArc.background_changes.length > 0 && (
                  <div>
                    <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#888', marginBottom: '6px' }}>
                      Background Changes:
                    </div>
                    <div style={{ fontSize: '12px', color: '#555' }}>
                      {selectedArc.background_changes.join(' • ')}
                    </div>
                  </div>
                )}

                {/* Arc-specific Terms */}
                {selectedArc.terms.length > 0 && (
                  <div>
                    <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#888', marginBottom: '6px' }}>
                      Translation Terms:
                    </div>
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                      {selectedArc.terms.slice(0, 5).map((term, idx) => (
                        <Chip key={idx} size="sm" variant="bordered" style={{ fontSize: '10px' }}>
                          {term.original} → {term.translation}
                        </Chip>
                      ))}
                      {selectedArc.terms.length > 5 && (
                        <Chip size="sm" variant="flat">
                          +{selectedArc.terms.length - 5} more
                        </Chip>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </CardBody>
          </Card>
        </div>
      )}

      {/* Character Arc Matrix */}
      <div style={{ padding: '20px', flex: 1 }}>
        <h4 style={{ 
          fontSize: '14px', 
          fontWeight: 'bold', 
          marginBottom: '15px',
          color: '#333'
        }}>
          {selectedArcId ? 'Characters in This Arc' : 'Character Appearances Across Arcs'}
        </h4>

        {filteredCharacters.length === 0 ? (
          <div style={{ 
            padding: '40px', 
            textAlign: 'center', 
            color: '#999',
            background: 'white',
            borderRadius: '12px'
          }}>
            No characters in this arc
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {filteredCharacters.map((char) => {
              const appearingArcs = Array.from(characterArcAppearance[char.id] || []);
              const relationshipCount = char.relationships.filter(rel => {
                if (!selectedArcId) return true;
                return !rel.arc_id || rel.arc_id === selectedArc?.name || rel.arc_id === selectedArc?.id;
              }).length;

              return (
                <Card
                  key={char.id}
                  isPressable
                  isHoverable
                  onClick={() => onCharacterSelect(char.id)}
                  style={{ 
                    cursor: 'pointer',
                    background: 'white',
                    transition: 'all 0.2s'
                  }}
                >
                  <CardBody>
                    <div style={{ display: 'flex', alignItems: 'start', gap: '12px' }}>
                      <div style={{ fontSize: '32px', marginTop: '-4px' }}>{char.emoji}</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ 
                          fontSize: '15px', 
                          fontWeight: 'bold',
                          marginBottom: '4px'
                        }}>
                          {char.name}
                        </div>
                        {char.korean_name && (
                          <div style={{ 
                            fontSize: '12px', 
                            color: '#888',
                            marginBottom: '8px'
                          }}>
                            {char.korean_name}
                          </div>
                        )}
                        <div style={{ 
                          fontSize: '12px', 
                          color: '#666',
                          marginBottom: '8px'
                        }}>
                          {char.description}
                        </div>
                        
                        {!selectedArcId && appearingArcs.length > 0 && (
                          <div style={{ marginTop: '8px' }}>
                            <div style={{ fontSize: '11px', color: '#888', marginBottom: '4px' }}>
                              Appears in:
                            </div>
                            <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                              {appearingArcs.map(arcId => {
                                const arc = arcs.find(a => a.id === arcId);
                                return arc ? (
                                  <Chip 
                                    key={arcId} 
                                    size="sm" 
                                    variant="flat" 
                                    color="primary"
                                    style={{ fontSize: '10px' }}
                                  >
                                    {arc.name}
                                  </Chip>
                                ) : null;
                              })}
                            </div>
                          </div>
                        )}

                        {relationshipCount > 0 && (
                          <div style={{ 
                            marginTop: '8px',
                            fontSize: '11px',
                            color: '#667eea',
                            fontWeight: '600'
                          }}>
                            {relationshipCount} relationship{relationshipCount > 1 ? 's' : ''}
                          </div>
                        )}
                      </div>
                      
                      {char.role && (
                        <Chip 
                          size="sm" 
                          color={
                            char.role === 'protagonist' ? 'secondary' :
                            char.role === 'antagonist' ? 'danger' :
                            char.role === 'major' ? 'primary' :
                            'default'
                          }
                          variant="flat"
                        >
                          {char.role}
                        </Chip>
                      )}
                    </div>
                  </CardBody>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Summary Stats */}
      {!selectedArcId && (
        <div style={{ 
          padding: '20px', 
          background: 'white',
          borderTop: '2px solid #e5e7eb'
        }}>
          <h4 style={{ 
            fontSize: '13px', 
            fontWeight: 'bold', 
            marginBottom: '12px',
            color: '#666'
          }}>
            Summary Statistics
          </h4>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
            <div style={{ 
              padding: '12px', 
              background: '#f9fafb', 
              borderRadius: '8px',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#667eea' }}>
                {arcs.length}
              </div>
              <div style={{ fontSize: '11px', color: '#888', marginTop: '4px' }}>
                Total Arcs
              </div>
            </div>
            <div style={{ 
              padding: '12px', 
              background: '#f9fafb', 
              borderRadius: '8px',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#667eea' }}>
                {characters.length}
              </div>
              <div style={{ fontSize: '11px', color: '#888', marginTop: '4px' }}>
                Total Characters
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

