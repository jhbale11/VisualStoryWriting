import { GoogleGenerativeAI } from '@google/generative-ai';
import { create } from 'zustand';
import type { EntityNode, ActionEdge, LocationNode } from './Model';
import { MarkerType } from '@xyflow/react';

let geminiAPI: GoogleGenerativeAI | null = null;

export const initGemini = (apiKey: string) => {
  console.log('🔑 Initializing Gemini API...');
  if (!apiKey || apiKey.trim() === '') {
    console.error('❌ Cannot initialize Gemini API: API key is empty');
    return;
  }
  geminiAPI = new GoogleGenerativeAI(apiKey);
  console.log('✅ Gemini API initialized successfully');
};

export interface CharacterRelationshipInArc {
  character_name: string;
  relationship_type: string;
  description: string;
  sentiment?: 'positive' | 'negative' | 'neutral';
  arc_id?: string; // Which arc this relationship is relevant to
}

export interface GlossaryCharacter {
  id: string;
  name: string;
  korean_name?: string;
  description: string;
  physical_appearance?: string;
  personality: string;
  traits: string[];
  emoji: string;
  age?: string;
  gender?: string;
  role?: 'protagonist' | 'antagonist' | 'major' | 'supporting' | 'minor';
  occupation?: string;
  abilities?: string[];
  speech_style?: string;
  name_variants?: { [key: string]: string }; // e.g., {"nickname": "별명", "title": "직함"}
  relationships: Array<CharacterRelationshipInArc>;
}

export interface GlossaryEvent {
  id: string;
  name: string;
  description: string;
  characters_involved: string[];
  location?: string;
  importance: 'major' | 'minor';
}

export interface GlossaryLocation {
  id: string;
  name: string;
  korean_name?: string;
  description: string;
  emoji: string;
  type?: string; // e.g., "city", "building", "room", "natural"
}

export interface GlossaryTerm {
  id: string;
  original: string; // Korean term
  translation: string; // English translation
  context: string;
  category?: 'name' | 'place' | 'item' | 'concept' | 'cultural' | 'other';
}

export interface StorySummary {
  logline: string; // One-sentence summary
  blurb: string; // Short paragraph for back cover
}

export interface StyleGuide {
  name_format?: string; // e.g., "english_given_name english_surname"
  tone?: string; // e.g., "Serious with occasional humor"
  formality_level?: string; // "high", "medium", "low"
  narrative_vocabulary?: string; // e.g., "medium, elevate where necessary"
  themes?: string[]; // e.g., ["coming of age", "friendship", "competition"]
  genre?: string; // e.g., "School Life", "Fantasy", "Romance"
  sub_genres?: string[]; // e.g., ["slice of life", "drama"]
  content_rating?: string; // "Teen", "Young Adult", "Mature"
  honorific_usage?: string; // Guidelines for honorific translation
  formal_speech_level?: string; // Guidelines for formality translation
  dialogue_style?: string; // e.g., "natural and age-appropriate"
  narrative_style?: {
    point_of_view?: string; // "first-person", "third-person"
    tense?: string; // "past", "present"
    voice?: string; // "introspective", "descriptive", "neutral"
    common_expressions?: string[]; // Recurring narrative expressions
    atmosphere_descriptors?: string[]; // Common mood/atmosphere words
  };
}

export interface GlossaryArc {
  id: string;
  name: string; // Arc name (e.g., "School Life Arc", "Tournament Arc")
  description: string; // Description of the arc
  theme?: string; // Theme of the arc (e.g., "Coming of age", "Conflict")
  characters: GlossaryCharacter[]; // Full character information for this arc
  events: GlossaryEvent[]; // Events that happen in this arc
  locations: GlossaryLocation[]; // Locations in this arc
  relationships: Array<{
    character_a: string;
    character_b: string;
    relationship_type: string;
    description: string;
    sentiment?: 'positive' | 'negative' | 'neutral';
  }>; // Relationships specific to this arc
  key_events: string[]; // Key event summaries
  background_changes?: string[]; // Changes in setting/background in this arc
  terms: Array<{
    original: string;
    translation: string;
    context: string;
  }>; // Terms specific to this arc
  start_chunk?: number; // Starting chunk index
  end_chunk?: number; // Ending chunk index
}

export interface GlossaryState {
  arcs: GlossaryArc[]; // Story arcs (ALL DATA IS HERE - characters, events, locations, terms are within arcs)
  story_summary: StorySummary;
  honorifics: { [key: string]: string }; // e.g., {"님": "formal honorific suffix..."}
  recurring_phrases: { [korean: string]: string }; // e.g., {"그때 그 순간": "at that very moment"}
  style_guide: StyleGuide;
  target_language: 'en' | 'ja'; // Target language for glossary extraction
  fullText: string;
  processedChunks: number;
  totalChunks: number;
  isLoading: boolean;
}

interface GlossaryAction {
  reset: () => void;
  setFullText: (text: string) => void;
  setTotalChunks: (total: number) => void;
  setTargetLanguage: (language: 'en' | 'ja') => void;
  processChunk: (chunk: string, chunkIndex: number) => Promise<void>;
  consolidateResults: () => Promise<void>;
  addArc: (arc: GlossaryArc) => void;
  updateArc: (id: string, updates: Partial<GlossaryArc>) => void;
  deleteArc: (id: string) => void;
  updateStorySummary: (summary: Partial<StorySummary>) => void;
  updateStyleGuide: (guide: Partial<StyleGuide>) => void;
  addHonorific: (korean: string, explanation: string) => void;
  updateHonorific: (oldKorean: string, korean: string, explanation: string) => void;
  deleteHonorific: (korean: string) => void;
  addRecurringPhrase: (korean: string, translation: string) => void;
  updateRecurringPhrase: (oldKorean: string, korean: string, translation: string) => void;
  deleteRecurringPhrase: (korean: string) => void;
  convertToModelFormat: () => { entityNodes: EntityNode[], actionEdges: ActionEdge[], locationNodes: LocationNode[] };
  importFromJSON: (json: string) => void;
  exportToJSON: () => string;
}

