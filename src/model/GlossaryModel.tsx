import { GoogleGenerativeAI } from '@google/generative-ai';
import { create } from 'zustand';
import { Entity, EntityNode, Action, ActionEdge, LocationNode, Location } from './Model';

let geminiAPI: GoogleGenerativeAI | null = null;

export const initGemini = (apiKey: string) => {
  geminiAPI = new GoogleGenerativeAI(apiKey);
};

export interface GlossaryCharacter {
  id: string;
  name: string;
  korean_name?: string;
  english_name?: string;
  description: string;
  physical_appearance: string;
  personality: string;
  traits: string[];
  emoji: string;
  age?: string;
  gender?: string;
  occupation?: string;
  relationships: Array<{
    character_name: string;
    relationship_type: string;
    description: string;
    sentiment?: 'positive' | 'negative' | 'neutral';
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

export interface GlossaryTerm {
  id: string;
  original: string;
  translation: string;
  context: string;
  category: 'name' | 'place' | 'item' | 'concept' | 'other';
}

export interface GlossaryState {
  characters: GlossaryCharacter[];
  events: GlossaryEvent[];
  locations: GlossaryLocation[];
  terms: GlossaryTerm[];
  fullText: string;
  processedChunks: number;
  totalChunks: number;
  isLoading: boolean;
}

interface GlossaryAction {
  reset: () => void;
  setFullText: (text: string) => void;
  setTotalChunks: (total: number) => void;
  processChunk: (chunk: string, chunkIndex: number) => Promise<void>;
  consolidateResults: () => Promise<void>;
  addCharacter: (character: GlossaryCharacter) => void;
  addEvent: (event: GlossaryEvent) => void;
  addLocation: (location: GlossaryLocation) => void;
  addTerm: (term: GlossaryTerm) => void;
  updateCharacter: (id: string, updates: Partial<GlossaryCharacter>) => void;
  updateEvent: (id: string, updates: Partial<GlossaryEvent>) => void;
  updateLocation: (id: string, updates: Partial<GlossaryLocation>) => void;
  updateTerm: (id: string, updates: Partial<GlossaryTerm>) => void;
  deleteCharacter: (id: string) => void;
  deleteEvent: (id: string) => void;
  deleteLocation: (id: string) => void;
  deleteTerm: (id: string) => void;
  mergeCharacters: (existingId: string, newCharacter: Partial<GlossaryCharacter>) => void;
  convertToModelFormat: () => { entityNodes: EntityNode[], actionEdges: ActionEdge[], locationNodes: LocationNode[] };
  importFromJSON: (json: string) => void;
  exportToJSON: () => string;
}

const initialState: GlossaryState = {
  characters: [],
  events: [],
  locations: [],
  terms: [],
  fullText: '',
  processedChunks: 0,
  totalChunks: 0,
  isLoading: false,
};

async function extractFromChunk(chunk: string, chunkIndex: number): Promise<{
  characters: GlossaryCharacter[];
  events: GlossaryEvent[];
  locations: GlossaryLocation[];
  terms: GlossaryTerm[];
}> {
  const prompt = `당신은 문학 작품 분석 전문가입니다. 다음 텍스트 조각을 분석하여 정보를 추출하세요.

**중요 지침:**
1. 인물 간의 관계는 반드시 추출하고, 관계의 성격(긍정적/부정적/중립)을 명확히 표시하세요.
2. 이 chunk에서 실제로 발생하는 중요한 사건들을 모두 찾아내세요.
3. 사건은 플롯 전개에 영향을 미치는 것만 선택하세요.

추출할 정보:

1. **인물 (Characters)**:
   - 이름 (원문 이름 또는 한글/영문)
   - 외형 묘사 (구체적으로)
   - 성격 특성 (핵심 특성 3-5개)
   - 나이, 성별, 직업
   - **다른 인물과의 관계 (필수):**
     * 이 chunk에서 등장하는 모든 인물 관계를 추출
     * 각 관계에 대해 relationship_type, description, sentiment를 명확히 기록
     * sentiment는 "positive"(긍정: 친구, 연인, 가족, 동료, 멘토 등) / "negative"(부정: 적, 라이벌, 원수 등) / "neutral"(중립)로 분류

2. **사건 (Events)**:
   - 이 chunk에서 실제로 발생하는 모든 중요 사건
   - 각 사건은 명확한 행동이나 사건이어야 함 (추상적인 상태 변화는 제외)
   - 사건 이름, 상세 설명, 관련 인물, 장소
   - importance: "major"(서사에 큰 영향) 또는 "minor"(부차적 사건)

3. **장소 (Locations)**:
   - 등장하는 모든 장소
   - 장소에 대한 설명
   - 적절한 이모지

4. **번역 용어 (Terms)**:
   - 자주 등장하거나 번역에 주의가 필요한 용어
   - 고유명사, 특수 용어, 문화적 개념 등

**반드시 유효한 JSON만 반환하세요. 코드 블록 없이 순수 JSON만 출력하세요.**

JSON 형식:
{
  "characters": [
    {
      "name": "인물 이름",
      "korean_name": "한글 이름 (있다면)",
      "english_name": "English Name (있다면)",
      "description": "인물의 역할과 특징에 대한 간략한 설명",
      "physical_appearance": "외형 묘사",
      "personality": "성격 설명",
      "traits": ["특성1", "특성2", "특성3"],
      "emoji": "😊",
      "age": "나이",
      "gender": "성별",
      "occupation": "직업",
      "relationships": [
        {
          "character_name": "관계 대상 인물 이름",
          "relationship_type": "친구 / 적 / 가족 / 연인 / 동료 / 라이벌 등",
          "description": "이 관계의 구체적인 성격과 맥락",
          "sentiment": "positive/negative/neutral"
        }
      ]
    }
  ],
  "events": [
    {
      "name": "사건 이름 (동사형으로)",
      "description": "무슨 일이 일어났는지 구체적으로",
      "characters_involved": ["주요 인물1", "주요 인물2"],
      "source_location": "사건 시작 장소",
      "target_location": "사건 종료 장소 (이동이 있을 경우)",
      "importance": "major 또는 minor"
    }
  ],
  "locations": [
    {
      "name": "장소 이름",
      "description": "장소 설명",
      "emoji": "🏰"
    }
  ],
  "terms": [
    {
      "original": "원문 용어",
      "translation": "번역",
      "context": "문맥",
      "category": "name/place/item/concept/other"
    }
  ]
}

분석할 텍스트:
${chunk}`;

  try {
    if (!geminiAPI) {
      throw new Error('Gemini API not initialized');
    }

    const model = geminiAPI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const content = response.text();

    const jsonMatch = content.match(/\{[\s\S]*\}/);
    const jsonString = jsonMatch ? jsonMatch[0] : '{}';
    const parsed = JSON.parse(jsonString);

    const characters: GlossaryCharacter[] = (parsed.characters || []).map((char: any, idx: number) => ({
      id: `char-${chunkIndex}-${idx}`,
      name: char.name || 'Unknown',
      korean_name: char.korean_name || '',
      english_name: char.english_name || '',
      description: char.description || '',
      physical_appearance: char.physical_appearance || '',
      personality: char.personality || '',
      traits: char.traits || [],
      emoji: char.emoji || '👤',
      age: char.age || '',
      gender: char.gender || '',
      occupation: char.occupation || '',
      relationships: (char.relationships || []).map((rel: any) => ({
        character_name: rel.character_name || '',
        relationship_type: rel.relationship_type || 'unknown',
        description: rel.description || '',
        sentiment: rel.sentiment || 'neutral'
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

    const terms: GlossaryTerm[] = (parsed.terms || []).map((term: any, idx: number) => ({
      id: `term-${chunkIndex}-${idx}`,
      original: term.original || '',
      translation: term.translation || '',
      context: term.context || '',
      category: term.category || 'other',
    }));

    return { characters, events, locations, terms };
  } catch (error) {
    console.error('Error extracting from chunk:', error);
    return { characters: [], events: [], locations: [], terms: [] };
  }
}

async function consolidateCharacters(characters: GlossaryCharacter[]): Promise<GlossaryCharacter[]> {
  if (characters.length === 0) return [];

  const characterNames = characters.map(c => c.name).join(', ');

  const prompt = `당신은 문학 작품 분석 전문가입니다. 여러 chunk에서 추출된 인물 정보들을 종합하여 각 인물의 최종 특징과 **인물 간의 모든 관계**를 명확히 정리해주세요.

등장 인물: ${characterNames}

추출된 인물 정보:
${JSON.stringify(characters.map(c => ({
  name: c.name,
  description: c.description,
  traits: c.traits,
  relationships: c.relationships
})), null, 2)}

**작업:**
1. 각 인물의 핵심 특성 3-5개를 선별
2. 외형과 성격 설명을 통합하여 일관된 설명으로 정리
3. **중요: 인물 간의 모든 관계를 명확히 추출하고 정리**
   - 각 인물마다 다른 주요 인물들과의 관계를 반드시 포함
   - 관계의 성격(긍정/부정/중립)을 sentiment로 명시
   - 중복된 관계는 통합하되, 모든 의미 있는 관계는 유지
   - 관계가 없는 인물은 relationships를 빈 배열로 설정

**반드시 유효한 JSON만 반환하세요. 코드 블록 없이 순수 JSON만 출력하세요.**

JSON 형식:
{
  "characters": [
    {
      "id": "기존 ID 유지",
      "name": "인물 이름",
      "korean_name": "한글 이름",
      "english_name": "English Name",
      "description": "통합된 설명",
      "physical_appearance": "통합된 외형",
      "personality": "통합된 성격",
      "traits": ["핵심특성1", "핵심특성2", "핵심특성3"],
      "emoji": "😊",
      "age": "나이",
      "gender": "성별",
      "occupation": "직업",
      "relationships": [
        {
          "character_name": "관계 대상 인물 이름",
          "relationship_type": "친구/적/가족/연인/동료/라이벌 등",
          "description": "관계의 구체적 내용",
          "sentiment": "positive/negative/neutral"
        }
      ]
    }
  ]
}`;

  try {
    if (!geminiAPI) {
      throw new Error('Gemini API not initialized');
    }

    const model = geminiAPI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const content = response.text();

    const jsonMatch = content.match(/\{[\s\S]*\}/);
    const jsonString = jsonMatch ? jsonMatch[0] : '{}';
    const parsed = JSON.parse(jsonString);

    const consolidatedCharacters = (parsed.characters || []).map((char: any) => ({
      id: char.id || char.name,
      name: char.name || 'Unknown',
      korean_name: char.korean_name || '',
      english_name: char.english_name || '',
      description: char.description || '',
      physical_appearance: char.physical_appearance || '',
      personality: char.personality || '',
      traits: char.traits || [],
      emoji: char.emoji || '👤',
      age: char.age || '',
      gender: char.gender || '',
      occupation: char.occupation || '',
      relationships: (char.relationships || []).map((rel: any) => ({
        character_name: rel.character_name || '',
        relationship_type: rel.relationship_type || 'unknown',
        description: rel.description || '',
        sentiment: rel.sentiment || 'neutral'
      })),
    }));

    return consolidatedCharacters.length > 0 ? consolidatedCharacters : characters;
  } catch (error) {
    console.error('Error consolidating characters:', error);
    return characters;
  }
}

async function consolidateEvents(events: GlossaryEvent[], characters: GlossaryCharacter[]): Promise<GlossaryEvent[]> {
  if (events.length === 0) return [];

  const prompt = `당신은 문학 작품 분석 전문가입니다. 여러 chunk에서 추출된 사건들을 분석하여 이 소설의 서사에서 실제로 중요한 굵직한 사건들만 선별하세요.

등장 인물:
${characters.map(c => c.name).join(', ')}

추출된 모든 사건 (${events.length}개):
${JSON.stringify(events.map(e => ({
  name: e.name,
  description: e.description,
  characters: e.characters_involved,
  location: e.source_location,
  importance: e.importance,
  chunk_index: e.chunk_index
})), null, 2)}

**선별 기준:**
1. 🎯 **서사 전개의 전환점**: 이야기의 흐름을 바꾸는 중요한 사건
2. 👥 **인물 관계 변화**: 주요 인물들 간의 관계가 형성되거나 변화하는 사건
3. ⚔️ **갈등의 발생/해결**: 주요 갈등이 시작되거나 해결되는 사건
4. 💡 **인물 성장**: 인물의 성격이나 가치관이 변하는 중요한 사건
5. 🚫 **제외**: 중복 사건, 일상적 대화, 단순 이동, 사소한 부차적 사건

**작업:**
1. 위 기준에 따라 15-20개의 핵심 사건만 선별
2. 선별된 사건들을 시간 순서(chunk_index 기준)로 정렬
3. 각 사건의 이름을 명확하고 구체적으로 작성 (동사 포함)
4. importance는 모두 "major"로 설정

**반드시 유효한 JSON만 반환하세요. 코드 블록 없이 순수 JSON만 출력하세요.**

JSON 형식:
{
  "events": [
    {
      "name": "구체적인 사건 이름 (동사형)",
      "description": "이 사건이 서사에 미치는 영향과 구체적 내용",
      "characters_involved": ["주요 인물1", "주요 인물2"],
      "source_location": "장소",
      "target_location": "장소",
      "importance": "major",
      "chunk_index": 0
    }
  ]
}`;

  try {
    if (!geminiAPI) {
      throw new Error('Gemini API not initialized');
    }

    const model = geminiAPI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const content = response.text();

    const jsonMatch = content.match(/\{[\s\S]*\}/);
    const jsonString = jsonMatch ? jsonMatch[0] : '{}';
    const parsed = JSON.parse(jsonString);

    return (parsed.events || []).map((evt: any, idx: number) => ({
      id: `consolidated-event-${idx}`,
      name: evt.name || 'Unknown Event',
      description: evt.description || '',
      characters_involved: evt.characters_involved || [],
      source_location: evt.source_location || 'unknown',
      target_location: evt.target_location || 'unknown',
      chunk_index: evt.chunk_index || 0,
      importance: evt.importance || 'major',
    }));
  } catch (error) {
    console.error('Error consolidating events:', error);
    return events.filter(e => e.importance === 'major').slice(0, 20);
  }
}

export const useGlossaryStore = create<GlossaryState & GlossaryAction>()((set, get) => ({
  ...initialState,
  reset: () => set({ ...initialState }),
  setFullText: (text) => set({ fullText: text }),
  setTotalChunks: (total) => set({ totalChunks: total }),

  processChunk: async (chunk, chunkIndex) => {
    set({ isLoading: true });

    const { characters, events, locations, terms } = await extractFromChunk(chunk, chunkIndex);

    const existingCharacters = get().characters;

    characters.forEach((newChar) => {
      const existing = existingCharacters.find(
        (c) => c.name.toLowerCase() === newChar.name.toLowerCase() ||
               c.korean_name?.toLowerCase() === newChar.korean_name?.toLowerCase()
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

    const existingTerms = get().terms;
    terms.forEach((newTerm) => {
      const existing = existingTerms.find(
        (t) => t.original.toLowerCase() === newTerm.original.toLowerCase()
      );
      if (!existing) {
        get().addTerm(newTerm);
      }
    });

    set({
      processedChunks: chunkIndex + 1,
      isLoading: false,
    });
  },

  consolidateResults: async () => {
    set({ isLoading: true });

    const state = get();
    const totalChunks = state.totalChunks;

    if (totalChunks <= 2) {
      set({ isLoading: false });
      return;
    }

    try {
      const consolidatedCharacters = await consolidateCharacters(state.characters);

      const consolidatedEvents = await consolidateEvents(state.events, consolidatedCharacters);

      set({
        characters: consolidatedCharacters,
        events: consolidatedEvents,
        isLoading: false,
      });
    } catch (error) {
      console.error('Error consolidating results:', error);
      set({ isLoading: false });
    }
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

  addTerm: (term) => {
    set((state) => ({
      terms: [...state.terms, term],
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

  updateTerm: (id, updates) => {
    set((state) => ({
      terms: state.terms.map((term) =>
        term.id === id ? { ...term, ...updates } : term
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

  deleteTerm: (id) => {
    set((state) => ({
      terms: state.terms.filter((term) => term.id !== id),
    }));
  },

  mergeCharacters: (existingId, newCharacter) => {
    set((state) => ({
      characters: state.characters.map((char) => {
        if (char.id === existingId) {
          return {
            ...char,
            description: newCharacter.description || char.description,
            physical_appearance: newCharacter.physical_appearance || char.physical_appearance,
            personality: newCharacter.personality || char.personality,
            traits: [...new Set([...char.traits, ...(newCharacter.traits || [])])],
            age: newCharacter.age || char.age,
            gender: newCharacter.gender || char.gender,
            occupation: newCharacter.occupation || char.occupation,
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
        terms: data.terms || [],
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
      terms: state.terms,
      fullText: state.fullText,
    };
    return JSON.stringify(data, null, 2);
  },
}));
