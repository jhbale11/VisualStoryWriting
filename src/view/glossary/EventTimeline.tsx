import { Card, CardBody, Chip } from '@nextui-org/react';
import { Character, Event } from '../../model/GlossaryModel';

interface Props {
  events: Event[];
  characters: Character[];
  onEventSelect: (event: Event) => void;
  selectedEventId?: string;
}

export default function EventTimeline({
  events,
  characters,
  onEventSelect,
  selectedEventId,
}: Props) {
  const sortedEvents = [...events].sort((a, b) => a.chunk_index - b.chunk_index);

  const getCharacterName = (charId: string) => {
    const char = characters.find((c) => c.id === charId);
    return char?.name || charId;
  };

  return (
    <div style={{ padding: '20px', overflowY: 'auto' }}>
      <div style={{ position: 'relative' }}>
        <div
          style={{
            position: 'absolute',
            left: '30px',
            top: '20px',
            bottom: '20px',
            width: '2px',
            background: 'linear-gradient(to bottom, #667eea, #764ba2)',
          }}
        />

        {sortedEvents.map((event, index) => (
          <div
            key={event.id}
            style={{
              display: 'flex',
              marginBottom: '30px',
              paddingLeft: '60px',
              position: 'relative',
            }}
          >
            <div
              style={{
                position: 'absolute',
                left: '21px',
                top: '20px',
                width: '20px',
                height: '20px',
                borderRadius: '50%',
                background: event.importance === 'major' ? '#667eea' : '#764ba2',
                border: '3px solid white',
                boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
                zIndex: 1,
              }}
            />

            <Card
              isPressable
              isHoverable
              onClick={() => onEventSelect(event)}
              style={{
                flex: 1,
                background: event.id === selectedEventId ? '#f0f9ff' : 'white',
                border: event.id === selectedEventId ? '2px solid #667eea' : '1px solid #ddd',
                cursor: 'pointer',
              }}
            >
              <CardBody>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '10px' }}>
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

                <p style={{ color: '#666', fontSize: '14px', marginBottom: '10px' }}>
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
          </div>
        ))}
      </div>
    </div>
  );
}