const initialState: GlossaryState = {
  arcs: [],
  story_summary: { logline: '', blurb: '' },
  honorifics: {},
  recurring_phrases: {},
  style_guide: {
    name_format: 'english_given_name english_surname',
    tone: 'Standard',
    formality_level: 'medium',
    themes: [],
    genre: 'Web Novel',
    sub_genres: [],
    content_rating: 'Teen',
    honorific_usage: 'Keep Korean honorifics with explanation on first use',
    formal_speech_level: 'Match English formality to Korean speech level',
    dialogue_style: 'natural',
    narrative_style: {
      point_of_view: 'third-person',
      tense: 'past',
      voice: 'neutral',
      common_expressions: [],
      atmosphere_descriptors: [],
    }
  },
  target_language: 'en', // Default to English
  fullText: '',
  processedChunks: 0,
  totalChunks: 0,
  isLoading: false,
};

function getLanguageDirective(targetLanguage: 'en' | 'ja'): string {
  if (targetLanguage === 'ja') {
    return `

**🌐 TARGET LANGUAGE: Japanese (日本語)**

この韓国語小説を読んで、**日本語話者のための翻訳用語集**を作成してください。

**重要な言語規則:**
1. **翻訳フィールド (日本語で記述):**
   - Characters: 'name', 'surname', 'given_name', 'english_name', 'description', 'physical_appearance', 'personality', 'occupation', 'speech_style', 'first_appearance' → 日本語
   - Events: 'name', 'description', 'source_location', 'target_location' → 日本語
   - Locations: 'name', 'description', 'atmosphere', 'significance' → 日本語
   - Terms: 'translation', 'context', 'notes' → 日本語
   - 'key_events_in_chunk': 配列内すべて → 日本語
   - 'world_building_notes': 配列内すべて → 日本語
   - 'style_guide': すべてのフィールド → 日本語
   - Honorifics: 値(説明) → 日本語
   - Recurring phrases: 値(翻訳) → 日本語

2. **韓国語保持フィールド (原文のまま):**
   - 'korean_name', 'korean_surname', 'korean_given_name'
   - Terms 'original'
   - Honorifics キー (韓国語)
   - Recurring phrases キー (韓国語)

3. **JSON構造:** JSONキー名は英語のまま

**例:**
- Character "name": "キム・ブジャ", "description": "熟練したゲーマー"
- Event "name": "主人公がライバルと初めて出会う"
- "key_events_in_chunk": ["主人公が新しい力を覚醒させる"]
`;
  }
  return `

**🌐 TARGET LANGUAGE: English**

You are reading a Korean novel and creating a **translation glossary for English speakers**.

**Critical Language Rules:**
1. **Translation Fields (Write in ENGLISH):**
   - Characters: 'name', 'surname', 'given_name', 'english_name', 'description', 'physical_appearance', 'personality', 'occupation', 'speech_style', 'first_appearance' → English
   - Events: 'name', 'description', 'source_location', 'target_location' → English
   - Locations: 'name', 'description', 'atmosphere', 'significance' → English
   - Terms: 'translation', 'context', 'notes' → English
   - 'key_events_in_chunk': All array items → English
   - 'world_building_notes': All array items → English
   - 'style_guide': All fields → English
   - Honorifics: Values (explanations) → English
   - Recurring phrases: Values (translations) → English

2. **Keep Korean Fields (Original text):**
   - 'korean_name', 'korean_surname', 'korean_given_name'
   - Terms 'original'
   - Honorifics keys (Korean)
   - Recurring phrases keys (Korean)

3. **JSON Structure:** Keep JSON key names in English

**Examples:**
- Character "name": "Kim Bu-ja", "description": "A skilled gamer"
- Event "name": "The protagonist meets their rival for the first time"
- "key_events_in_chunk": ["The protagonist awakens a new power"]
`;
}

