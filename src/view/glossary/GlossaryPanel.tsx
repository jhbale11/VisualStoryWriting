import { Card, CardBody, CardHeader, Chip, Divider, Input } from '@nextui-org/react';
import { useState } from 'react';
import { FiSearch } from 'react-icons/fi';
import { GlossaryCharacter, GlossaryEvent } from '../../model/GlossaryModel';

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
  const [activeTab, setActiveTab] = useState<'characters' | 'events'>('characters');

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

        <div style={{ display: 'flex', gap: '10px', marginTop: '15px' }}>
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
                    <div style={{ marginTop: '10px' }}>
                      <p style={{ fontSize: '12px', color: '#888', fontWeight: 'bold', marginBottom: '5px' }}>
                        Relationships ({char.relationships.length}):
                      </p>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                        {char.relationships.slice(0, 3).map((rel, idx) => {
                          const sentimentColor =
                            rel.sentiment === 'positive' ? '#22c55e' :
                            rel.sentiment === 'negative' ? '#ef4444' :
                            '#6b7280';
                          return (
                            <div key={idx} style={{
                              fontSize: '12px',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '5px'
                            }}>
                              <div style={{
                                width: '8px',
                                height: '8px',
                                borderRadius: '50%',
                                background: sentimentColor
                              }} />
                              <span style={{ fontWeight: '600' }}>{rel.character_name}</span>
                              <span style={{ color: '#888' }}>·</span>
                              <span style={{ color: '#666' }}>{rel.relationship_type}</span>
                            </div>
                          );
                        })}
                        {char.relationships.length > 3 && (
                          <span style={{ fontSize: '11px', color: '#888' }}>
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
      </div>
    </div>
  );
}
