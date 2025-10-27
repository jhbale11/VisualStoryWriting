import { GoogleGenerativeAI } from '@google/generative-ai';
import { create } from 'zustand';
import type { EntityNode, ActionEdge, LocationNode } from './Model';
import { MarkerType } from '@xyflow/react';

let geminiAPI: GoogleGenerativeAI | null = null;

export const initGemini = (apiKey: string) => {
  geminiAPI = new GoogleGenerativeAI(apiKey);
};

export interface GlossaryCharacter {
  id: string;
  name: string;
  korean_name?: string;
  korean_surname?: string;
  korean_given_name?: string;
  english_name?: string;
  surname?: string;
  given_name?: string;
  description: string;
  physical_appearance: string;
  personality: string;
  traits: string[];
  emoji: string;
  age?: string;
  gender?: string;
  role?: 'protagonist' | 'antagonist' | 'major' | 'supporting' | 'minor';
  age_group?: 'child' | 'teen' | 'young_adult' | 'adult' | 'elderly';
  occupation?: string;
  abilities?: string[];
  speech_style?: string; // e.g., "formal", "casual", "rough", "archaic"
  name_variants?: { [key: string]: string }; // e.g., {"nickname": "별명", "title": "직함"}
  honorifics_used?: { [characterId: string]: string }; // e.g., {"char_2": "-님"}
  first_appearance?: string; // e.g., "Chapter 1 during school entrance"
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
  korean_name?: string;
  description: string;
  emoji: string;
  type?: string; // e.g., "city", "building", "room", "natural"
  atmosphere?: string; // e.g., "bustling and modern", "ancient and mysterious"
  significance?: string; // e.g., "protagonist's hometown"
}