async function extractFromChunk(chunk: string, chunkIndex: number): Promise<{
  arcs: GlossaryArc[];
  honorifics?: { [key: string]: string };
  recurring_phrases?: { [key: string]: string };
  style_guide?: Partial<StyleGuide>;
}> {
  const targetLanguage = useGlossaryStore.getState().target_language;
  const languageDirective = getLanguageDirective(targetLanguage);
  
  const prompt = `당신은 한국 웹소설 번역 전문가입니다. 이 chunk를 읽고 **Arc 중심의 번역용 glossary**를 작성하세요.
${languageDirective}

⚠️ **CRITICAL**: 모든 인물/사건/장소/용어 정보는 **arcs 배열 내부**에만 저장하세요! ⚠️

**핵심 원칙:**
1. **arcs 필드는 필수** - 최소 1개 arc 반드시 포함
2. **모든 데이터는 arc 내부** - characters, events, locations, terms는 arc.characters, arc.events, arc.locations, arc.terms에만 저장
3. **간결함** - 각 항목 1-2문장, 핵심만
4. **분량 제한** - 인물 3-5명, 사건 3-5개, 용어 5개 이하

**반드시 유효한 JSON만 반환하세요. 코드 블록 없이 순수 JSON만 출력하세요.**

JSON 형식:
{
  "arcs": [
    {
      "id": "arc-${chunkIndex}-0",
      "name": "Arc Name (${targetLanguage})",
      "description": "What happens (2-3 sentences)",
      "theme": "Theme keyword",
      "start_chunk": ${chunkIndex},
      "characters": [
        {
          "id": "char-${chunkIndex}-0",
          "name": "Full Name",
          "korean_name": "한글이름",
          "description": "Background and role (1-2 sentences)",
          "physical_appearance": "Key features (optional)",
          "personality": "Key traits (1 sentence)",
          "traits": ["trait1", "trait2"],
          "emoji": "😊",
          "age": "20s/30s/unknown",
          "gender": "male/female/unknown",
          "role": "protagonist/major/supporting/antagonist",
          "age_group": "child/teen/adult/elder",
          "occupation": "Job (optional)",
          "abilities": ["ability1"],
          "speech_style": "How they speak (optional)",
          "name_variants": {"nickname": "Nick"},
          "honorifics_used": {"님": "when addressing"},
          "relationships": [
            {
              "character_name": "Target Name",
              "relationship_type": "friend/enemy/family",
              "description": "Their relationship",
              "sentiment": "positive/negative/neutral",
              "arc_id": "arc-${chunkIndex}-0"
            }
          ]
        }
      ],
      "events": [
        {
          "id": "event-${chunkIndex}-0",
          "name": "Event name",
          "description": "What happened (1-2 sentences)",
          "characters_involved": ["Char1", "Char2"],
          "location": "Location name (optional)",
          "importance": "major/minor"
        }
      ],
      "locations": [
        {
          "id": "location-${chunkIndex}-0",
          "name": "Location Name",
          "korean_name": "한글장소명 (optional)",
          "description": "Brief description",
          "emoji": "🏰",
          "type": "city/building/natural/room"
        }
      ],
      "key_events": ["Brief event 1", "Brief event 2"],
      "background_changes": ["Setting change 1"],
      "terms": [
        {
          "id": "term-${chunkIndex}-0",
          "original": "한글용어",
          "translation": "English",
          "context": "Usage",
          "category": "cultural/concept/title"
        }
      ]
    }
  ],
  "honorifics": {"님": "Honorific explanation"},
  "recurring_phrases": {"한글구절": "Translation"},
  "style_guide": {
    "name_format": "english_given_name english_surname",
    "tone": "standard",
    "formality_level": "medium"
  }
}

분석할 텍스트:
${chunk}`;

  try {
    if (!geminiAPI) {
      throw new Error('Gemini API not initialized');
    }

    console.log(`🔄 Processing chunk ${chunkIndex}...`);
    const model = geminiAPI.getGenerativeModel({ model: 'gemini-2.5-pro' });
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const content = response.text();
    
    console.log(`📝 LLM Response length: ${content.length} characters`);
    console.log(`📝 First 200 chars of response:`, content.substring(0, 200));

    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error('❌ No JSON found in LLM response');
      console.error('Full response:', content);
      throw new Error('No valid JSON in LLM response');
    }
    
    const jsonString = jsonMatch[0];
    console.log(`🔍 Parsing JSON (${jsonString.length} chars)...`);
    const parsed = JSON.parse(jsonString);
    console.log(`✅ JSON parsed successfully. Keys:`, Object.keys(parsed));

    // Parse arcs with full character/event/location data
    const arcs: GlossaryArc[] = (parsed.arcs || []).map((arc: any, idx: number) => ({
      id: arc.id || arc.name || `arc-${chunkIndex}-${idx}`,
      name: arc.name || 'Unknown Arc',
      description: arc.description || '',
      theme: arc.theme || '',
      characters: (arc.characters || []).map((char: any, charIdx: number) => ({
        id: char.id || `char-${chunkIndex}-${charIdx}`,
        name: char.name || 'Unknown',
        korean_name: char.korean_name || '',
        description: char.description || '',
        physical_appearance: char.physical_appearance || '',
        personality: char.personality || '',
        traits: char.traits || [],
        emoji: char.emoji || '👤',
        age: char.age || '',
        gender: char.gender || '',
        role: char.role || 'minor',
        age_group: char.age_group || 'adult',
        occupation: char.occupation || '',
        abilities: char.abilities || [],
        speech_style: char.speech_style || '',
        name_variants: char.name_variants || {},
        honorifics_used: char.honorifics_used || {},
        relationships: (char.relationships || []).map((rel: any) => ({
          character_name: rel.character_name || '',
          relationship_type: rel.relationship_type || 'unknown',
          description: rel.description || '',
          sentiment: rel.sentiment || 'neutral',
          arc_id: rel.arc_id || arc.id || arc.name || `arc-${chunkIndex}-${idx}`
        })),
      })),
      events: (arc.events || []).map((evt: any, evtIdx: number) => ({
        id: evt.id || `event-${chunkIndex}-${evtIdx}`,
        name: evt.name || 'Unknown Event',
        description: evt.description || '',
        characters_involved: evt.characters_involved || [],
        location: evt.location || '',
        importance: evt.importance || 'minor',
      })),
      locations: (arc.locations || []).map((loc: any, locIdx: number) => ({
        id: loc.id || `location-${chunkIndex}-${locIdx}`,
        name: loc.name || 'Unknown',
        korean_name: loc.korean_name || '',
        description: loc.description || '',
        emoji: loc.emoji || '📍',
        type: loc.type || '',
      })),
      relationships: (arc.relationships || []).map((rel: any) => ({
        character_a: rel.character_a || '',
        character_b: rel.character_b || '',
        relationship_type: rel.relationship_type || 'unknown',
        description: rel.description || '',
        sentiment: rel.sentiment || 'neutral',
      })),
      key_events: arc.key_events || [],
      background_changes: arc.background_changes || [],
      terms: (arc.terms || []).map((term: any, termIdx: number) => ({
        id: term.id || `term-${chunkIndex}-${termIdx}`,
        original: term.original || '',
        translation: term.translation || '',
        context: term.context || '',
        category: term.category || 'other',
      })),
      start_chunk: arc.start_chunk !== undefined ? arc.start_chunk : chunkIndex,
      end_chunk: arc.end_chunk,
    }));

    const honorifics = parsed.honorifics || {};
    const recurring_phrases = parsed.recurring_phrases || {};
    const style_guide = parsed.style_guide || {};

    // ⚠️ CRITICAL: Arc is mandatory. If no arc was extracted, create a fallback
    if (arcs.length === 0) {
      console.warn(`⚠️ No arcs extracted from chunk ${chunkIndex}. Creating fallback arc with minimal data.`);
      const fallbackArc: GlossaryArc = {
        id: `arc-chunk-${chunkIndex}`,
        name: `Story Arc ${chunkIndex + 1}`,
        description: `Narrative segment from chunk ${chunkIndex}`,
        theme: 'Unspecified',
        characters: [],
        events: [],
        locations: [],
        relationships: [],
        key_events: [],
        background_changes: [],
        terms: [],
        start_chunk: chunkIndex,
        end_chunk: chunkIndex
      };
      arcs.push(fallbackArc);
    }

    console.log(`✅ Chunk ${chunkIndex}: Extracted ${arcs.length} arcs`);
    arcs.forEach((arc, i) => {
      console.log(`   Arc ${i}: ${arc.name} - ${arc.characters.length} chars, ${arc.events.length} events, ${arc.locations.length} locations, ${arc.terms.length} terms`);
    });
    
    return { arcs, honorifics, recurring_phrases, style_guide };
  } catch (error) {
    console.error(`❌ Error extracting from chunk ${chunkIndex}:`, error);
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Stack trace:', error.stack);
    }
    return { arcs: [] };
  }
}

