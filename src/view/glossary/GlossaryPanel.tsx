import { Card, CardBody, CardHeader, Chip, Divider, Input, Textarea, Button, Select, SelectItem } from '@nextui-org/react';
import { useState } from 'react';
import { FiSearch, FiBook, FiMap, FiGrid, FiFileText, FiEdit3, FiFeather, FiPlus, FiTrash, FiUsers } from 'react-icons/fi';
import { GlossaryCharacter, GlossaryEvent, GlossaryArc, useGlossaryStore, StorySummary, StyleGuide } from '../../model/GlossaryModel';

interface Props {
  characters: GlossaryCharacter[];
  events: GlossaryEvent[];
  selectedCharacter: GlossaryCharacter | null;
  selectedEvent: GlossaryEvent | null;
  onCharacterSelect: (character: GlossaryCharacter) => void;
  onEventSelect: (event: GlossaryEvent) => void;
}

export default function GlossaryPanel({
  characters,
  events,
  selectedCharacter,
  selectedEvent,
  onCharacterSelect,
  onEventSelect,
}: Props) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'characters' | 'events' | 'summary' | 'arcs' | 'style' | 'features'>('characters');
  const [selectedArcId, setSelectedArcId] = useState<string | null>(null);
  
  const storySummary = useGlossaryStore((state) => state.story_summary);
  const keyEvents = useGlossaryStore((state) => state.key_events_and_arcs);
  const styleGuide = useGlossaryStore((state) => state.style_guide);
  const worldBuildingNotes = useGlossaryStore((state) => state.world_building_notes);
  const honorifics = useGlossaryStore((state) => state.honorifics);
  const recurringPhrases = useGlossaryStore((state) => state.recurring_phrases);
  const locations = useGlossaryStore((state) => state.locations);
  const terms = useGlossaryStore((state) => state.terms);
  const arcs = useGlossaryStore((state) => state.arcs);
  const updateArc = useGlossaryStore((state) => state.updateArc);
  const deleteArc = useGlossaryStore((state) => state.deleteArc);
  
  const updateStorySummary = useGlossaryStore((state) => state.updateStorySummary);
  const updateStyleGuide = useGlossaryStore((state) => state.updateStyleGuide);
  const addKeyEvent = useGlossaryStore((state) => state.addKeyEvent);
  const updateKeyEvent = useGlossaryStore((state) => state.updateKeyEvent);
  const deleteKeyEvent = useGlossaryStore((state) => state.deleteKeyEvent);
  const addWorldBuildingNote = useGlossaryStore((state) => state.addWorldBuildingNote);
  const updateWorldBuildingNote = useGlossaryStore((state) => state.updateWorldBuildingNote);
  const deleteWorldBuildingNote = useGlossaryStore((state) => state.deleteWorldBuildingNote);

  const filteredCharacters = characters.filter((char) =>
    char.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredEvents = events.filter((event) =>
    event.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div
      style={{
        width: '40%',
        height: '100%',
        background: 'white',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div style={{ padding: '20px', borderBottom: '1px solid #ddd' }}>
        <h2 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '15px' }}>
          Glossary
        </h2>

        <Input
          placeholder="Search..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          startContent={<FiSearch />}
          size="sm"
        />

        <div style={{ display: 'flex', gap: '8px', marginTop: '15px', flexWrap: 'wrap' }}>
          <Chip
            onClick={() => setActiveTab('summary')}
            color={activeTab === 'summary' ? 'secondary' : 'default'}
            variant={activeTab === 'summary' ? 'solid' : 'bordered'}
            style={{ cursor: 'pointer' }}
            startContent={<FiBook />}
          >
            Summary
          </Chip>
          <Chip
            onClick={() => setActiveTab('characters')}
            color={activeTab === 'characters' ? 'secondary' : 'default'}
            variant={activeTab === 'characters' ? 'solid' : 'bordered'}
            style={{ cursor: 'pointer' }}
          >
            Characters ({characters.length})
          </Chip>
          <Chip
            onClick={() => setActiveTab('events')}
            color={activeTab === 'events' ? 'secondary' : 'default'}
            variant={activeTab === 'events' ? 'solid' : 'bordered'}
            style={{ cursor: 'pointer' }}
          >
            Events ({events.length})
          </Chip>
          <Chip
            onClick={() => setActiveTab('arcs')}
            color={activeTab === 'arcs' ? 'secondary' : 'default'}
            variant={activeTab === 'arcs' ? 'solid' : 'bordered'}
            style={{ cursor: 'pointer' }}
            startContent={<FiMap />}
          >
            Story Arcs ({arcs.length})
          </Chip>
          <Chip
            onClick={() => setActiveTab('style')}
            color={activeTab === 'style' ? 'secondary' : 'default'}
            variant={activeTab === 'style' ? 'solid' : 'bordered'}
            style={{ cursor: 'pointer' }}
            startContent={<FiEdit3 />}
          >
            Style Guide
          </Chip>
          <Chip
            onClick={() => setActiveTab('features')}
            color={activeTab === 'features' ? 'secondary' : 'default'}
            variant={activeTab === 'features' ? 'solid' : 'bordered'}
            style={{ cursor: 'pointer' }}
            startContent={<FiFeather />}
          >
            Story Features
          </Chip>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
        {activeTab === 'characters' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            {filteredCharacters.map((char) => (
              <Card
                key={char.id}
                isPressable
                isHoverable
                onClick={() => onCharacterSelect(char)}
                style={{
                  background: selectedCharacter?.id === char.id ? '#f0f9ff' : 'white',
                  border:
                    selectedCharacter?.id === char.id
                      ? '2px solid #667eea'
                      : '1px solid #e0e0e0',
                  cursor: 'pointer',
                }}
              >
                <CardHeader>
                  <div>
                    <h3 style={{ fontWeight: 'bold', fontSize: '16px', margin: 0 }}>
                      {char.name}
                    </h3>
                    {char.korean_name && (
                      <p style={{ fontSize: '14px', color: '#888', margin: 0 }}>
                        {char.korean_name}
                      </p>
                    )}
                  </div>
                </CardHeader>
                <Divider />
                <CardBody>
                  <p style={{ fontSize: '14px', color: '#666', marginBottom: '10px' }}>
                    {char.description}
                  </p>

                  {char.traits.length > 0 && (
                    <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                      {char.traits.slice(0, 3).map((trait, idx) => (
                        <Chip key={idx} size="sm" variant="flat" color="secondary">
                          {trait}
                        </Chip>
                      ))}
                      {char.traits.length > 3 && (
                        <Chip size="sm" variant="flat">
                          +{char.traits.length - 3}
                        </Chip>
                      )}
                    </div>
                  )}

                  {char.relationships && char.relationships.length > 0 && (
                    <div style={{ marginTop: '12px' }}>
                      <p style={{ fontSize: '12px', color: '#888', fontWeight: 'bold', marginBottom: '8px' }}>
                        관계 ({char.relationships.length}):
                      </p>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {char.relationships.slice(0, 3).map((rel, idx) => {
                          const sentimentColor =
                            rel.sentiment === 'positive' ? '#22c55e' :
                            rel.sentiment === 'negative' ? '#ef4444' :
                            '#6b7280';
                          return (
                            <div key={idx} style={{
                              background: '#f9fafb',
                              padding: '8px 10px',
                              borderRadius: '8px',
                              borderLeft: `3px solid ${sentimentColor}`
                            }}>
                              <div style={{
                                fontSize: '13px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                marginBottom: '4px'
                              }}>
                                <span style={{ fontWeight: '700', color: '#333' }}>{rel.character_name}</span>
                                <span style={{ color: '#888' }}>·</span>
                                <span style={{ color: sentimentColor, fontWeight: '600' }}>{rel.relationship_type}</span>
                              </div>
                              {rel.description && (
                                <div style={{
                                  fontSize: '11px',
                                  color: '#666',
                                  lineHeight: '1.4',
                                  marginTop: '4px'
                                }}>
                                  {rel.description.length > 80
                                    ? rel.description.substring(0, 80) + '...'
                                    : rel.description}
                                </div>
                              )}
                            </div>
                          );
                        })}
                        {char.relationships.length > 3 && (
                          <span style={{ fontSize: '11px', color: '#888', paddingLeft: '10px' }}>
                            +{char.relationships.length - 3} more
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </CardBody>
              </Card>
            ))}
          </div>
        )}

        {activeTab === 'events' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            {filteredEvents.map((event) => (
              <Card
                key={event.id}
                isPressable
                isHoverable
                onClick={() => onEventSelect(event)}
                style={{
                  background: selectedEvent?.id === event.id ? '#f0f9ff' : 'white',
                  border:
                    selectedEvent?.id === event.id
                      ? '2px solid #667eea'
                      : '1px solid #e0e0e0',
                  cursor: 'pointer',
                }}
              >
                <CardHeader>
                  <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'start' }}>
                    <h3 style={{ fontWeight: 'bold', fontSize: '16px', margin: 0 }}>
                      {event.name}
                    </h3>
                    <Chip
                      size="sm"
                      color={event.importance === 'major' ? 'secondary' : 'default'}
                      variant="flat"
                    >
                      {event.importance}
                    </Chip>
                  </div>
                </CardHeader>
                <Divider />
                <CardBody>
                  <p style={{ fontSize: '14px', color: '#666', marginBottom: '10px' }}>
                    {event.description}
                  </p>

                  {event.characters_involved.length > 0 && (
                    <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                      {event.characters_involved.map((charName, idx) => (
                        <Chip key={idx} size="sm" variant="bordered">
                          {charName}
                        </Chip>
                      ))}
                    </div>
                  )}
                </CardBody>
              </Card>
            ))}
          </div>
        )}

        {activeTab === 'summary' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <Card>
              <CardHeader>
                <h3 style={{ fontWeight: 'bold', fontSize: '16px', margin: 0 }}>Story Summary</h3>
              </CardHeader>
              <Divider />
              <CardBody>
                <div style={{ marginBottom: '15px' }}>
                  <p style={{ fontSize: '12px', color: '#888', fontWeight: 'bold', marginBottom: '5px' }}>Logline:</p>
                  <p style={{ fontSize: '14px', color: '#333', fontStyle: storySummary.logline ? 'normal' : 'italic' }}>
                    {storySummary.logline || 'No logline yet. Process text chunks to generate.'}
                  </p>
                </div>
                <div>
                  <p style={{ fontSize: '12px', color: '#888', fontWeight: 'bold', marginBottom: '5px' }}>Blurb:</p>
                  <p style={{ fontSize: '14px', color: '#333', lineHeight: '1.6', fontStyle: storySummary.blurb ? 'normal' : 'italic' }}>
                    {storySummary.blurb || 'No blurb yet. Process text chunks to generate.'}
                  </p>
                </div>
              </CardBody>
            </Card>

            {worldBuildingNotes.length > 0 && (
              <Card>
                <CardHeader>
                  <h3 style={{ fontWeight: 'bold', fontSize: '16px', margin: 0 }}>World Building</h3>
                </CardHeader>
                <Divider />
                <CardBody>
                  <ul style={{ paddingLeft: '20px', margin: 0 }}>
                    {worldBuildingNotes.map((note, idx) => (
                      <li key={idx} style={{ fontSize: '14px', color: '#666', marginBottom: '8px' }}>
                        {note}
                      </li>
                    ))}
                  </ul>
                </CardBody>
              </Card>
            )}

            <Card>
              <CardHeader>
                <h3 style={{ fontWeight: 'bold', fontSize: '16px', margin: 0 }}>Locations ({locations.length})</h3>
              </CardHeader>
              <Divider />
              <CardBody>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {locations.map((loc) => (
                    <div key={loc.id} style={{ padding: '10px', background: '#f9fafb', borderRadius: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '5px' }}>
                        <span style={{ fontSize: '18px' }}>{loc.emoji}</span>
                        <span style={{ fontWeight: 'bold', fontSize: '14px' }}>{loc.name}</span>
                        {loc.korean_name && (
                          <span style={{ fontSize: '12px', color: '#888' }}>({loc.korean_name})</span>
                        )}
                      </div>
                      {loc.description && (
                        <p style={{ fontSize: '13px', color: '#666', marginBottom: '5px' }}>{loc.description}</p>
                      )}
                      {loc.atmosphere && (
                        <Chip size="sm" variant="flat" color="secondary" style={{ marginTop: '5px' }}>
                          {loc.atmosphere}
                        </Chip>
                      )}
                    </div>
                  ))}
                </div>
              </CardBody>
            </Card>

            <Card>
              <CardHeader>
                <h3 style={{ fontWeight: 'bold', fontSize: '16px', margin: 0 }}>Terms ({terms.length})</h3>
              </CardHeader>
              <Divider />
              <CardBody>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {terms.map((term) => (
                    <div key={term.id} style={{ padding: '10px', background: '#f9fafb', borderRadius: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '5px' }}>
                        <span style={{ fontWeight: 'bold', fontSize: '14px' }}>{term.original}</span>
                        <span style={{ color: '#888' }}>→</span>
                        <span style={{ fontSize: '14px', color: '#667eea' }}>{term.translation}</span>
                      </div>
                      {term.context && (
                        <p style={{ fontSize: '12px', color: '#666' }}>{term.context}</p>
                      )}
                      <Chip size="sm" variant="flat" style={{ marginTop: '5px' }}>
                        {term.category}
                      </Chip>
                    </div>
                  ))}
                </div>
              </CardBody>
            </Card>
          </div>
        )}

        {activeTab === 'arcs' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            {arcs.length === 0 ? (
              <Card>
                <CardBody>
                  <p style={{ fontSize: '14px', color: '#888', fontStyle: 'italic', textAlign: 'center', padding: '20px' }}>
                    No story arcs yet. Process text chunks to generate arc information.
                  </p>
                </CardBody>
              </Card>
            ) : (
              <>
                {arcs.map((arc) => (
                  <Card
                    key={arc.id}
                    isPressable
                    isHoverable
                    onClick={() => setSelectedArcId(selectedArcId === arc.id ? null : arc.id)}
                    style={{
                      background: selectedArcId === arc.id ? '#f0f9ff' : 'white',
                      border: selectedArcId === arc.id ? '2px solid #667eea' : '1px solid #e0e0e0',
                      cursor: 'pointer',
                    }}
                  >
                    <CardHeader>
                      <div style={{ width: '100%' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '8px' }}>
                          <h3 style={{ fontWeight: 'bold', fontSize: '16px', margin: 0 }}>
                            {arc.name}
                          </h3>
                          <Chip size="sm" variant="flat" color="secondary" startContent={<FiUsers />}>
                            {arc.characters.length} characters
                          </Chip>
                        </div>
                        {arc.start_chunk !== undefined && (
                          <p style={{ fontSize: '11px', color: '#888', margin: 0 }}>
                            Chunks {arc.start_chunk}{arc.end_chunk !== undefined ? ` - ${arc.end_chunk}` : '+'}
                          </p>
                        )}
                      </div>
                    </CardHeader>
                    <Divider />
                    <CardBody>
                      <p style={{ fontSize: '14px', color: '#666', marginBottom: '12px', lineHeight: '1.6' }}>
                        {arc.description}
                      </p>

                      {selectedArcId === arc.id && (
                        <>
                          {/* Characters in this arc */}
                          {arc.characters.length > 0 && (
                            <div style={{ marginTop: '16px', marginBottom: '16px' }}>
                              <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#667eea', marginBottom: '10px' }}>
                                등장인물 ({arc.characters.length}명):
                              </div>
                              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                {arc.characters.map((charName, idx) => {
                                  const character = characters.find(
                                    c => c.name.toLowerCase() === charName.toLowerCase() ||
                                         c.korean_name?.toLowerCase() === charName.toLowerCase()
                                  );
                                  return (
                                    <Chip
                                      key={idx}
                                      size="md"
                                      variant="flat"
                                      color="secondary"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        if (character) onCharacterSelect(character);
                                      }}
                                      style={{ cursor: character ? 'pointer' : 'default' }}
                                    >
                                      {character?.emoji || '👤'} {charName}
                                    </Chip>
                                  );
                                })}
                              </div>
                            </div>
                          )}

                          {/* Relationships in this arc */}
                          <div style={{ marginTop: '16px' }}>
                            <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#667eea', marginBottom: '10px' }}>
                              인물 간 관계:
                            </div>
                            {(() => {
                              const arcCharacters = characters.filter(c =>
                                arc.characters.some(arcChar =>
                                  arcChar.toLowerCase() === c.name.toLowerCase() ||
                                  arcChar.toLowerCase() === c.korean_name?.toLowerCase()
                                )
                              );
                              const arcRelationships = arcCharacters.flatMap(char =>
                                char.relationships
                                  .filter(rel => !rel.arc_id || rel.arc_id === arc.name || rel.arc_id === arc.id)
                                  .map(rel => ({
                                    from: char.name,
                                    fromEmoji: char.emoji,
                                    to: rel.character_name,
                                    type: rel.relationship_type,
                                    description: rel.description,
                                    sentiment: rel.sentiment || 'neutral'
                                  }))
                              );

                              if (arcRelationships.length === 0) {
                                return (
                                  <p style={{ fontSize: '13px', color: '#888', fontStyle: 'italic' }}>
                                    이 arc에서 명시적으로 드러난 관계가 아직 없습니다.
                                  </p>
                                );
                              }

                              return (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                  {arcRelationships.map((rel, idx) => {
                                    const sentimentColor =
                                      rel.sentiment === 'positive' ? '#22c55e' :
                                      rel.sentiment === 'negative' ? '#ef4444' :
                                      '#6b7280';
                                    return (
                                      <div
                                        key={idx}
                                        style={{
                                          background: '#f9fafb',
                                          padding: '12px',
                                          borderRadius: '8px',
                                          borderLeft: `4px solid ${sentimentColor}`
                                        }}
                                      >
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                                          <span style={{ fontSize: '14px', fontWeight: 'bold' }}>
                                            {rel.fromEmoji} {rel.from}
                                          </span>
                                          <span style={{ color: sentimentColor, fontSize: '16px' }}>→</span>
                                          <span style={{ fontSize: '14px', fontWeight: 'bold' }}>
                                            {rel.to}
                                          </span>
                                        </div>
                                        <div style={{ fontSize: '12px', color: sentimentColor, fontWeight: '600', marginBottom: '4px' }}>
                                          {rel.type}
                                        </div>
                                        {rel.description && (
                                          <div style={{ fontSize: '12px', color: '#666', lineHeight: '1.5' }}>
                                            {rel.description}
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              );
                            })()}
                          </div>

                          {/* Key events in this arc */}
                          {arc.key_events && arc.key_events.length > 0 && (
                            <div style={{ marginTop: '16px' }}>
                              <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#667eea', marginBottom: '10px' }}>
                                주요 사건:
                              </div>
                              <ul style={{ paddingLeft: '20px', margin: 0 }}>
                                {arc.key_events.map((event, idx) => (
                                  <li key={idx} style={{ fontSize: '13px', color: '#666', marginBottom: '6px', lineHeight: '1.5' }}>
                                    {event}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </>
                      )}
                    </CardBody>
                  </Card>
                ))}
              </>
            )}

            {/* Legacy key events display (if any exist) */}
            {keyEvents.length > 0 && (
              <Card>
                <CardHeader>
                  <h3 style={{ fontWeight: 'bold', fontSize: '16px', margin: 0 }}>Additional Key Events</h3>
                </CardHeader>
                <Divider />
                <CardBody>
                  <ol style={{ paddingLeft: '20px', margin: 0 }}>
                    {keyEvents.map((event, idx) => (
                      <li key={idx} style={{ fontSize: '13px', color: '#666', marginBottom: '10px', lineHeight: '1.5' }}>
                        {event}
                      </li>
                    ))}
                  </ol>
                </CardBody>
              </Card>
            )}
          </div>
        )}

        {activeTab === 'style' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <Card>
              <CardHeader>
                <h3 style={{ fontWeight: 'bold', fontSize: '16px', margin: 0 }}>Genre & Tone</h3>
              </CardHeader>
              <Divider />
              <CardBody>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div>
                    <p style={{ fontSize: '12px', color: '#888', fontWeight: 'bold', marginBottom: '5px' }}>Genre:</p>
                    <Chip color="secondary" variant="flat">{styleGuide.genre || 'Web Novel'}</Chip>
                  </div>
                  {styleGuide.sub_genres && styleGuide.sub_genres.length > 0 && (
                    <div>
                      <p style={{ fontSize: '12px', color: '#888', fontWeight: 'bold', marginBottom: '5px' }}>Sub-genres:</p>
                      <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                        {styleGuide.sub_genres.map((genre, idx) => (
                          <Chip key={idx} size="sm" variant="bordered">{genre}</Chip>
                        ))}
                      </div>
                    </div>
                  )}
                  <div>
                    <p style={{ fontSize: '12px', color: '#888', fontWeight: 'bold', marginBottom: '5px' }}>Tone:</p>
                    <p style={{ fontSize: '14px', color: '#333' }}>{styleGuide.tone || 'Standard'}</p>
                  </div>
                  <div>
                    <p style={{ fontSize: '12px', color: '#888', fontWeight: 'bold', marginBottom: '5px' }}>Content Rating:</p>
                    <Chip size="sm" variant="flat">{styleGuide.content_rating || 'Teen'}</Chip>
                  </div>
                  {styleGuide.themes && styleGuide.themes.length > 0 && (
                    <div>
                      <p style={{ fontSize: '12px', color: '#888', fontWeight: 'bold', marginBottom: '5px' }}>Themes:</p>
                      <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                        {styleGuide.themes.map((theme, idx) => (
                          <Chip key={idx} size="sm" color="secondary" variant="flat">{theme}</Chip>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </CardBody>
            </Card>

            <Card>
              <CardHeader>
                <h3 style={{ fontWeight: 'bold', fontSize: '16px', margin: 0 }}>Translation Guidelines</h3>
              </CardHeader>
              <Divider />
              <CardBody>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div>
                    <p style={{ fontSize: '12px', color: '#888', fontWeight: 'bold', marginBottom: '5px' }}>Name Format:</p>
                    <p style={{ fontSize: '14px', color: '#333' }}>{styleGuide.name_format || 'english_given_name english_surname'}</p>
                  </div>
                  <div>
                    <p style={{ fontSize: '12px', color: '#888', fontWeight: 'bold', marginBottom: '5px' }}>Honorific Usage:</p>
                    <p style={{ fontSize: '14px', color: '#666', lineHeight: '1.6' }}>{styleGuide.honorific_usage || 'Keep Korean honorifics with explanation on first use'}</p>
                  </div>
                  <div>
                    <p style={{ fontSize: '12px', color: '#888', fontWeight: 'bold', marginBottom: '5px' }}>Formality Level:</p>
                    <Chip size="sm" variant="flat">{styleGuide.formality_level || 'medium'}</Chip>
                  </div>
                  <div>
                    <p style={{ fontSize: '12px', color: '#888', fontWeight: 'bold', marginBottom: '5px' }}>Dialogue Style:</p>
                    <p style={{ fontSize: '14px', color: '#333' }}>{styleGuide.dialogue_style || 'natural'}</p>
                  </div>
                </div>
              </CardBody>
            </Card>

            {styleGuide.narrative_style && (
              <Card>
                <CardHeader>
                  <h3 style={{ fontWeight: 'bold', fontSize: '16px', margin: 0 }}>Narrative Style</h3>
                </CardHeader>
                <Divider />
                <CardBody>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div style={{ display: 'flex', gap: '15px' }}>
                      <div>
                        <p style={{ fontSize: '12px', color: '#888', fontWeight: 'bold', marginBottom: '5px' }}>POV:</p>
                        <Chip size="sm" variant="flat">{styleGuide.narrative_style.point_of_view || 'third-person'}</Chip>
                      </div>
                      <div>
                        <p style={{ fontSize: '12px', color: '#888', fontWeight: 'bold', marginBottom: '5px' }}>Tense:</p>
                        <Chip size="sm" variant="flat">{styleGuide.narrative_style.tense || 'past'}</Chip>
                      </div>
                      <div>
                        <p style={{ fontSize: '12px', color: '#888', fontWeight: 'bold', marginBottom: '5px' }}>Voice:</p>
                        <Chip size="sm" variant="flat">{styleGuide.narrative_style.voice || 'neutral'}</Chip>
                      </div>
                    </div>
                    {styleGuide.narrative_style.common_expressions && styleGuide.narrative_style.common_expressions.length > 0 && (
                      <div>
                        <p style={{ fontSize: '12px', color: '#888', fontWeight: 'bold', marginBottom: '5px' }}>Common Expressions:</p>
                        <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                          {styleGuide.narrative_style.common_expressions.map((expr, idx) => (
                            <Chip key={idx} size="sm" variant="bordered">{expr}</Chip>
                          ))}
                        </div>
                      </div>
                    )}
                    {styleGuide.narrative_style.atmosphere_descriptors && styleGuide.narrative_style.atmosphere_descriptors.length > 0 && (
                      <div>
                        <p style={{ fontSize: '12px', color: '#888', fontWeight: 'bold', marginBottom: '5px' }}>Atmosphere:</p>
                        <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                          {styleGuide.narrative_style.atmosphere_descriptors.map((desc, idx) => (
                            <Chip key={idx} size="sm" color="secondary" variant="flat">{desc}</Chip>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </CardBody>
              </Card>
            )}

            {Object.keys(honorifics).length > 0 && (
              <Card>
                <CardHeader>
                  <h3 style={{ fontWeight: 'bold', fontSize: '16px', margin: 0 }}>Honorifics</h3>
                </CardHeader>
                <Divider />
                <CardBody>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {Object.entries(honorifics).map(([korean, english], idx) => (
                      <div key={idx} style={{ padding: '10px', background: '#f9fafb', borderRadius: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '5px' }}>
                          <span style={{ fontWeight: 'bold', fontSize: '14px' }}>{korean}</span>
                          <span style={{ color: '#888' }}>→</span>
                          <span style={{ fontSize: '13px', color: '#666' }}>{english}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardBody>
              </Card>
            )}

            {Object.keys(recurringPhrases).length > 0 && (
              <Card>
                <CardHeader>
                  <h3 style={{ fontWeight: 'bold', fontSize: '16px', margin: 0 }}>Recurring Phrases</h3>
                </CardHeader>
                <Divider />
                <CardBody>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {Object.entries(recurringPhrases).map(([korean, english], idx) => (
                      <div key={idx} style={{ padding: '10px', background: '#f9fafb', borderRadius: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '5px' }}>
                          <span style={{ fontWeight: 'bold', fontSize: '14px' }}>{korean}</span>
                          <span style={{ color: '#888' }}>→</span>
                          <span style={{ fontSize: '13px', color: '#667eea' }}>{english}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardBody>
              </Card>
            )}
          </div>
        )}

        {activeTab === 'features' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <Card>
              <CardHeader>
                <h3 style={{ fontWeight: 'bold', fontSize: '16px', margin: 0 }}>Story Summary (작품 요약)</h3>
              </CardHeader>
              <Divider />
              <CardBody>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                  <Textarea
                    label="Logline (한 문장 요약)"
                    value={storySummary.logline}
                    onChange={(e) => updateStorySummary({ logline: e.target.value })}
                    placeholder="A one-sentence, tantalizing summary of the entire story."
                    minRows={2}
                  />
                  <Textarea
                    label="Blurb (뒷표지 소개)"
                    value={storySummary.blurb}
                    onChange={(e) => updateStorySummary({ blurb: e.target.value })}
                    placeholder="A short, enticing paragraph describing the main plot, core conflict, and stakes."
                    minRows={4}
                  />
                </div>
              </CardBody>
            </Card>

            <Card>
              <CardHeader>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                  <h3 style={{ fontWeight: 'bold', fontSize: '16px', margin: 0 }}>Key Story Arcs (주요 스토리 아크)</h3>
                  <Button
                    size="sm"
                    variant="flat"
                    startContent={<FiPlus />}
                    onPress={() => addKeyEvent('New key event')}
                  >
                    Add Event
                  </Button>
                </div>
              </CardHeader>
              <Divider />
              <CardBody>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {keyEvents.map((event, index) => (
                    <div key={index} style={{ display: 'flex', gap: '10px', alignItems: 'start' }}>
                      <Textarea
                        value={event}
                        onChange={(e) => updateKeyEvent(index, e.target.value)}
                        minRows={2}
                        style={{ flex: 1 }}
                      />
                      <Button
                        size="sm"
                        isIconOnly
                        variant="flat"
                        color="danger"
                        onPress={() => deleteKeyEvent(index)}
                      >
                        <FiTrash />
                      </Button>
                    </div>
                  ))}
                </div>
              </CardBody>
            </Card>

            <Card>
              <CardHeader>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                  <h3 style={{ fontWeight: 'bold', fontSize: '16px', margin: 0 }}>World Building Notes (세계관 노트)</h3>
                  <Button
                    size="sm"
                    variant="flat"
                    startContent={<FiPlus />}
                    onPress={() => addWorldBuildingNote('New world building note')}
                  >
                    Add Note
                  </Button>
                </div>
              </CardHeader>
              <Divider />
              <CardBody>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {worldBuildingNotes.map((note, index) => (
                    <div key={index} style={{ display: 'flex', gap: '10px', alignItems: 'start' }}>
                      <Textarea
                        value={note}
                        onChange={(e) => updateWorldBuildingNote(index, e.target.value)}
                        minRows={2}
                        style={{ flex: 1 }}
                      />
                      <Button
                        size="sm"
                        isIconOnly
                        variant="flat"
                        color="danger"
                        onPress={() => deleteWorldBuildingNote(index)}
                      >
                        <FiTrash />
                      </Button>
                    </div>
                  ))}
                </div>
              </CardBody>
            </Card>

            <Card>
              <CardHeader>
                <h3 style={{ fontWeight: 'bold', fontSize: '16px', margin: 0 }}>Style & Genre (스타일 & 장르)</h3>
              </CardHeader>
              <Divider />
              <CardBody>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <Input
                      label="Genre (장르)"
                      value={styleGuide.genre || ''}
                      onChange={(e) => updateStyleGuide({ genre: e.target.value })}
                      placeholder="e.g., School Life, Fantasy, Romance"
                    />
                    <Input
                      label="Content Rating"
                      value={styleGuide.content_rating || ''}
                      onChange={(e) => updateStyleGuide({ content_rating: e.target.value })}
                      placeholder="e.g., Teen, Young Adult, Mature"
                    />
                  </div>

                  <Textarea
                    label="Sub-genres (하위 장르, comma-separated)"
                    value={styleGuide.sub_genres?.join(', ') || ''}
                    onChange={(e) => updateStyleGuide({ sub_genres: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })}
                    placeholder="e.g., slice of life, drama, action"
                    minRows={2}
                  />

                  <Textarea
                    label="Themes (테마, comma-separated)"
                    value={styleGuide.themes?.join(', ') || ''}
                    onChange={(e) => updateStyleGuide({ themes: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })}
                    placeholder="e.g., coming of age, friendship, competition"
                    minRows={2}
                  />

                  <Textarea
                    label="Tone (톤)"
                    value={styleGuide.tone || ''}
                    onChange={(e) => updateStyleGuide({ tone: e.target.value })}
                    placeholder="e.g., Serious with occasional humor"
                    minRows={2}
                  />

                  <Input
                    label="Formality Level"
                    value={styleGuide.formality_level || ''}
                    onChange={(e) => updateStyleGuide({ formality_level: e.target.value })}
                    placeholder="e.g., high, medium, low"
                  />

                  <Input
                    label="Dialogue Style"
                    value={styleGuide.dialogue_style || ''}
                    onChange={(e) => updateStyleGuide({ dialogue_style: e.target.value })}
                    placeholder="e.g., natural and age-appropriate"
                  />
                </div>
              </CardBody>
            </Card>

            <Card>
              <CardHeader>
                <h3 style={{ fontWeight: 'bold', fontSize: '16px', margin: 0 }}>Translation Guidelines (번역 가이드)</h3>
              </CardHeader>
              <Divider />
              <CardBody>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                  <Input
                    label="Name Format"
                    value={styleGuide.name_format || ''}
                    onChange={(e) => updateStyleGuide({ name_format: e.target.value })}
                    placeholder="e.g., english_given_name english_surname"
                  />

                  <Textarea
                    label="Honorific Usage"
                    value={styleGuide.honorific_usage || ''}
                    onChange={(e) => updateStyleGuide({ honorific_usage: e.target.value })}
                    placeholder="Guidelines for translating Korean honorifics"
                    minRows={3}
                  />

                  <Textarea
                    label="Formal Speech Level"
                    value={styleGuide.formal_speech_level || ''}
                    onChange={(e) => updateStyleGuide({ formal_speech_level: e.target.value })}
                    placeholder="How to match English formality to Korean speech levels"
                    minRows={2}
                  />

                  <Input
                    label="Narrative Vocabulary"
                    value={styleGuide.narrative_vocabulary || ''}
                    onChange={(e) => updateStyleGuide({ narrative_vocabulary: e.target.value })}
                    placeholder="e.g., medium, elevate where necessary"
                  />
                </div>
              </CardBody>
            </Card>

            <Card>
              <CardHeader>
                <h3 style={{ fontWeight: 'bold', fontSize: '16px', margin: 0 }}>Narrative Style (서술 스타일)</h3>
              </CardHeader>
              <Divider />
              <CardBody>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                    <Select
                      label="Point of View"
                      selectedKeys={styleGuide.narrative_style?.point_of_view ? [styleGuide.narrative_style.point_of_view] : []}
                      onChange={(e) => updateStyleGuide({
                        narrative_style: { ...styleGuide.narrative_style, point_of_view: e.target.value }
                      })}
                    >
                      <SelectItem key="first-person" value="first-person">1st Person</SelectItem>
                      <SelectItem key="second-person" value="second-person">2nd Person</SelectItem>
                      <SelectItem key="third-person" value="third-person">3rd Person</SelectItem>
                    </Select>

                    <Select
                      label="Tense"
                      selectedKeys={styleGuide.narrative_style?.tense ? [styleGuide.narrative_style.tense] : []}
                      onChange={(e) => updateStyleGuide({
                        narrative_style: { ...styleGuide.narrative_style, tense: e.target.value }
                      })}
                    >
                      <SelectItem key="past" value="past">Past</SelectItem>
                      <SelectItem key="present" value="present">Present</SelectItem>
                    </Select>

                    <Input
                      label="Voice"
                      value={styleGuide.narrative_style?.voice || ''}
                      onChange={(e) => updateStyleGuide({
                        narrative_style: { ...styleGuide.narrative_style, voice: e.target.value }
                      })}
                      placeholder="e.g., introspective"
                    />
                  </div>

                  <Textarea
                    label="Common Expressions (comma-separated)"
                    value={styleGuide.narrative_style?.common_expressions?.join(', ') || ''}
                    onChange={(e) => updateStyleGuide({
                      narrative_style: {
                        ...styleGuide.narrative_style,
                        common_expressions: e.target.value.split(',').map(s => s.trim()).filter(Boolean)
                      }
                    })}
                    placeholder="e.g., 그때, 그 순간"
                    minRows={2}
                  />

                  <Textarea
                    label="Atmosphere Descriptors (comma-separated)"
                    value={styleGuide.narrative_style?.atmosphere_descriptors?.join(', ') || ''}
                    onChange={(e) => updateStyleGuide({
                      narrative_style: {
                        ...styleGuide.narrative_style,
                        atmosphere_descriptors: e.target.value.split(',').map(s => s.trim()).filter(Boolean)
                      }
                    })}
                    placeholder="e.g., tense, melancholic, warm"
                    minRows={2}
                  />
                </div>
              </CardBody>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