export interface GlossaryTerm {
  id: string;
  original: string; // Korean term
  translation: string; // English translation
  context: string;
  category: 'name' | 'place' | 'item' | 'concept' | 'martial_arts' | 'cultural' | 'technical' | 'other';
  first_appearance?: string;
  notes?: string;
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

export interface GlossaryState {
  characters: GlossaryCharacter[];
  events: GlossaryEvent[];
  locations: GlossaryLocation[];
  terms: GlossaryTerm[];
  story_summary: StorySummary;
  key_events_and_arcs: string[]; // List of major story arcs
  honorifics: { [key: string]: string }; // e.g., {"님": "formal honorific suffix..."}
  recurring_phrases: { [korean: string]: string }; // e.g., {"그때 그 순간": "at that very moment"}
  world_building_notes: string[]; // General world-building observations
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
  addCharacter: (character: GlossaryCharacter) => void;
  addEvent: (event: GlossaryEvent) => void;
  addLocation: (location: GlossaryLocation) => void;
  addTerm: (term: GlossaryTerm) => void;
  updateCharacter: (id: string, updates: Partial<GlossaryCharacter>) => void;
  updateEvent: (id: string, updates: Partial<GlossaryEvent>) => void;
  updateLocation: (id: string, updates: Partial<GlossaryLocation>) => void;
  updateTerm: (id: string, updates: Partial<GlossaryTerm>) => void;
  updateStorySummary: (summary: Partial<StorySummary>) => void;
  updateStyleGuide: (guide: Partial<StyleGuide>) => void;
  addKeyEvent: (event: string) => void;
  updateKeyEvent: (index: number, event: string) => void;
  deleteKeyEvent: (index: number) => void;
  addWorldBuildingNote: (note: string) => void;
  updateWorldBuildingNote: (index: number, note: string) => void;
  deleteWorldBuildingNote: (index: number) => void;
  addHonorific: (korean: string, explanation: string) => void;
  updateHonorific: (oldKorean: string, korean: string, explanation: string) => void;
  deleteHonorific: (korean: string) => void;
  addRecurringPhrase: (korean: string, translation: string) => void;
  updateRecurringPhrase: (oldKorean: string, korean: string, translation: string) => void;
  deleteRecurringPhrase: (korean: string) => void;
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
  story_summary: { logline: '', blurb: '' },
  key_events_and_arcs: [],
  honorifics: {},
  recurring_phrases: {},
  world_building_notes: [],
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
  characters: GlossaryCharacter[];
  events: GlossaryEvent[];
  locations: GlossaryLocation[];
  terms: GlossaryTerm[];
  honorifics?: { [key: string]: string };
  recurring_phrases?: { [key: string]: string };
  world_building_notes?: string[];
  key_events_in_chunk?: string[];
  style_guide?: Partial<StyleGuide>;
}> {
  const targetLanguage = useGlossaryStore.getState().target_language;
  const languageDirective = getLanguageDirective(targetLanguage);
  
  const prompt = `당신은 한국 웹소설 번역 전문가이자 세심한 데이터 추출가입니다. 이 한국어 소설 chunk를 읽고 **번역을 위한 용어집(glossary)을 작성**하세요. 인물, 사건, 장소, 용어, 세계관에 관한 모든 정보를 **대상 언어로 번역하여** 기록하세요.
${languageDirective}

**핵심 목표:** 
이 glossary는 번역가가 참고할 유일한 자료입니다. 따라서:
- ✅ 모든 설명을 **대상 언어**로 작성
- ✅ 원문(한국어)은 지정된 필드에만 보존
- ✅ 요약하지 말고 구체적이고 상세하게 기록
- ✅ 번역의 일관성을 위해 정확한 용어 선택

**추출 우선순위 (초상세하게 기록):**

1. **인물 증거 (Character Evidence)**:
   - **행동 & 행위**: 구체적 행동 기록 (예: "그는 주먹을 꽉 쥐어 손가락 마디가 하얗게 변했다")
   - **대화 & 말투 패턴**: 직접 인용문 추출, 특이한 말버릇이나 서술에 명시된 어조 기록
   - **내적 독백**: 인물의 내면 생각을 그대로 추출
   - **외형 & 특성 묘사**: 외모, 능력, 기술, 직업에 대한 모든 세부사항 기록
   - **관계 역학**: 구체적인 상호작용 기록. "라이벌"이 아니라 "캐릭터 A가 캐릭터 B를 노려보며 반드시 뛰어넘겠다고 다짐했다"로 기록
   - **어투 (speech_style)**: 격식체/반말/거친 말투/고어체 등 파악
   - **첫 등장 (first_appearance)**: 이 인물이 처음 등장한 맥락 기록

2. **서사 & 플롯 증거**:
   - **핵심 사건**: 플롯을 진전시키는 사건 기록
   - **밝혀진 정보**: 새로운 설정, 배경, 플래시백 등 기록
   - **영향력 있는 대사/상황**: 인물이나 순간을 정의하는 강렬한 대사나 감정적 상황 추출

3. **세계관 구축 증거**:
   - **장소**: 분위기, 목적, 묘사 상세히 기록
   - **용어 & 아이템**: 고유 용어, 마법 아이템, 기술과 그 기능 기록
   - **경어 (honorifics)**: 한국어 경어(님, 씨 등)와 그 뉘앙스 기록
   - **반복 구문**: 작품에서 반복되는 표현 기록
   - **문체적 특징**: 서술 시점, 시제, 분위기 형용사, 자주 쓰는 표현 등

**반드시 유효한 JSON만 반환하세요. 코드 블록 없이 순수 JSON만 출력하세요.**

JSON 형식:
{
  "characters": [
    {
      "name": "인물 이름",
      "korean_name": "한글 이름",
      "korean_surname": "성",
      "korean_given_name": "이름",
      "english_name": "English Name (있다면)",
      "surname": "Family Name",
      "given_name": "Given Name",
      "description": "인물의 역할과 특징에 대한 간략한 설명",
      "physical_appearance": "외형 묘사",
      "personality": "성격 설명",
      "traits": ["특성1", "특성2", "특성3"],
      "emoji": "😊",
      "age": "나이",
      "gender": "male/female/other",
      "role": "protagonist/antagonist/major/supporting/minor",
      "age_group": "child/teen/young_adult/adult/elderly",
      "occupation": "직업 (예: Executive Director of K Group, A-rank Esper, Secretary)",
      "abilities": ["능력1", "능력2"],
      "speech_style": "격식체/반말/거친 말투/유치한 말투/고어체 등",
      "name_variants": {"nickname": "별명", "title": "직함"},
      "honorifics_used": {"char_2": "-님", "char_3": "-야"},
      "first_appearance": "Chapter 1, during school entrance",
      "relationships": [
        {
          "character_name": "관계 대상 인물 이름",
          "relationship_type": "친구/적/가족/연인/동료/라이벌/숙명의 라이벌/적대적 연인 등",
          "description": "관계 설명 (한글)",
          "sentiment": "positive/negative/neutral"
        }
      ]
    }
  ],
  "events": [
    {
      "name": "Event name in TARGET LANGUAGE (action-oriented, e.g., 'Protagonist meets rival for the first time')",
      "description": "Detailed description in TARGET LANGUAGE of what happened",
      "characters_involved": ["Character1 name", "Character2 name"],
      "source_location": "Starting location in TARGET LANGUAGE",
      "target_location": "Ending location in TARGET LANGUAGE (if movement occurs)",
      "importance": "major or minor"
    }
  ],
  "locations": [
    {
      "name": "장소 이름",
      "korean_name": "한글 장소명",
      "type": "city/building/room/natural",
      "description": "장소 설명",
      "atmosphere": "분위기 (예: 경쟁적이고 스트레스가 많은)",
      "significance": "중요성 (예: 주인공이 공부하는 주요 배경)",
      "emoji": "🏰"
    }
  ],
  "terms": [
    {
      "original": "한글 용어",
      "translation": "English Translation",
      "context": "문맥",
      "category": "name/place/item/concept/martial_arts/cultural/technical/other",
      "first_appearance": "Chapter 1 during school entrance",
      "notes": "번역 시 유의사항"
    }
  ],
  "honorifics": {
    "님": "formal honorific suffix for names and titles (Keep the original Korean nuance)",
    "씨": "polite address for equals (Don't use romanized -ssi)"
  },
  "recurring_phrases": {
    "그때 그 순간": "at that very moment",
    "어쩔 수 없었다": "there was no choice"
  },
  "key_events_in_chunk": [
    "Write in TARGET LANGUAGE: Brief description of major plot event 1 that occurred in this chunk",
    "Write in TARGET LANGUAGE: Brief description of major plot event 2 that occurred in this chunk"
  ],
  "world_building_notes": [
    "현대 기업 세계 배경, 'K그룹'이라는 재벌 중심",
    "재벌 후계자와 비서 간의 명확한 권력 역학 묘사"
  ],
  "style_guide": {
    "tone": "진지하면서 가끔 유머가 있는",
    "formality_level": "medium",
    "narrative_vocabulary": "중간 수준, 필요시 격상",
    "themes": ["성장", "우정", "경쟁"],
    "genre": "School Life",
    "sub_genres": ["slice of life", "drama"],
    "narrative_style": {
      "point_of_view": "3인칭",
      "tense": "과거",
      "voice": "내성적/서술적",
      "common_expressions": ["그때", "그 순간"],
      "atmosphere_descriptors": ["긴장감 넘치는", "우울한", "따뜻한"]
    }
  }
}

분석할 텍스트:
${chunk}`;

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

    const characters: GlossaryCharacter[] = (parsed.characters || []).map((char: any, idx: number) => ({
      id: `char-${chunkIndex}-${idx}`,
      name: char.name || 'Unknown',
      korean_name: char.korean_name || '',
      korean_surname: char.korean_surname || '',
      korean_given_name: char.korean_given_name || '',
      english_name: char.english_name || '',
      surname: char.surname || '',
      given_name: char.given_name || '',
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
      speech_style: char.speech_style || 'standard',
      name_variants: char.name_variants || {},
      honorifics_used: char.honorifics_used || {},
      first_appearance: char.first_appearance || '',
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
      korean_name: loc.korean_name || '',
      description: loc.description || '',
      emoji: loc.emoji || '📍',
      type: loc.type || '',
      atmosphere: loc.atmosphere || '',
      significance: loc.significance || '',
    }));

    const terms: GlossaryTerm[] = (parsed.terms || []).map((term: any, idx: number) => ({
      id: `term-${chunkIndex}-${idx}`,
      original: term.original || '',
      translation: term.translation || '',
      context: term.context || '',
      category: term.category || 'other',
      first_appearance: term.first_appearance || '',
      notes: term.notes || '',
    }));

    const honorifics = parsed.honorifics || {};
    const recurring_phrases = parsed.recurring_phrases || {};
    const world_building_notes = parsed.world_building_notes || [];
    const key_events_in_chunk = parsed.key_events_in_chunk || [];
    const style_guide = parsed.style_guide || {};

    return { characters, events, locations, terms, honorifics, recurring_phrases, world_building_notes, key_events_in_chunk, style_guide };
  } catch (error) {
    console.error('Error extracting from chunk:', error);
    return { characters: [], events: [], locations: [], terms: [] };
  }
}