async function consolidateCharacters(characters: GlossaryCharacter[]): Promise<GlossaryCharacter[]> {
  if (characters.length === 0) return [];

  const targetLanguage = useGlossaryStore.getState().target_language;
  const languageDirective = getLanguageDirective(targetLanguage);
  const characterNames = characters.map(c => c.name).join(', ');
  
  // Get arcs to provide context for arc-based relationships
  const arcs = useGlossaryStore.getState().arcs;

  const prompt = `당신은 한국 웹소설 번역 전문가입니다. 여러 chunk에서 추출된 인물 정보들을 **Arc 중심으로 통합 및 정리**하세요.
${languageDirective} 

**🎯 핵심 원칙: Arc 맥락 유지**
- 📖 인물 정보를 통합하되 **arc별 맥락은 반드시 유지**
- 🔗 각 인물의 relationships에 **arc_id를 명확히 포함**하여 어떤 arc에서의 관계인지 추적
- 🎭 동일 인물도 arc마다 다른 역할/관계를 가질 수 있음

**🔥 작업 목표:**

1️⃣ **중복 인물 통합 (10-15명 목표)**
   - 동일 인물 판단: korean_name, english_name, name 비교
   - protagonist, antagonist, major role 우선 유지
   - 여러 arc/chunk에 등장한 인물 우선
   - 복수의 relationships를 가진 인물 우선

2️⃣ **정보 간결화**
   - description: 1-2문장
   - physical_appearance: 핵심만 (없으면 빈 문자열)
   - personality: 1문장
   - traits: 최대 3개

3️⃣ **Arc별 Relationship 유지 (중요!)**
   - 각 relationship에 **arc_id 반드시 포함**
   - arc_id는 해당 관계가 형성된 arc의 ID
   - 동일 인물 간에도 arc마다 다른 관계가 있을 수 있음
   - 각 인물당 최대 5-8개 관계

---

**Arc 정보 (참조용):**
${JSON.stringify(arcs.map(a => ({ id: a.id, name: a.name, chunk_range: `${a.start_chunk}-${a.end_chunk}` })), null, 2)}

**추출된 인물 (${characters.length}명):**
${characterNames}

**상세 정보:**
${JSON.stringify(characters.map(c => ({
  id: c.id,
  name: c.name,
  korean_name: c.korean_name,
  role: c.role,
  description: c.description,
  traits: c.traits,
  relationships: c.relationships.map(r => ({
    character_name: r.character_name,
    type: r.relationship_type,
    arc_id: r.arc_id || 'unknown'
  }))
})), null, 2)}

---

**반드시 유효한 JSON만 반환하세요. 코드 블록 없이 순수 JSON만 출력하세요.**

JSON 형식:
{
  "characters": [
    {
      "id": "keep existing ID when merging",
      "name": "Name",
      "korean_name": "한글 이름",
      "description": "Brief (1-2 sentences) in TARGET LANGUAGE",
      "physical_appearance": "Brief or empty in TARGET LANGUAGE",
      "personality": "Brief (1 sentence) in TARGET LANGUAGE",
      "traits": ["trait1", "trait2", "trait3"],
      "emoji": "😊",
      "role": "protagonist/antagonist/major/supporting",
      "speech_style": "Brief in TARGET LANGUAGE",
      "relationships": [
        {
          "character_name": "Target",
          "relationship_type": "Type",
          "description": "Brief",
          "sentiment": "positive/negative/neutral",
          "arc_id": "Arc name"
        }
      ]
    }
  ]
}`;

  try {
    if (!geminiAPI) {
      throw new Error('Gemini API not initialized');
    }

    console.log('🔄 Consolidating characters with arc context...');
    const model = geminiAPI.getGenerativeModel({ model: 'gemini-2.5-pro' });
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const content = response.text();

    console.log(`📝 LLM Response for character consolidation (${content.length} chars)`);
    console.log(`📝 First 300 chars:`, content.substring(0, 300));

    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error('❌ No JSON found in character consolidation response');
      console.error('Full response:', content);
      return characters;
    }
    
    const jsonString = jsonMatch[0];
    const parsed = JSON.parse(jsonString);
    
    console.log(`✅ Character consolidation JSON parsed. Keys:`, Object.keys(parsed));
    console.log(`📊 Consolidated character count: ${(parsed.characters || []).length}`);

    const consolidatedCharacters = (parsed.characters || []).map((char: any) => ({
      id: char.id || char.name,
      name: char.name || 'Unknown',
      korean_name: char.korean_name || '',
      description: char.description || '',
      personality: char.personality || '',
      traits: char.traits || [],
      emoji: char.emoji || '👤',
      role: char.role || 'minor',
      speech_style: char.speech_style || '',
      relationships: (char.relationships || []).map((rel: any) => ({
        character_name: rel.character_name || '',
        relationship_type: rel.relationship_type || 'unknown',
        description: rel.description || '',
        sentiment: rel.sentiment || 'neutral',
        arc_id: rel.arc_id || ''
      })),
    }));

    console.log(`✅ Character consolidation complete. Returning ${consolidatedCharacters.length} characters`);
    return consolidatedCharacters.length > 0 ? consolidatedCharacters : characters;
  } catch (error) {
    console.error('❌ Error consolidating characters:', error);
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Stack trace:', error.stack);
    }
    return characters;
  }
}

