import OpenAI from 'openai';
import { create } from 'zustand';
import { openai } from './Model';

export interface Character {
  id: string;
  name: string;
  korean_name?: string;
  description: string;
  traits: string[];
  relationships: Array<{
    character_id: string;
    relationship_type: string;
    description: string;
  }>;
  first_appearance_chunk: number;
}

export interface Event {
  id: string;
  name: string;
  description: string;
  characters_involved: string[];
  chunk_index: number;
  importance: 'major' | 'minor';
}

export interface GlossaryState {
  characters: Character[];
  events: Event[];
  fullText: string;
  processedChunks: number;
  isLoading: boolean;
}

interface GlossaryAction {
  reset: () => void;
  setFullText: (text: string) => void;
  processChunk: (chunk: string, chunkIndex: number) => Promise<void>;
  addCharacter: (character: Character) => void;
  addEvent: (event: Event) => void;
  mergeCharacters: (existingId: string, newCharacter: Partial<Character>) => void;
}

const initialState: GlossaryState = {
  characters: [],
  events: [],
  fullText: '',
  processedChunks: 0,
  isLoading: false,
};

async function extractFromChunk(chunk: string, chunkIndex: number): Promise<{
  characters: Character[];
  events: Event[];
}> {
  const prompt = `Analyze the following text chunk and extract:

1. Characters: Name, brief description, personality traits
2. Major events: Up to 5 most important events in this chunk
3. Character relationships that are evident

Return ONLY valid JSON in this exact format:
{
  "characters": [
    {
      "name": "Character Name",
      "korean_name": "한글이름 (if applicable)",
      "description": "Brief character description",
      "traits": ["trait1", "trait2"],
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
      "importance": "major"
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

    const characters: Character[] = (parsed.characters || []).map((char: any, idx: number) => ({
      id: `char-${chunkIndex}-${idx}`,
      name: char.name || 'Unknown',
      korean_name: char.korean_name,
      description: char.description || '',
      traits: char.traits || [],
      relationships: (char.relationships || []).map((rel: any) => ({
        character_id: rel.character_name || '',
        relationship_type: rel.relationship_type || 'unknown',
        description: rel.description || ''
      })),
      first_appearance_chunk: chunkIndex,
    }));

    const events: Event[] = (parsed.events || []).map((evt: any, idx: number) => ({
      id: `event-${chunkIndex}-${idx}`,
      name: evt.name || 'Unknown Event',
      description: evt.description || '',
      characters_involved: evt.characters_involved || [],
      chunk_index: chunkIndex,
      importance: evt.importance || 'minor',
    }));

    return { characters, events };
  } catch (error) {
    console.error('Error extracting from chunk:', error);
    return { characters: [], events: [] };
  }
}

export const useGlossaryStore = create<GlossaryState & GlossaryAction>()((set, get) => ({
  ...initialState,
  reset: () => set({ ...initialState }),
  setFullText: (text) => set({ fullText: text }),

  processChunk: async (chunk, chunkIndex) => {
    set({ isLoading: true });

    const { characters, events } = await extractFromChunk(chunk, chunkIndex);

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
}));