async function consolidateCharacters(characters: GlossaryCharacter[]): Promise<GlossaryCharacter[]> {
  if (characters.length === 0) return [];

  const targetLanguage = useGlossaryStore.getState().target_language;
  const languageDirective = getLanguageDirective(targetLanguage);
  const characterNames = characters.map(c => c.name).join(', ');

  const prompt = `당신은 한국 웹소설 번역 전문가입니다. 여러 chunk에서 추출된 인물 정보들을 **정밀하게 통합**하여 각 인물의 완전하고 일관된 프로필을 생성하세요.
${languageDirective} 

**핵심 원칙:**
🎯 **정보 보존**: 모든 유용한 정보를 유지 (삭제하지 말 것)
🔄 **중복 제거**: 동일한 정보는 한 번만 포함
✨ **일관성**: 모순되는 정보는 가장 구체적이고 빈번한 것을 선택
📚 **완전성**: 모든 필드를 빠짐없이 채우기

등장 인물: ${characterNames}

추출된 인물 정보 (${characters.length}개 항목):
${JSON.stringify(characters.map(c => ({
  id: c.id,
  name: c.name,
  korean_name: c.korean_name,
  korean_surname: c.korean_surname,
  korean_given_name: c.korean_given_name,
  english_name: c.english_name,
  surname: c.surname,
  given_name: c.given_name,
  description: c.description,
  physical_appearance: c.physical_appearance,
  personality: c.personality,
  traits: c.traits,
  emoji: c.emoji,
  age: c.age,
  gender: c.gender,
  role: c.role,
  age_group: c.age_group,
  occupation: c.occupation,
  abilities: c.abilities,
  speech_style: c.speech_style,
  name_variants: c.name_variants,
  honorifics_used: c.honorifics_used,
  first_appearance: c.first_appearance,
  relationships: c.relationships
})), null, 2)}

**통합 작업 (단계별):**

**1단계: 인물 식별 & 중복 제거**
- 동일 인물의 여러 항목을 하나로 통합
- 이름 변형(한글/영어/별명)을 모두 확인하여 동일 인물 판단

**2단계: 정보 통합 전략**
- **이름 필드**: 가장 완전한 정보 선택 (korean_name, english_name, surname, given_name 등)
- **설명 필드** (description, physical_appearance, personality): 
  * 모든 고유한 정보를 결합
  * 중복 제거하되 뉘앙스 차이는 보존
  * 구체적이고 상세한 설명 우선
- **리스트 필드** (traits, abilities):
  * 모든 항목을 합친 후 중복 제거
  * 3-7개의 가장 핵심적인 항목만 선별
  * 구체적인 것 우선 (예: "강함" < "검술에 능숙함")
- **객체 필드** (name_variants, honorifics_used):
  * 모든 키-값 쌍을 병합
  * 충돌 시 가장 구체적인 값 선택
- **단일 값 필드** (age, gender, occupation, speech_style, first_appearance):
  * 가장 구체적이고 빈번한 값 선택
  * 공백이 아닌 값 우선

**3단계: 관계 통합 (매우 중요!)**
- 각 인물에 대해 **모든 관계를 수집**
- 동일 대상 인물에 대한 관계가 여러 개면:
  * 가장 구체적인 relationship_type 선택
  * description은 모든 정보를 결합
  * sentiment는 가장 빈번하거나 최신 정보 선택
- A→B 관계와 B→A 관계는 별개로 유지
- 관계가 없는 인물은 relationships를 빈 배열로

**4단계: 품질 검증**
- 모든 필수 필드가 채워졌는지 확인
- 논리적 모순이 없는지 확인 (예: child 나이인데 occupation이 CEO)
- 각 인물이 최소 1개 이상의 trait을 가지는지 확인

**반드시 유효한 JSON만 반환하세요. 코드 블록 없이 순수 JSON만 출력하세요.**

JSON 형식 (모든 필드 포함):
{
  "characters": [
    {
      "id": "기존 ID 중 첫 번째 유지",
      "name": "통합된 이름 (번역된 이름)",
      "korean_name": "한글 이름",
      "korean_surname": "성",
      "korean_given_name": "이름",
      "english_name": "English Name (있다면)",
      "surname": "Family Name",
      "given_name": "Given Name",
      "description": "통합되고 완전한 설명 (모든 고유 정보 포함)",
      "physical_appearance": "통합된 외형 묘사",
      "personality": "통합된 성격 설명",
      "traits": ["핵심특성1", "핵심특성2", "...3-7개"],
      "emoji": "😊",
      "age": "나이",
      "gender": "male/female/other",
      "role": "protagonist/antagonist/major/supporting/minor",
      "age_group": "child/teen/young_adult/adult/elderly",
      "occupation": "직업",
      "abilities": ["능력1", "능력2", "..."],
      "speech_style": "격식체/반말/거친 말투 등",
      "name_variants": {"nickname": "별명", "title": "직함"},
      "honorifics_used": {"다른인물": "-님"},
      "first_appearance": "첫 등장 맥락",
      "relationships": [
        {
          "character_name": "관계 대상 인물 이름",
          "relationship_type": "친구/적/가족/연인/동료/라이벌/숙명의 라이벌/적대적 연인 등",
          "description": "통합된 관계 설명",
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

    const model = geminiAPI.getGenerativeModel({ model: 'gemini-2.5-pro' });
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
      korean_surname: char.korean_surname || '',
      korean_given_name: char.korean_given_name || '',
      english_name: char.english_name || '',
      surname: char.surname || '',
      given_name: char.given_name || '',
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
      speech_style: char.speech_style || 'standard',
      name_variants: char.name_variants || {},
      honorifics_used: char.honorifics_used || {},
      first_appearance: char.first_appearance || '',
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

  const targetLanguage = useGlossaryStore.getState().target_language;
  const languageDirective = getLanguageDirective(targetLanguage);

  const prompt = `당신은 한국 웹소설 번역 전문가입니다. 여러 chunk에서 추출된 사건들을 **정밀하게 분석**하여 소설의 핵심 서사를 구성하는 중요 사건만을 선별하고 통합하세요.
${languageDirective}

**핵심 원칙:**
🎯 **중복 제거**: 동일하거나 매우 유사한 사건은 하나로 통합
📊 **중요도 평가**: 서사에 실질적 영향을 주는 사건만 선별
⏰ **시간순 정렬**: chunk_index 기준으로 정확히 정렬
✨ **명확한 표현**: 사건명은 구체적이고 동사 중심으로

등장 인물:
${characters.map(c => c.name).join(', ')}

추출된 모든 사건 (${events.length}개):
${JSON.stringify(events.map(e => ({
  id: e.id,
  name: e.name,
  description: e.description,
  characters_involved: e.characters_involved,
  source_location: e.source_location,
  target_location: e.target_location,
  importance: e.importance,
  chunk_index: e.chunk_index
})), null, 2)}

**통합 & 선별 작업 (단계별):**

**1단계: 중복 사건 식별 & 통합**
- 동일하거나 매우 유사한 사건을 찾아 하나로 통합:
  * 같은 인물, 같은 장소, 유사한 내용 = 중복 가능성
  * "A가 B를 만났다" vs "A와 B의 첫 만남" = 중복
  * "전투가 시작되었다" vs "전투 중" vs "전투가 끝났다" = 별개 (시작/진행/종료)
- 통합 시:
  * 더 구체적이고 완전한 description 선택
  * 가장 이른 chunk_index 유지
  * characters_involved는 모두 합치기

**2단계: 중요도 평가 & 선별**
다음 기준으로 15-25개의 핵심 사건만 선별:

✅ **반드시 포함**:
1. 🎭 **서사 전개의 전환점**: 이야기 흐름을 크게 바꾸는 사건
2. 👥 **인물 관계 형성/변화**: 주요 인물 간 관계가 생기거나 크게 변하는 사건
3. ⚔️ **주요 갈등 발생/해결**: 핵심 갈등의 시작 또는 해결
4. 💡 **인물 성장/변화**: 인물의 가치관이나 능력이 변하는 중요한 경험
5. 🔑 **플롯 핵심 사건**: 이후 서사에 지속적 영향을 주는 사건
6. 🎯 **목표 설정/달성**: 주인공의 주요 목표가 정해지거나 달성되는 사건

❌ **제외**:
- 중복 사건 (이미 통합됨)
- 일상적 대화나 설명만 있는 장면
- 단순 이동이나 시간 경과
- 사소한 부차적 사건
- "minor" importance이면서 특별한 의미 없는 사건
- 배경 설명만 있고 실제 행동이 없는 경우

**3단계: 사건 정제**
- 사건명을 명확하고 구체적으로 작성:
  * 동사 포함 (예: "만나다", "싸우다", "깨닫다", "결정하다")
  * 구체적 내용 포함 (예: "만남" ❌ → "A와 B가 처음 만나 동맹을 맺다" ✅)
- description을 통합하여 완전하게 작성:
  * 사건의 원인, 과정, 결과를 모두 포함
  * 서사적 의미를 명시
- importance를 "major"로 설정
- chunk_index 기준으로 시간순 정렬

**4단계: 품질 검증**
- 15-25개 사이의 사건이 선별되었는지 확인
- 각 사건이 서사에 실질적 영향을 주는지 확인
- 시간순으로 정렬되어 있는지 확인
- 중복이 완전히 제거되었는지 확인

**반드시 유효한 JSON만 반환하세요. 코드 블록 없이 순수 JSON만 출력하세요.**

JSON 형식:
{
  "events": [
    {
      "name": "구체적이고 동사 중심의 사건명 (예: 주인공이 스승을 만나 검술을 배우기 시작하다)",
      "description": "통합되고 완전한 설명 (원인, 과정, 결과, 서사적 의미 포함)",
      "characters_involved": ["주요 인물1", "주요 인물2"],
      "source_location": "시작 장소",
      "target_location": "종료 장소 (이동 없으면 동일)",
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
  
  const prompt = `여러 chunk에서 추출된 용어를 **정밀하게 통합**하세요.
${languageDirective}

추출된 용어 (${terms.length}개):
${JSON.stringify(terms, null, 2)}

**통합 원칙:**
1. **중복 제거**: 동일 원문(Korean)은 하나로 통합
2. **번역 선택**: 가장 정확한 번역 선택
3. **문맥 결합**: 모든 고유한 문맥 정보 결합

반드시 유효한 JSON만 반환하세요:
{
  "terms": [
    {
      "id": "기존 ID 유지",
      "original": "한글 용어",
      "translation": "English Translation",
      "context": "통합된 문맥",
      "category": "name/place/item/concept/martial_arts/cultural/technical/other",
      "first_appearance": "첫 등장",
      "notes": "번역 노트"
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

async function consolidateWorldBuildingNotes(notes: string[]): Promise<string[]> {
  if (notes.length === 0) return [];
  if (notes.length <= 5) return notes; // Too few to consolidate
  
  const targetLanguage = useGlossaryStore.getState().target_language;
  const languageDirective = getLanguageDirective(targetLanguage);
  
  const prompt = `여러 chunk에서 추출된 세계관 노트를 **정밀하게 통합**하세요.
${languageDirective}

추출된 세계관 노트 (${notes.length}개):
${JSON.stringify(notes, null, 2)}

**통합 원칙:**
1. **중복 제거**: 동일하거나 매우 유사한 내용은 하나로 통합
2. **정보 보존**: 고유한 정보는 모두 유지
3. **명확성**: 각 노트가 하나의 명확한 세계관 요소를 설명하도록 정리
4. **간결성**: 10-20개의 핵심 노트로 정리

**중요: 모든 노트를 TARGET LANGUAGE로 작성하세요.**

반드시 유효한 JSON만 반환하세요:
{
  "world_building_notes": [
    "Consolidated world building note 1 in TARGET LANGUAGE",
    "Consolidated world building note 2 in TARGET LANGUAGE"
  ]
}`;

  try {
    if (!geminiAPI) throw new Error('Gemini API not initialized');
    
    const model = geminiAPI.getGenerativeModel({ model: 'gemini-2.5-pro' });
    const result = await model.generateContent(prompt);
    const content = (await result.response).text();
    
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    const parsed = JSON.parse(jsonMatch ? jsonMatch[0] : '{}');
    
    return parsed.world_building_notes || notes;
  } catch (error) {
    console.error('Error consolidating world building notes:', error);
    return notes;
  }
}

async function consolidateKeyEvents(keyEvents: string[]): Promise<string[]> {
  if (keyEvents.length === 0) return [];
  if (keyEvents.length <= 10) return keyEvents; // Too few to consolidate
  
  const targetLanguage = useGlossaryStore.getState().target_language;
  const languageDirective = getLanguageDirective(targetLanguage);
  
  const prompt = `여러 chunk에서 추출된 주요 사건을 **정밀하게 통합**하세요.
${languageDirective}

추출된 주요 사건 (${keyEvents.length}개):
${JSON.stringify(keyEvents, null, 2)}

**통합 원칙:**
1. **중복 제거**: 동일하거나 매우 유사한 사건은 하나로 통합
2. **중요도 평가**: 서사에 핵심적인 15-25개 사건만 선별
3. **시간순 정렬**: 이야기 진행 순서대로 정렬
4. **명확한 표현**: 구체적이고 동사 중심으로

**중요: 모든 사건을 TARGET LANGUAGE로 작성하세요.**

반드시 유효한 JSON만 반환하세요:
{
  "key_events_and_arcs": [
    "Consolidated and refined key event 1 in TARGET LANGUAGE",
    "Consolidated and refined key event 2 in TARGET LANGUAGE"
  ]
}`;

  try {
    if (!geminiAPI) throw new Error('Gemini API not initialized');
    
    const model = geminiAPI.getGenerativeModel({ model: 'gemini-2.5-pro' });
    const result = await model.generateContent(prompt);
    const content = (await result.response).text();
    
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    const parsed = JSON.parse(jsonMatch ? jsonMatch[0] : '{}');
    
    return parsed.key_events_and_arcs || keyEvents;
  } catch (error) {
    console.error('Error consolidating key events:', error);
    return keyEvents;
  }
}

export const useGlossaryStore = create<GlossaryState & GlossaryAction>()((set, get) => ({
  ...initialState,
  reset: () => set({ ...initialState }),
  setFullText: (text) => set({ fullText: text }),
  setTotalChunks: (total) => set({ totalChunks: total }),
  setTargetLanguage: (language) => set({ target_language: language }),

  processChunk: async (chunk, chunkIndex) => {
    set({ isLoading: true });

    const { characters, events, locations, terms, honorifics, recurring_phrases, world_building_notes, key_events_in_chunk, style_guide } = await extractFromChunk(chunk, chunkIndex);

    const existingCharacters = get().characters;

    characters.forEach((newChar) => {
      const existing = existingCharacters.find(
        (c) => {
          const cNameLower = c.name.toLowerCase().trim();
          const newNameLower = newChar.name.toLowerCase().trim();
          const cKoreanLower = c.korean_name?.toLowerCase().trim();
          const newKoreanLower = newChar.korean_name?.toLowerCase().trim();
          const cEnglishLower = c.english_name?.toLowerCase().trim();
          const newEnglishLower = newChar.english_name?.toLowerCase().trim();

          return cNameLower === newNameLower ||
                 (cKoreanLower && newKoreanLower && cKoreanLower === newKoreanLower) ||
                 (cEnglishLower && newEnglishLower && cEnglishLower === newEnglishLower) ||
                 (cKoreanLower && cKoreanLower === newNameLower) ||
                 (newKoreanLower && cNameLower === newKoreanLower) ||
                 (cEnglishLower && cEnglishLower === newNameLower) ||
                 (newEnglishLower && cNameLower === newEnglishLower);
        }
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

    // Merge honorifics, recurring phrases, and world building notes
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

    if (world_building_notes && world_building_notes.length > 0) {
      set((state) => ({
        world_building_notes: [...state.world_building_notes, ...world_building_notes]
      }));
    }

    if (key_events_in_chunk && key_events_in_chunk.length > 0) {
      set((state) => ({
        key_events_and_arcs: [...state.key_events_and_arcs, ...key_events_in_chunk]
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
      console.log('🔄 Starting comprehensive consolidation...');

      // Step 1: Consolidate Characters (most important for relationships)
      console.log('📋 Consolidating characters...');
      const consolidatedCharacters = await consolidateCharacters(state.characters);

      // Step 2: Consolidate Events (depends on characters)
      console.log('📋 Consolidating events...');
      const consolidatedEvents = await consolidateEvents(state.events, consolidatedCharacters);

      // Step 3: Consolidate Locations
      console.log('📋 Consolidating locations...');
      const consolidatedLocations = await consolidateLocations(state.locations);

      // Step 4: Consolidate Terms
      console.log('📋 Consolidating terms...');
      const consolidatedTerms = await consolidateTerms(state.terms);

      // Step 5: Consolidate World Building Notes
      console.log('📋 Consolidating world building notes...');
      const consolidatedWorldBuildingNotes = await consolidateWorldBuildingNotes(state.world_building_notes);

      // Step 6: Consolidate Key Events
      console.log('📋 Consolidating key events and arcs...');
      const consolidatedKeyEvents = await consolidateKeyEvents(state.key_events_and_arcs);

      console.log('✅ Consolidation complete!');

      set({
        characters: consolidatedCharacters,
        events: consolidatedEvents,
        locations: consolidatedLocations,
        terms: consolidatedTerms,
        world_building_notes: consolidatedWorldBuildingNotes,
        key_events_and_arcs: consolidatedKeyEvents,
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

  addKeyEvent: (event) => {
    set((state) => ({
      key_events_and_arcs: [...state.key_events_and_arcs, event]
    }));
  },

  updateKeyEvent: (index, event) => {
    set((state) => ({
      key_events_and_arcs: state.key_events_and_arcs.map((e, i) => i === index ? event : e)
    }));
  },

  deleteKeyEvent: (index) => {
    set((state) => ({
      key_events_and_arcs: state.key_events_and_arcs.filter((_, i) => i !== index)
    }));
  },

  addWorldBuildingNote: (note) => {
    set((state) => ({
      world_building_notes: [...state.world_building_notes, note]
    }));
  },

  updateWorldBuildingNote: (index, note) => {
    set((state) => ({
      world_building_notes: state.world_building_notes.map((n, i) => i === index ? note : n)
    }));
  },

  deleteWorldBuildingNote: (index) => {
    set((state) => ({
      world_building_notes: state.world_building_notes.filter((_, i) => i !== index)
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
            physical_appearance: newCharacter.physical_appearance || char.physical_appearance,
            personality: newCharacter.personality || char.personality,
            traits: [...new Set([...char.traits, ...(newCharacter.traits || [])])],
            age: newCharacter.age || char.age,
            gender: newCharacter.gender || char.gender,
            role: newCharacter.role || char.role,
            age_group: newCharacter.age_group || char.age_group,
            occupation: newCharacter.occupation || char.occupation,
            abilities: [...new Set([...(char.abilities || []), ...(newCharacter.abilities || [])])],
            speech_style: newCharacter.speech_style || char.speech_style,
            name_variants: { ...(char.name_variants || {}), ...(newCharacter.name_variants || {}) },
            honorifics_used: { ...(char.honorifics_used || {}), ...(newCharacter.honorifics_used || {}) },
            first_appearance: newCharacter.first_appearance || char.first_appearance,
            emoji: newCharacter.emoji || char.emoji,
            korean_name: newCharacter.korean_name || char.korean_name,
            korean_surname: newCharacter.korean_surname || char.korean_surname,
            korean_given_name: newCharacter.korean_given_name || char.korean_given_name,
            english_name: newCharacter.english_name || char.english_name,
            surname: newCharacter.surname || char.surname,
            given_name: newCharacter.given_name || char.given_name,
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
        markerEnd: { type: MarkerType.ArrowClosed },
        data: {
          name: event.name,
          passage: event.description,
          sourceLocation: event.source_location,
          targetLocation: event.target_location
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
        characters: data.characters || [],
        events: data.events || [],
        locations: data.locations || [],
        terms: data.terms || [],
        story_summary: data.story_summary || { logline: '', blurb: '' },
        key_events_and_arcs: data.key_events_and_arcs || [],
        honorifics: data.honorifics || {},
        recurring_phrases: data.recurring_phrases || {},
        world_building_notes: data.world_building_notes || [],
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
      characters: state.characters,
      events: state.events,
      locations: state.locations,
      terms: state.terms,
      story_summary: state.story_summary,
      key_events_and_arcs: state.key_events_and_arcs,
      honorifics: state.honorifics,
      recurring_phrases: state.recurring_phrases,
      world_building_notes: state.world_building_notes,
      style_guide: state.style_guide,
      // fullText is excluded from export
    };
    return JSON.stringify(data, null, 2);
  },
}));
