import { create } from 'zustand';
import { Entity, EntityNode, Action, ActionEdge, LocationNode, Location } from './Model';
import { openai } from './Model';

export interface GlossaryCharacter {
  id: string;
  name: string;
  korean_name?: string;
  description: string;
  traits: string[];
  emoji: string;
  relationships: Array<{
    character_name: string;
    relationship_type: string;
    description: string;
  }>;
}

export interface GlossaryEvent {
  id: string;
  name: string;
  description: string;
  characters_involved: string[];
  source_location: string;
  target_location: string;
  importance: 'major' | 'minor';
  chunk_index: number;
}

export interface GlossaryLocation {
  id: string;
  name: string;
  description: string;
  emoji: string;
}

export interface GlossaryState {
  characters: GlossaryCharacter[];
  events: GlossaryEvent[];
  locations: GlossaryLocation[];
  fullText: string;
  processedChunks: number;
  isLoading: boolean;
}

interface GlossaryAction {
  reset: () => void;
  setFullText: (text: string) => void;
  processChunk: (chunk: string, chunkIndex: number) => Promise<void>;
  addCharacter: (character: GlossaryCharacter) => void;
  addEvent: (event: GlossaryEvent) => void;
  addLocation: (location: GlossaryLocation) => void;
  updateCharacter: (id: string, updates: Partial<GlossaryCharacter>) => void;
  updateEvent: (id: string, updates: Partial<GlossaryEvent>) => void;
  updateLocation: (id: string, updates: Partial<GlossaryLocation>) => void;
  deleteCharacter: (id: string) => void;
  deleteEvent: (id: string) => void;
  deleteLocation: (id: string) => void;
  mergeCharacters: (existingId: string, newCharacter: Partial<GlossaryCharacter>) => void;
  convertToModelFormat: () => { entityNodes: EntityNode[], actionEdges: ActionEdge[], locationNodes: LocationNode[] };
  importFromJSON: (json: string) => void;
  exportToJSON: () => string;
}

const initialState: GlossaryState = {
  characters: [],
  events: [],
  locations: [],
  fullText: '',
  processedChunks: 0,
  isLoading: false,
};

async function extractFromChunk(chunk: string, chunkIndex: number): Promise<{
  characters: GlossaryCharacter[];
  events: GlossaryEvent[];
  locations: GlossaryLocation[];
}> {
  const prompt = `Analyze the following text chunk and extract:

1. Characters: Name, Korean name (if applicable), brief description, personality traits, emoji that represents them
2. Major events: Up to 5 most important events in this chunk
3. Character relationships that are evident
4. Locations mentioned

Return ONLY valid JSON in this exact format:
{
  "characters": [
    {
      "name": "Character Name",
      "korean_name": "한글이름 (if applicable, otherwise empty string)",
      "description": "Brief character description",
      "traits": ["trait1", "trait2"],
      "emoji": "😊",
      "relationships": [
        {
          "character_name": "Other Character",
          "relationship_type": "friend/enemy/family/lover/etc",
          "description": "Brief description of relationship"
        }
      ]
    }
  ],
  "events": [
    {
      "name": "Event name",
      "description": "What happened",
      "characters_involved": ["Character1", "Character2"],
      "source_location": "Starting location",
      "target_location": "Ending location",
      "importance": "major"
    }
  ],
  "locations": [
    {
      "name": "Location Name",
      "description": "Brief description",
      "emoji": "🏰"
    }
  ]
}

Text chunk:
${chunk}`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are a literary analysis expert. Extract character and event information from text. Always return valid JSON only, no additional text.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.3,
    });

    const content = response.choices[0].message.content || '{}';

    const jsonMatch = content.match(/\{[\s\S]*\}/);
    const jsonString = jsonMatch ? jsonMatch[0] : '{}';

    const parsed = JSON.parse(jsonString);

    const characters: GlossaryCharacter[] = (parsed.characters || []).map((char: any, idx: number) => ({
      id: `char-${chunkIndex}-${idx}`,
      name: char.name || 'Unknown',
      korean_name: char.korean_name || '',
      description: char.description || '',
      traits: char.traits || [],
      emoji: char.emoji || '👤',
      relationships: (char.relationships || []).map((rel: any) => ({
        character_name: rel.character_name || '',
        relationship_type: rel.relationship_type || 'unknown',
        description: rel.description || ''
      })),
    }));

    const events: GlossaryEvent[] = (parsed.events || []).map((evt: any, idx: number) => ({
      id: `event-${chunkIndex}-${idx}`,
      name: evt.name || 'Unknown Event',
      description: evt.description || '',
      characters_involved: evt.characters_involved || [],
      source_location: evt.source_location || 'unknown',
      target_location: evt.target_location || 'unknown',
      chunk_index: chunkIndex,
      importance: evt.importance || 'minor',
    }));

    const locations: GlossaryLocation[] = (parsed.locations || []).map((loc: any, idx: number) => ({
      id: `location-${chunkIndex}-${idx}`,
      name: loc.name || 'Unknown',
      description: loc.description || '',
      emoji: loc.emoji || '📍',
    }));

    return { characters, events, locations };
  } catch (error) {
    console.error('Error extracting from chunk:', error);
    return { characters: [], events: [], locations: [] };
  }
}