async function consolidateEvents(events: GlossaryEvent[], characters: GlossaryCharacter[]): Promise<GlossaryEvent[]> {
  if (events.length === 0) return [];

  const targetLanguage = useGlossaryStore.getState().target_language;
  const languageDirective = getLanguageDirective(targetLanguage);

  const prompt = `당신은 한국 웹소설 번역 전문가입니다. 사건들을 **공격적으로 통합 및 압축**하여 핵심만 남기세요.
${languageDirective}

**🎯 목표: 10-15개의 핵심 사건만 선별**
- ⚠️ 중복 제거 (유사한 사건은 하나로)
- ⚠️ 부차적 사건 제거 (플롯에 중요하지 않은 것)
- ⚠️ 시간순 정렬

등장 인물: ${characters.map(c => c.name).join(', ')}
추출된 사건 (${events.length}개):
${JSON.stringify(events.map(e => ({
  name: e.name,
  importance: e.importance,
  location: e.location || 'unknown'
})), null, 2)}

**선별 기준:**
✅ **반드시 포함**:
- 플롯 전환점
- 인물 관계 변화
- 주요 갈등 발생/해결

❌ **제거**:
- 중복/유사 사건
- 일상적 대화
- 단순 이동
- minor importance

**반드시 유효한 JSON만 반환하세요.**
JSON 형식:
{
  "events": [
    {
      "name": "Action verb + object",
      "description": "Brief (2-3 sentences)",
      "characters_involved": ["Char1", "Char2"],
      "source_location": "Location",
      "target_location": "Location",
      "importance": "major",
      "chunk_index": 0
    }
  ]
}`;

  try {
    if (!geminiAPI) {
      throw new Error('Gemini API not initialized');
    }

    const model = geminiAPI.getGenerativeModel({ model: 'gemini-2.5-pro' });
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

async function consolidateLocations(locations: GlossaryLocation[]): Promise<GlossaryLocation[]> {
  if (locations.length === 0) return [];
  
  const targetLanguage = useGlossaryStore.getState().target_language;
  const languageDirective = getLanguageDirective(targetLanguage);
  
  const prompt = `여러 chunk에서 추출된 장소 정보를 **정밀하게 통합**하세요.
${languageDirective}

추출된 장소 정보 (${locations.length}개):
${JSON.stringify(locations, null, 2)}

**통합 원칙:**
1. **중복 제거**: 동일 장소(이름 유사)는 하나로 통합
2. **정보 보존**: 모든 고유한 설명을 결합
3. **일관성**: 가장 구체적인 정보 선택

반드시 유효한 JSON만 반환하세요:
{
  "locations": [
    {
      "id": "기존 ID 유지",
      "name": "장소명",
      "korean_name": "한글 장소명",
      "type": "city/building/room/natural",
      "description": "통합된 설명",
      "atmosphere": "분위기",
      "significance": "중요성",
      "emoji": "🏰"
    }
  ]
}`;

  try {
    if (!geminiAPI) throw new Error('Gemini API not initialized');
    
    const model = geminiAPI.getGenerativeModel({ model: 'gemini-2.5-pro' });
    const result = await model.generateContent(prompt);
    const content = (await result.response).text();
    
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    const parsed = JSON.parse(jsonMatch ? jsonMatch[0] : '{}');
    
    return (parsed.locations || []).map((loc: any) => ({
      id: loc.id || `loc-${loc.name}`,
      name: loc.name || 'Unknown',
      korean_name: loc.korean_name || '',
      description: loc.description || '',
      emoji: loc.emoji || '📍',
      type: loc.type || '',
      atmosphere: loc.atmosphere || '',
      significance: loc.significance || '',
    }));
  } catch (error) {
    console.error('Error consolidating locations:', error);
    return locations;
  }
}

async function consolidateTerms(terms: GlossaryTerm[]): Promise<GlossaryTerm[]> {
  if (terms.length === 0) return [];
  
  const targetLanguage = useGlossaryStore.getState().target_language;
  const languageDirective = getLanguageDirective(targetLanguage);
  
  const prompt = `용어를 **공격적으로 통합 및 압축**하여 **최대 50개 이내**로 줄이세요.
${languageDirective}

추출된 용어 (${terms.length}개):
${JSON.stringify(terms.map(t => ({ original: t.original, translation: t.translation, category: t.category })), null, 2)}

**🎯 목표: 최대 50개**
- 중복 제거 (동일 original)
- 중요도 낮은 용어 제거
- 번역 필수 용어만 유지

**선별 기준:**
✅ **포함**: 고유명사, 문화 특수 용어, 번역 주의 필요
❌ **제외**: 일반 단어, 사전에 있는 표현

반드시 유효한 JSON만 반환하세요:
{
  "terms": [
    {
      "id": "term-id",
      "original": "한글",
      "translation": "Translation",
      "context": "Brief",
      "category": "category"
    }
  ]
}`;

  try {
    if (!geminiAPI) throw new Error('Gemini API not initialized');
    
    const model = geminiAPI.getGenerativeModel({ model: 'gemini-2.5-pro' });
    const result = await model.generateContent(prompt);
    const content = (await result.response).text();
    
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    const parsed = JSON.parse(jsonMatch ? jsonMatch[0] : '{}');
    
    return (parsed.terms || []).map((term: any) => ({
      id: term.id || `term-${term.original}`,
      original: term.original || '',
      translation: term.translation || '',
      context: term.context || '',
      category: term.category || 'other',
      first_appearance: term.first_appearance || '',
      notes: term.notes || '',
    }));
  } catch (error) {
    console.error('Error consolidating terms:', error);
    return terms;
  }
}

async function consolidateArcs(arcs: GlossaryArc[]): Promise<GlossaryArc[]> {
  if (arcs.length === 0) return [];
  if (arcs.length <= 3) return arcs; // Too few to consolidate
  
  const targetLanguage = useGlossaryStore.getState().target_language;
  const languageDirective = getLanguageDirective(targetLanguage);
  
  const prompt = `당신은 한국 웹소설 번역 전문가입니다. 여러 chunk에서 추출된 Arc들을 **Arc 중심의 Glossary로 정리 및 병합**하세요.
${languageDirective}

**🎯 핵심 원칙: Arc = Glossary의 기본 단위**
- 📖 각 Arc는 독립적인 glossary 단위
- 🎭 각 Arc는 자체적으로 characters, relationships, terms를 가짐
- 🔗 Arc별로 등장인물, 관계, 배경 변화, 용어를 명확히 유지

**📊 작업 목표:**

1️⃣ **Arc 병합 및 정리 (5-8개 목표)**
   - 유사하거나 연속된 arc 병합
   - 너무 짧은 arc는 인접 arc와 통합
   - 시간순 정렬
   - 각 arc는 명확한 narrative 단계를 나타냄

2️⃣ **각 Arc별 Character 정보 유지**
   - 이 arc에 등장하는 주요 인물 (5-8명)
   - role_in_arc: 이 arc에서의 역할 명시
   - first_appearance: 처음 등장하는 인물 표시

3️⃣ **각 Arc별 Relationship 유지 (5-8개)**
   - 이 arc에서 형성되거나 변화하는 관계만
   - character_a, character_b, relationship_type, description, sentiment

4️⃣ **각 Arc별 Key Events (3-5개)**
   - 이 arc의 핵심 사건
   - 간결하고 명확하게

5️⃣ **각 Arc별 Background Changes (있는 경우만)**
   - 새로운 배경이나 중요한 장소 변화

6️⃣ **각 Arc별 Terms (3-5개)**
   - 이 arc에서 중요한 번역 주의 용어
   - 전체 작품에서 50개 이내 목표

---

**추출된 Arc 정보 (${arcs.length}개):**

${JSON.stringify(arcs.map(a => ({
  name: a.name,
  description: a.description,
  theme: a.theme,
  chunk_range: `${a.start_chunk}-${a.end_chunk}`,
  characters: a.characters,
  relationships: a.relationships,
  key_events: a.key_events,
  background_changes: a.background_changes,
  terms: a.terms
})), null, 2)}

---

**병합 시 주의사항:**
- Arc 병합 시 characters, relationships, terms도 함께 병합
- 중복 character는 하나로 통합하되 role_in_arc는 유지
- 중복 relationship는 제거
- 중복 term은 제거
- Arc별 정보의 독립성과 명확성 유지

**반드시 유효한 JSON만 반환하세요. 코드 블록 없이 순수 JSON만 출력하세요.**

JSON 형식:
{
  "arcs": [
    {
      "name": "Arc name in TARGET LANGUAGE",
      "description": "Brief arc description in TARGET LANGUAGE (2-3 sentences)",
      "theme": "Theme in TARGET LANGUAGE",
      "characters": [
        {"name": "Character Name", "role_in_arc": "their role in this arc", "first_appearance": true}
      ],
      "relationships": [
        {"character_a": "A", "character_b": "B", "relationship_type": "type", "description": "brief", "sentiment": "positive"}
      ],
      "key_events": ["Event 1 in TARGET LANGUAGE", "Event 2 in TARGET LANGUAGE"],
      "background_changes": ["Change 1 in TARGET LANGUAGE"],
      "terms": [
        {"original": "한글", "translation": "Translation", "context": "Context in TARGET LANGUAGE"}
      ],
      "start_chunk": 0,
      "end_chunk": 5
    }
  ]
}`;

  try {
    if (!geminiAPI) throw new Error('Gemini API not initialized');
    
    console.log('🔄 Consolidating arcs with LLM...');
    const model = geminiAPI.getGenerativeModel({ model: 'gemini-2.5-pro' });
    const result = await model.generateContent(prompt);
    const content = (await result.response).text();
    
    console.log(`📝 LLM Response for arc consolidation (${content.length} chars)`);
    console.log(`📝 First 300 chars:`, content.substring(0, 300));
    
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error('❌ No JSON found in arc consolidation response');
      console.error('Full response:', content);
      return arcs;
    }
    
    const parsed = JSON.parse(jsonMatch[0]);
    console.log(`✅ Arc consolidation JSON parsed. Keys:`, Object.keys(parsed));
    console.log(`📊 Consolidated arc count: ${(parsed.arcs || []).length}`);
    
    const consolidatedArcs = (parsed.arcs || []).map((arc: any) => ({
      id: arc.name || arc.id,
      name: arc.name || 'Unknown Arc',
      description: arc.description || '',
      theme: arc.theme || '',
      characters: (arc.characters || []).map((char: any) => ({
        name: char.name || '',
        role_in_arc: char.role_in_arc || '',
        first_appearance: char.first_appearance || false,
      })),
      relationships: (arc.relationships || []).map((rel: any) => ({
        character_a: rel.character_a || '',
        character_b: rel.character_b || '',
        relationship_type: rel.relationship_type || 'unknown',
        description: rel.description || '',
        sentiment: rel.sentiment || 'neutral',
      })),
      key_events: arc.key_events || [],
      background_changes: arc.background_changes || [],
      terms: (arc.terms || []).map((term: any) => ({
        original: term.original || '',
        translation: term.translation || '',
        context: term.context || '',
      })),
      start_chunk: arc.start_chunk,
      end_chunk: arc.end_chunk,
    }));
    
    console.log('✅ Arc consolidation complete');
    return consolidatedArcs;
  } catch (error) {
    console.error('❌ Error consolidating arcs:', error);
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Stack trace:', error.stack);
    }
    return arcs;
  }
}

