import { Tab, Tabs } from '@nextui-org/react';
import { useState } from 'react';
import { useGlossaryStore } from '../model/GlossaryModel';

export default function GlossaryViewer() {
  const characters = useGlossaryStore((state) => state.characters);
  const events = useGlossaryStore((state) => state.events);
  const [selectedTab, setSelectedTab] = useState<'characters' | 'events'>('characters');

  return (
    <div style={{ display: 'flex', height: '100vh', background: '#f5f5f5' }}>
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
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
          <Tab key="characters" title="Characters" />
          <Tab key="events" title="Events" />
        </Tabs>

        <div style={{ flex: 1, overflow: 'auto', background: 'white', padding: '20px' }}>
          {selectedTab === 'characters' && (
            <div>
              <h2 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '15px' }}>Characters</h2>
              <div style={{ display: 'grid', gap: '15px' }}>
                {characters.map((char) => (
                  <div key={char.id} style={{ padding: '15px', border: '1px solid #ddd', borderRadius: '8px' }}>
                    <h3 style={{ fontSize: '16px', fontWeight: 'bold' }}>{char.name}</h3>
                    <p style={{ color: '#666', marginTop: '5px' }}>{char.description}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
          {selectedTab === 'events' && (
            <div>
              <h2 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '15px' }}>Events</h2>
              <div style={{ display: 'grid', gap: '15px' }}>
                {events.map((event) => (
                  <div key={event.id} style={{ padding: '15px', border: '1px solid #ddd', borderRadius: '8px' }}>
                    <h3 style={{ fontSize: '16px', fontWeight: 'bold' }}>{event.name}</h3>
                    <p style={{ color: '#666', marginTop: '5px' }}>{event.description}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