export const useGlossaryStore = create<GlossaryState & GlossaryAction>()((set, get) => ({
  ...initialState,
  reset: () => set({ ...initialState }),
  setFullText: (text) => set({ fullText: text }),

  processChunk: async (chunk, chunkIndex) => {
    set({ isLoading: true });

    const { characters, events, locations } = await extractFromChunk(chunk, chunkIndex);

    const existingCharacters = get().characters;

    characters.forEach((newChar) => {
      const existing = existingCharacters.find(
        (c) => c.name.toLowerCase() === newChar.name.toLowerCase()
      );

      if (existing) {
        get().mergeCharacters(existing.id, newChar);
      } else {
        get().addCharacter(newChar);
      }
    });

    events.forEach((event) => {
      get().addEvent(event);
    });

    const existingLocations = get().locations;
    locations.forEach((newLoc) => {
      const existing = existingLocations.find(
        (l) => l.name.toLowerCase() === newLoc.name.toLowerCase()
      );
      if (!existing) {
        get().addLocation(newLoc);
      }
    });

    set({
      processedChunks: chunkIndex + 1,
      isLoading: false,
    });
  },

  addCharacter: (character) => {
    set((state) => ({
      characters: [...state.characters, character],
    }));
  },

  addEvent: (event) => {
    set((state) => ({
      events: [...state.events, event],
    }));
  },

  addLocation: (location) => {
    set((state) => ({
      locations: [...state.locations, location],
    }));
  },

  updateCharacter: (id, updates) => {
    set((state) => ({
      characters: state.characters.map((char) =>
        char.id === id ? { ...char, ...updates } : char
      ),
    }));
  },

  updateEvent: (id, updates) => {
    set((state) => ({
      events: state.events.map((event) =>
        event.id === id ? { ...event, ...updates } : event
      ),
    }));
  },

  updateLocation: (id, updates) => {
    set((state) => ({
      locations: state.locations.map((loc) =>
        loc.id === id ? { ...loc, ...updates } : loc
      ),
    }));
  },

  deleteCharacter: (id) => {
    set((state) => ({
      characters: state.characters.filter((char) => char.id !== id),
    }));
  },

  deleteEvent: (id) => {
    set((state) => ({
      events: state.events.filter((event) => event.id !== id),
    }));
  },

  deleteLocation: (id) => {
    set((state) => ({
      locations: state.locations.filter((loc) => loc.id !== id),
    }));
  },

  mergeCharacters: (existingId, newCharacter) => {
    set((state) => ({
      characters: state.characters.map((char) => {
        if (char.id === existingId) {
          return {
            ...char,
            description: newCharacter.description || char.description,
            traits: [...new Set([...char.traits, ...(newCharacter.traits || [])])],
            relationships: [
              ...char.relationships,
              ...(newCharacter.relationships || []),
            ],
          };
        }
        return char;
      }),
    }));
  },

  convertToModelFormat: () => {
    const state = get();

    const entityNodes: EntityNode[] = state.characters.map((char, idx) => ({
      id: `entity-${char.name}`,
      type: 'entityNode',
      dragHandle: '.custom-drag-handle',
      measured: { width: 160, height: 160 },
      position: { x: 100 + (idx % 3) * 250, y: 100 + Math.floor(idx / 3) * 200 },
      data: {
        name: char.name,
        emoji: char.emoji,
        properties: char.traits.slice(0, 3).map(trait => ({
          name: trait,
          value: 5
        }))
      }
    }));

    const locationNodes: LocationNode[] = state.locations.map((loc, idx) => ({
      id: `location-${idx}`,
      type: 'locationNode',
      dragHandle: '.custom-drag-handle',
      measured: { width: 160, height: 160 },
      position: { x: 100 + (idx % 3) * 250, y: 100 + Math.floor(idx / 3) * 200 },
      data: {
        name: loc.name,
        emoji: loc.emoji
      }
    }));

    const actionEdges: ActionEdge[] = state.events.map((event, idx) => {
      const sourceChar = event.characters_involved[0];
      const targetChar = event.characters_involved[1] || event.characters_involved[0];

      return {
        id: `action-${idx}`,
        type: 'actionEdge',
        source: `entity-${sourceChar}`,
        target: `entity-${targetChar}`,
        animated: true,
        markerEnd: { type: 'arrowclosed' as const, width: 25, height: 25 },
        data: {
          name: event.name,
          passage: event.description,
          sourceLocation: event.source_location,
          targetLocation: event.target_location
        }
      };
    }).filter(edge => {
      const sourceExists = entityNodes.find(n => n.id === edge.source);
      const targetExists = entityNodes.find(n => n.id === edge.target);
      return sourceExists && targetExists;
    });

    return { entityNodes, actionEdges, locationNodes };
  },

  importFromJSON: (json) => {
    try {
      const data = JSON.parse(json);
      set({
        characters: data.characters || [],
        events: data.events || [],
        locations: data.locations || [],
      });
    } catch (error) {
      console.error('Error importing JSON:', error);
      alert('Invalid JSON format');
    }
  },

  exportToJSON: () => {
    const state = get();
    const data = {
      characters: state.characters,
      events: state.events,
      locations: state.locations,
      fullText: state.fullText,
    };
    return JSON.stringify(data, null, 2);
  },
}));
