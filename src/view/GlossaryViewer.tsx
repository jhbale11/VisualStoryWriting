import { Card, CardBody, CardHeader, Tab, Tabs } from '@nextui-org/react';
import { useEffect, useState } from 'react';
import { Character, Event, useGlossaryStore } from '../model/GlossaryModel';
import CharacterRelationshipGraph from './glossary/CharacterRelationshipGraph';
import EventTimeline from './glossary/EventTimeline';
import GlossaryPanel from './glossary/GlossaryPanel';

export default function GlossaryViewer() {
  const characters = useGlossaryStore((state) => state.characters);
  const events = useGlossaryStore((state) => state.events);
  const [selectedTab, setSelectedTab] = useState<'characters' | 'events'>('characters');
  const [selectedCharacter, setSelectedCharacter] = useState<Character | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);

  useEffect(() => {
    if (characters.length > 0 && !selectedCharacter) {
      setSelectedCharacter(characters[0]);
    }
  }, [characters]);

  return (
    <div style={{ display: 'flex', height: '100vh', background: '#f5f5f5' }}>
      <div
        style={{
          width: '60%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          borderRight: '1px solid #ddd',
        }}
      >
        <div
          style={{
            padding: '20px',
            background: 'white',
            borderBottom: '1px solid #ddd',
          }}
        >
          <h1 style={{ fontSize: '24px', fontWeight: 'bold', margin: 0 }}>
            Visual Story Analysis
          </h1>
          <p style={{ color: '#666', marginTop: '5px' }}>
            {characters.length} characters · {events.length} events
          </p>
        </div>

        <Tabs
          selectedKey={selectedTab}
          onSelectionChange={(key) => setSelectedTab(key as any)}
          style={{ padding: '20px 20px 0 20px', background: 'white' }}
          color="secondary"
        >
          <Tab key="characters" title="Character Relationships" />
          <Tab key="events" title="Event Timeline" />
        </Tabs>

        <div style={{ flex: 1, overflow: 'auto', background: 'white' }}>
          {selectedTab === 'characters' && (
            <CharacterRelationshipGraph
              characters={characters}
              onCharacterSelect={setSelectedCharacter}
              selectedCharacterId={selectedCharacter?.id}
            />
          )}
          {selectedTab === 'events' && (
            <EventTimeline
              events={events}
              characters={characters}
              onEventSelect={setSelectedEvent}
              selectedEventId={selectedEvent?.id}
            />
          )}
        </div>
      </div>

      <GlossaryPanel
        characters={characters}
        events={events}
        selectedCharacter={selectedCharacter}
        selectedEvent={selectedEvent}
        onCharacterSelect={setSelectedCharacter}
        onEventSelect={setSelectedEvent}
      />
    </div>
  );
}
