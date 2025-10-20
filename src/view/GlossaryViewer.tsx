import { useEffect, useState } from 'react';
import { GlossaryCharacter, GlossaryEvent, useGlossaryStore } from '../model/GlossaryModel';
import CharacterRelationshipGraph from './glossary/CharacterRelationshipGraph';
import EventTimeline from './glossary/EventTimeline';
import GlossaryPanel from './glossary/GlossaryPanel';

export default function GlossaryViewer() {
  const characters = useGlossaryStore((state) => state.characters);
  const events = useGlossaryStore((state) => state.events);
  const [selectedCharacter, setSelectedCharacter] = useState<GlossaryCharacter | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<GlossaryEvent | null>(null);
  const [topHeight, setTopHeight] = useState(60);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    if (characters.length > 0 && !selectedCharacter) {
      setSelectedCharacter(characters[0]);
    }
  }, [characters]);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    e.preventDefault();
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        const container = document.getElementById('glossary-container');
        if (container) {
          const containerRect = container.getBoundingClientRect();
          const newHeight = ((e.clientY - containerRect.top) / containerRect.height) * 100;
          setTopHeight(Math.max(20, Math.min(80, newHeight)));
        }
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  return (
    <div style={{ display: 'flex', height: '100vh', background: '#f5f5f5' }}>
      <div
        id="glossary-container"
        style={{
          width: '60%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          borderRight: '1px solid #ddd',
          position: 'relative',
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

        <div
          style={{
            height: `${topHeight}%`,
            display: 'flex',
            flexDirection: 'column',
            background: 'white',
          }}
        >
          <div style={{ padding: '20px 20px 10px 20px', background: 'white', borderBottom: '1px solid #e5e7eb' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 'bold', margin: 0, color: '#667eea' }}>
              Character Relationships
            </h2>
            <p style={{ fontSize: '13px', color: '#888', marginTop: '5px' }}>
              인물 간 관계를 한눈에 확인하세요
            </p>
          </div>

          <div style={{ flex: 1, overflow: 'auto', background: 'white', position: 'relative' }}>
            <CharacterRelationshipGraph
              characters={characters}
              onCharacterSelect={setSelectedCharacter}
              selectedCharacterId={selectedCharacter?.id}
            />
          </div>
        </div>

        <div
          onMouseDown={handleMouseDown}
          style={{
            height: '8px',
            background: isDragging ? '#667eea' : '#e5e7eb',
            cursor: 'ns-resize',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: isDragging ? 'none' : 'background 0.2s',
            position: 'relative',
          }}
        >
          <div
            style={{
              width: '40px',
              height: '4px',
              background: isDragging ? 'white' : '#9ca3af',
              borderRadius: '2px',
              transition: 'background 0.2s',
            }}
          />
        </div>

        <div
          style={{
            flex: 1,
            background: '#f9fafb',
            borderTop: '1px solid #ddd',
            overflow: 'auto',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <EventTimeline
            events={events}
            characters={characters}
            onEventSelect={setSelectedEvent}
            selectedEventId={selectedEvent?.id}
            isExpanded={true}
          />
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