export const useGlossaryStore = create<GlossaryState & GlossaryAction>()((set, get) => ({
  ...initialState,
  reset: () => set({ ...initialState }),
  setFullText: (text) => set({ fullText: text }),
  setTotalChunks: (total) => set({ totalChunks: total }),
  setTargetLanguage: (language) => set({ target_language: language }),

  processChunk: async (chunk, chunkIndex) => {
    console.log(`🚀 processChunk called for chunk ${chunkIndex}, text length: ${chunk.length}`);
    set({ isLoading: true });

    if (!geminiAPI) {
      console.error('❌ Gemini API is not initialized! Please set API key first.');
      set({ isLoading: false });
      return;
    }

    const { arcs, honorifics, recurring_phrases, style_guide } = await extractFromChunk(chunk, chunkIndex);
    console.log(`📦 Received from extractFromChunk: ${arcs?.length || 0} arcs`);

    // Add or update arcs
    if (arcs && arcs.length > 0) {
      const existingArcs = get().arcs;
      arcs.forEach((newArc) => {
        const existing = existingArcs.find(
          (a) => a.name.toLowerCase() === newArc.name.toLowerCase()
        );
        if (existing) {
          // Merge characters (full GlossaryCharacter objects)
          const existingCharNames = new Set(existing.characters.map(c => c.name.toLowerCase()));
          const mergedCharacters = [
            ...existing.characters,
            ...newArc.characters.filter(nc => !existingCharNames.has(nc.name.toLowerCase()))
          ];

          // Merge events
          const existingEventNames = new Set(existing.events?.map(e => e.name.toLowerCase()) || []);
          const mergedEvents = [
            ...(existing.events || []),
            ...(newArc.events || []).filter(ne => !existingEventNames.has(ne.name.toLowerCase()))
          ];

          // Merge locations
          const existingLocationNames = new Set(existing.locations?.map(l => l.name.toLowerCase()) || []);
          const mergedLocations = [
            ...(existing.locations || []),
            ...(newArc.locations || []).filter(nl => !existingLocationNames.has(nl.name.toLowerCase()))
          ];

          // Merge relationships
          const existingRelKeys = new Set(
            existing.relationships.map(r => `${r.character_a}|${r.character_b}`.toLowerCase())
          );
          const mergedRelationships = [
            ...existing.relationships,
            ...newArc.relationships.filter(nr => {
              const key = `${nr.character_a}|${nr.character_b}`.toLowerCase();
              return !existingRelKeys.has(key);
            })
          ];

          // Merge terms
          const existingTerms = new Set(existing.terms.map(t => t.original.toLowerCase()));
          const mergedTerms = [
            ...existing.terms,
            ...newArc.terms.filter(nt => !existingTerms.has(nt.original.toLowerCase()))
          ];

          // Update existing arc
          get().updateArc(existing.id, {
            description: newArc.description || existing.description,
            theme: newArc.theme || existing.theme,
            characters: mergedCharacters,
            events: mergedEvents,
            locations: mergedLocations,
            relationships: mergedRelationships,
            terms: mergedTerms,
            end_chunk: chunkIndex,
            key_events: [...new Set([...(existing.key_events || []), ...(newArc.key_events || [])])],
            background_changes: [...new Set([...(existing.background_changes || []), ...(newArc.background_changes || [])])],
          });
        } else {
          get().addArc(newArc);
        }
      });
    }

    // Merge honorifics and recurring phrases
    if (honorifics) {
      set((state) => ({
        honorifics: { ...state.honorifics, ...honorifics }
      }));
    }

    if (recurring_phrases) {
      set((state) => ({
        recurring_phrases: { ...state.recurring_phrases, ...recurring_phrases }
      }));
    }

    // Merge style guide information
    if (style_guide && Object.keys(style_guide).length > 0) {
      set((state) => ({
        style_guide: {
          ...state.style_guide,
          ...style_guide,
          themes: [...new Set([...(state.style_guide.themes || []), ...(style_guide.themes || [])])],
          sub_genres: [...new Set([...(state.style_guide.sub_genres || []), ...(style_guide.sub_genres || [])])],
          narrative_style: {
            ...state.style_guide.narrative_style,
            ...(style_guide.narrative_style || {}),
            common_expressions: [...new Set([
              ...(state.style_guide.narrative_style?.common_expressions || []),
              ...(style_guide.narrative_style?.common_expressions || [])
            ])],
            atmosphere_descriptors: [...new Set([
              ...(state.style_guide.narrative_style?.atmosphere_descriptors || []),
              ...(style_guide.narrative_style?.atmosphere_descriptors || [])
            ])]
          }
        }
      }));
    }

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
      console.log('🔄 Starting Arc-centric consolidation...');

      // Consolidate Arcs (All data is within arcs)
      console.log('📋 Consolidating arcs...');
      const consolidatedArcs = await consolidateArcs(state.arcs);
      console.log(`✅ Arcs consolidated: ${state.arcs.length} → ${consolidatedArcs.length}`);
      
      // Count totals from within arcs
      const totalCharacters = consolidatedArcs.reduce((sum, arc) => sum + (arc.characters?.length || 0), 0);
      const totalEvents = consolidatedArcs.reduce((sum, arc) => sum + (arc.events?.length || 0), 0);
      const totalLocations = consolidatedArcs.reduce((sum, arc) => sum + (arc.locations?.length || 0), 0);
      const totalTerms = consolidatedArcs.reduce((sum, arc) => sum + (arc.terms?.length || 0), 0);

      console.log('✅ Arc-centric consolidation complete!');
      console.log(`📊 Final counts: ${consolidatedArcs.length} arcs, ${totalCharacters} characters, ${totalEvents} events, ${totalLocations} locations, ${totalTerms} terms`);

      set({
        arcs: consolidatedArcs,
        isLoading: false,
      });
    } catch (error) {
      console.error('❌ Error consolidating results:', error);
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

  addArc: (arc) => {
    set((state) => ({
      arcs: [...state.arcs, arc],
    }));
  },

  updateCharacter: (id, updates) => {
    set((state) => {
      const updatedCharacters = state.characters.map((char) =>
        char.id === id ? { ...char, ...updates, id: char.id } : char
      );
      console.log('Updated character:', id, updates);
      return { characters: updatedCharacters };
    });
  },

  updateEvent: (id, updates) => {
    set((state) => {
      const updatedEvents = state.events.map((event) =>
        event.id === id ? { ...event, ...updates, id: event.id } : event
      );
      console.log('Updated event:', id, updates);
      return { events: updatedEvents };
    });
  },

  updateLocation: (id, updates) => {
    set((state) => {
      const updatedLocations = state.locations.map((loc) =>
        loc.id === id ? { ...loc, ...updates, id: loc.id } : loc
      );
      console.log('Updated location:', id, updates);
      return { locations: updatedLocations };
    });
  },

  updateTerm: (id, updates) => {
    set((state) => {
      const updatedTerms = state.terms.map((term) =>
        term.id === id ? { ...term, ...updates, id: term.id } : term
      );
      console.log('Updated term:', id, updates);
      return { terms: updatedTerms };
    });
  },

  updateArc: (id, updates) => {
    set((state) => {
      const updatedArcs = state.arcs.map((arc) =>
        arc.id === id ? { ...arc, ...updates, id: arc.id } : arc
      );
      console.log('Updated arc:', id, updates);
      return { arcs: updatedArcs };
    });
  },

  deleteCharacter: (id) => {
    set((state) => {
      const filtered = state.characters.filter((char) => char.id !== id);
      console.log('Deleted character:', id);
      return { characters: filtered };
    });
  },

  deleteEvent: (id) => {
    set((state) => {
      const filtered = state.events.filter((event) => event.id !== id);
      console.log('Deleted event:', id);
      return { events: filtered };
    });
  },

  deleteLocation: (id) => {
    set((state) => {
      const filtered = state.locations.filter((loc) => loc.id !== id);
      console.log('Deleted location:', id);
      return { locations: filtered };
    });
  },

  deleteTerm: (id) => {
    set((state) => {
      const filtered = state.terms.filter((term) => term.id !== id);
      console.log('Deleted term:', id);
      return { terms: filtered };
    });
  },

  deleteArc: (id) => {
    set((state) => {
      const filtered = state.arcs.filter((arc) => arc.id !== id);
      console.log('Deleted arc:', id);
      return { arcs: filtered };
    });
  },

  updateStorySummary: (summary) => {
    set((state) => ({
      story_summary: { ...state.story_summary, ...summary }
    }));
  },

  updateStyleGuide: (guide) => {
    set((state) => ({
      style_guide: { ...state.style_guide, ...guide }
    }));
  },


  addHonorific: (korean, explanation) => {
    set((state) => ({
      honorifics: { ...state.honorifics, [korean]: explanation }
    }));
  },

  updateHonorific: (oldKorean, korean, explanation) => {
    set((state) => {
      const newHonorifics = { ...state.honorifics };
      if (oldKorean !== korean) {
        delete newHonorifics[oldKorean];
      }
      newHonorifics[korean] = explanation;
      return { honorifics: newHonorifics };
    });
  },

  deleteHonorific: (korean) => {
    set((state) => {
      const newHonorifics = { ...state.honorifics };
      delete newHonorifics[korean];
      return { honorifics: newHonorifics };
    });
  },

  addRecurringPhrase: (korean, translation) => {
    set((state) => ({
      recurring_phrases: { ...state.recurring_phrases, [korean]: translation }
    }));
  },

  updateRecurringPhrase: (oldKorean, korean, translation) => {
    set((state) => {
      const newPhrases = { ...state.recurring_phrases };
      if (oldKorean !== korean) {
        delete newPhrases[oldKorean];
      }
      newPhrases[korean] = translation;
      return { recurring_phrases: newPhrases };
    });
  },

  deleteRecurringPhrase: (korean) => {
    set((state) => {
      const newPhrases = { ...state.recurring_phrases };
      delete newPhrases[korean];
      return { recurring_phrases: newPhrases };
    });
  },

  mergeCharacters: (existingId, newCharacter) => {
    set((state) => ({
      characters: state.characters.map((char) => {
        if (char.id === existingId) {
          const existingRelNames = new Set(char.relationships.map(r => r.character_name.toLowerCase()));
          const newRels = (newCharacter.relationships || []).filter(
            r => !existingRelNames.has(r.character_name.toLowerCase())
          );

          return {
            ...char,
            description: newCharacter.description || char.description,
            personality: newCharacter.personality || char.personality,
            traits: [...new Set([...char.traits, ...(newCharacter.traits || [])])],
            role: newCharacter.role || char.role,
            speech_style: newCharacter.speech_style || char.speech_style,
            emoji: newCharacter.emoji || char.emoji,
            korean_name: newCharacter.korean_name || char.korean_name,
            relationships: [
              ...char.relationships,
              ...newRels,
            ],
          };
        }
        return char;
      }),
    }));
  },

  convertToModelFormat: () => {
    const state = get();

    // Extract all characters from all arcs
    const allCharacters: GlossaryCharacter[] = [];
    const allEvents: GlossaryEvent[] = [];
    const allLocations: GlossaryLocation[] = [];
    const seenCharNames = new Set<string>();
    const seenEventIds = new Set<string>();
    const seenLocationNames = new Set<string>();

    state.arcs.forEach(arc => {
      // Collect unique characters
      (arc.characters || []).forEach(char => {
        if (!seenCharNames.has(char.name.toLowerCase())) {
          allCharacters.push(char);
          seenCharNames.add(char.name.toLowerCase());
        }
      });

      // Collect unique events
      (arc.events || []).forEach(event => {
        if (!seenEventIds.has(event.id)) {
          allEvents.push(event);
          seenEventIds.add(event.id);
        }
      });

      // Collect unique locations
      (arc.locations || []).forEach(loc => {
        if (!seenLocationNames.has(loc.name.toLowerCase())) {
          allLocations.push(loc);
          seenLocationNames.add(loc.name.toLowerCase());
        }
      });
    });

    const entityNodes: EntityNode[] = allCharacters.map((char, idx) => ({
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

    const locationNodes: LocationNode[] = allLocations.map((loc, idx) => ({
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

    const actionEdges: ActionEdge[] = allEvents.map((event, idx) => {
      const sourceChar = event.characters_involved[0];
      const targetChar = event.characters_involved[1] || event.characters_involved[0];

      return {
        id: `action-${idx}`,
        type: 'actionEdge',
        source: `entity-${sourceChar}`,
        target: `entity-${targetChar}`,
        animated: true,
        markerEnd: { type: MarkerType.ArrowClosed },
        data: {
          name: event.name,
          passage: event.description,
          sourceLocation: event.location || '',
          targetLocation: event.location || ''
        }
      } as ActionEdge;
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
        arcs: data.arcs || [],
        story_summary: data.story_summary || { logline: '', blurb: '' },
        honorifics: data.honorifics || {},
        recurring_phrases: data.recurring_phrases || {},
        style_guide: data.style_guide || initialState.style_guide,
        target_language: data.target_language || 'en',
      });
    } catch (error) {
      console.error('Error importing JSON:', error);
      alert('Invalid JSON format');
    }
  },

  exportToJSON: () => {
    const state = get();
    const data = {
      target_language: state.target_language,
      arcs: state.arcs,
      story_summary: state.story_summary,
      honorifics: state.honorifics,
      recurring_phrases: state.recurring_phrases,
      style_guide: state.style_guide,
    };
    return JSON.stringify(data, null, 2);
  },
}));
