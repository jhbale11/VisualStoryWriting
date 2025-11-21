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
  personality?: string;
  traits?: string[];
  emoji: string;
  age?: string;
  gender?: string;
  role?: 'protagonist' | 'antagonist' | 'major' | 'supporting' | 'minor';
  occupation?: string;
  abilities?: string[];
  speech_style?: string;
  name_variants?: { [key: string]: string }; // e.g., {"nickname": "별명", "title": "직함"}
  relationships?: Array<CharacterRelationshipInArc>;
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
    addressing?: string; // How character_a addresses character_b (e.g., "형", "선배님")
  }>; // Relationships specific to this arc
  key_events: string[]; // Key event summaries
  background_changes?: string[]; // Changes in setting/background in this arc
  terms: Array<{
    original: string;
    translation: string;
    context: string;
    category?: string;
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
  
  // Deprecated functions (kept as stubs for backward compatibility)
  addCharacter: () => void;
  addEvent: () => void;
  addLocation: () => void;
  addTerm: () => void;
  updateCharacter: () => void;
  updateEvent: () => void;
  updateLocation: () => void;
  updateTerm: () => void;
  deleteCharacter: () => void;
  deleteEvent: () => void;
  deleteLocation: () => void;
  deleteTerm: () => void;
  mergeCharacters: () => void;
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
  
  const prompt = `You are a Korean web novel translation expert. Extract COMPLETE and DETAILED information for translation from this chunk.
${languageDirective}

**🎯 EXTRACTION PRIORITY: MAXIMUM DETAIL NOW, CONSOLIDATION LATER**

1. **CHARACTERS - Extract EVERY character mentioned with COMPLETE information**
   
   ✅ ALWAYS extract these fields for EVERY character:
   - name (English transliteration - clear and consistent)
   - korean_name (original Korean name)
   - age (teenager/20s/30s/40s/adult/elderly/child)
   - speech_style (DETAILED: formal/informal/rough/polite + specific examples from text)
   - physical_appearance (ALL distinctive features mentioned: hair, eyes, build, clothing)
   - personality (2-3 sentences capturing character essence)
   - traits (ALL mentioned traits: ["trait1", "trait2", "trait3", ...])
   - role (protagonist/antagonist/major/supporting/minor - based on screen time in THIS chunk)
   - emoji (choose appropriate emoji for character)
   
   ✅ Extract if mentioned:
   - name_variants (ALL nicknames, titles, how others address them: {"nickname": "별명", "title": "직함"})
   - gender (male/female/other - if mentioned)
   - occupation (job/role in society)
   - abilities (special skills, powers, talents)
   - description (general description if available)
   
   💡 IMPORTANT: 
   - Extract EVEN if character seems minor
   - Duplicate is OK - we'll consolidate later
   - Better to have TOO MUCH info than too little
   - If a character appears, extract EVERYTHING about them

2. **RELATIONSHIPS - Extract EVERY interaction with COMPLETE details**
   ✅ For EVERY character interaction, include:
   - character_a (exact name as used above)
   - character_b (exact name as used above)
   - addressing (EXACT term A uses to address B: "형", "님", "씨", first name, title, etc.)
   - relationship_type (friend/rival/mentor/family/romantic/enemy/colleague/stranger)
   - description (2-3 sentences about their dynamic and how they interact)
   - sentiment (positive/negative/neutral/complex/ambiguous)
   
   💡 Extract even minor interactions - we'll filter later

3. **KEY EVENTS - Extract ALL significant plot points**
   ✅ Include 5-10 events that happen in this chunk
   ✅ Events that reveal character, advance plot, or affect relationships
   ❌ Only skip truly trivial actions

4. **LOCATIONS - Extract EVERY location mentioned**
   ✅ Cities, buildings, rooms, outdoor areas, any named place
   ✅ Include korean_name if mentioned, type (city/building/room/natural)

5. **TERMS - Extract ALL potentially translation-relevant vocabulary**
   ✅ Cultural terms, magic systems, titles, proper nouns, idioms
   ✅ Include category: cultural/magic/title/item/concept/idiom/slang
   ✅ Include context about usage

6. **HONORIFICS & PHRASES**
   ✅ ALL honorifics/phrases appearing in this chunk
   ✅ With clear translation/explanation
   ✅ Include usage context

**📋 JSON STRUCTURE:**
{
  "arcs": [{
    "id": "arc-${chunkIndex}",
    "name": "Arc Name (clear & concise)",
    "description": "What happens in 2-3 sentences",
    "theme": "Main theme keyword",
    "start_chunk": ${chunkIndex},
    "characters": [{
      "id": "char-name-${chunkIndex}",
      "name": "English Name",
      "korean_name": "한글이름",
      "age": "teenager/20s/30s",
      "speech_style": "Specific speech pattern with examples",
      "physical_appearance": "Only distinctive features",
      "personality": "Core personality in 1 sentence",
      "traits": ["trait1", "trait2", "trait3"],
      "name_variants": {"nickname": "별명", "title": "직함"},
      "emoji": "😊",
      "role": "protagonist/major/supporting/minor"
    }],
    "relationships": [{
      "character_a": "Name A",
      "character_b": "Name B",
      "relationship_type": "friend/rival/mentor/family",
      "description": "How they interact (1 sentence)",
      "sentiment": "positive/negative/neutral",
      "addressing": "Exact term A uses for B"
    }],
    "events": [{
      "id": "event-${chunkIndex}-0",
      "name": "Event name",
      "description": "What happened (1 sentence)",
      "characters_involved": ["Name1", "Name2"],
      "importance": "major/minor"
    }],
    "locations": [{
      "id": "loc-${chunkIndex}-0",
      "name": "Place Name",
      "korean_name": "한글지명",
      "description": "Brief description",
      "type": "city/building/room/natural",
      "emoji": "🏰"
    }],
    "key_events": ["Brief event 1", "Brief event 2"],
    "terms": [{
      "original": "한글",
      "translation": "English",
      "context": "Usage context",
      "category": "cultural/magic/title/item"
    }]
  }],
  "honorifics": {"님": "formal suffix"},
  "recurring_phrases": {"구절": "translation"},
  "style_guide": {
    "genre": "genre",
    "tone": "tone description",
    "narrative_style": {
      "point_of_view": "first/third-person",
      "tense": "past/present"
    }
  }
}

**Chunk ${chunkIndex}**
Return ONLY valid JSON. NO code blocks. NO markdown.

Text to analyze:
${chunk}`;

  try {
    if (!geminiAPI) {
      throw new Error('Gemini API not initialized');
    }

    console.log(`🔄 Processing chunk ${chunkIndex}...`);
    const model = geminiAPI.getGenerativeModel({ model: 'gemini-3-pro-preview' });
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
        addressing: rel.addressing || '',
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


// Removed unused consolidation functions:
// - consolidateCharacters (previously lines 498-645)
// - consolidateEvents (previously lines 646-726)
// - consolidateLocations (previously lines 727-785)
// - consolidateTerms (previously lines 786-844)
// All data is now managed within arcs.

async function consolidateArcs(arcs: GlossaryArc[]): Promise<GlossaryArc[]> {
  if (arcs.length === 0) return [];
  if (arcs.length <= 3) return arcs; // Too few to consolidate
  
  const targetLanguage = useGlossaryStore.getState().target_language;
  const languageDirective = getLanguageDirective(targetLanguage);
  
  const prompt = `You are a Korean web novel translation expert. Consolidate extracted glossary data into a clean, translator-friendly format.
${languageDirective}

**🎯 CRITICAL GOAL: Clean arcs + Complete character info in EACH arc**

**📋 CONSOLIDATION TASKS:**

**1. MERGE ARCS (Target: 5-8 major arcs)**
   - Combine similar/sequential arcs (e.g., "Chapter 1 Arc" + "Chapter 2 Arc" → "Early Arc")
   - Sort chronologically
   - Each arc = distinct story phase with clear theme

**2. COMPLETE CHARACTERS IN EACH ARC ⭐ CRITICAL ⭐**
   
   **Step A: Build character database**
   - For EACH unique character across ALL arcs, merge all information:
     * Combine all traits/name_variants from every appearance
     * Take longest/most detailed speech_style, physical_appearance, personality
     * Use first appearance arc
     * Keep highest importance role
   
   **Step B: Populate EACH arc's characters array**
   - For EACH arc, look at who appears in that arc
   - For EACH character in that arc, include COMPLETE merged character object:
   
   Example character structure:
   {
     "id": "char-simon",
     "name": "Simon Polentia",
     "korean_name": "시몬 폴렌티아",
     "age": "teenager",
     "gender": "male",
     "speech_style": "Polite and formal with elders, casual with peers. Uses 입니다 endings with teachers.",
     "physical_appearance": "Young boy with distinctive mixed heritage features, fit build, dark hair",
     "personality": "Curious, determined, and adaptable. Shows respect to authority but confident among peers.",
     "traits": ["genius", "mixed heritage", "necromancer", "adaptable", "respectful"],
     "name_variants": {"title": "Special Admission No.1", "nickname": "Simon"},
     "emoji": "👦",
     "role": "protagonist",
     "first_appearance_arc": "Admission to Kizen",
     "role_in_arc": "protagonist",
     "first_appearance": true
   }
   
   💡 KEY POINT: Same character appears in multiple arcs → Include COMPLETE info in EACH arc
   💡 NO SHORTCUTS: Every arc.characters must have full GlossaryCharacter objects
   💡 Do NOT just put character names - include ALL fields

**3. ORGANIZE RELATIONSHIPS (Arc-specific)**
   ✅ Group relationships by arc
   ✅ Keep relationship evolution visible across arcs
   ✅ MUST include "addressing" field for EVERY relationship
   ✅ Remove exact duplicates within same arc
   ✅ If same relationship exists in multiple arcs, that's OK

**4. CONSOLIDATE TERMS**
   - Remove duplicates (same original + translation)
   - Keep most detailed context
   - Aim for 20-40 unique terms total

**5. CLEAN UP**
   ❌ Remove empty strings ""
   ❌ Remove empty arrays []
   ❌ Remove null values
   ✅ Keep only fields with actual data

---

**INPUT: ${arcs.length} arcs to consolidate**

${JSON.stringify(arcs.map(a => ({
  id: a.id,
  name: a.name,
  description: a.description,
  theme: a.theme,
  chunk_range: `${a.start_chunk}-${a.end_chunk}`,
  characters: a.characters?.map(c => ({
    id: c.id,
    name: c.name,
    korean_name: c.korean_name,
    age: c.age,
    speech_style: c.speech_style,
    physical_appearance: c.physical_appearance,
    personality: c.personality,
    traits: c.traits,
    name_variants: c.name_variants,
    role: c.role
  })),
  relationships: a.relationships?.map(r => ({
    character_a: r.character_a,
    character_b: r.character_b,
    relationship_type: r.relationship_type,
    description: r.description,
    sentiment: r.sentiment,
    addressing: r.addressing
  })),
  key_events: a.key_events,
  background_changes: a.background_changes,
  terms: a.terms?.map(t => ({
    original: t.original,
    translation: t.translation,
    context: t.context,
    category: t.category
  }))
})), null, 2)}

---

**OUTPUT STRUCTURE:**

{
  "arcs": [
    {
      "id": "admission-arc",
      "name": "Admission to Kizen",
      "description": "Simon's journey from Earth to Kizen Academy. He meets Nephthys who scouts him...",
      "theme": "New beginnings and discovery",
      "start_chunk": 0,
      "end_chunk": 5,
      "characters": [
        {
          "id": "char-simon",
          "name": "Simon Polentia",
          "korean_name": "시몬 폴렌티아",
          "age": "teenager",
          "gender": "male",
          "speech_style": "Polite and formal with elders using '입니다/습니다' endings, casual and friendly with peers using '해요' style",
          "physical_appearance": "Young boy with distinctive mixed heritage features, fit athletic build, dark hair and eyes",
          "personality": "Curious and eager to learn, determined when facing challenges, adaptable to new situations, respectful of authority figures",
          "traits": ["genius", "mixed heritage", "necromancer", "adaptable", "respectful", "determined"],
          "name_variants": {"title": "Special Admission No.1", "nickname": "Simon"},
          "emoji": "👦",
          "role": "protagonist",
          "first_appearance_arc": "Admission to Kizen",
          "role_in_arc": "protagonist",
          "first_appearance": true
        },
        {
          "id": "char-nephthys",
          "name": "Nephthys Archbold",
          "korean_name": "네프티스 아크볼드",
          "age": "30s",
          "gender": "female",
          "speech_style": "Mature and confident, uses formal but warm language",
          "physical_appearance": "Elegant woman with long silver hair, commanding presence",
          "personality": "Protective mentor figure, perceptive and strategic",
          "traits": ["mentor", "powerful", "perceptive", "caring"],
          "name_variants": {"title": "Professor Archbold"},
          "emoji": "👩‍🏫",
          "role": "major",
          "first_appearance_arc": "Admission to Kizen",
          "role_in_arc": "mentor",
          "first_appearance": true
        }
      ],
      "relationships": [
        {
          "character_a": "Simon Polentia",
          "character_b": "Nephthys Archbold",
          "relationship_type": "mentor/student",
          "description": "Nephthys scouts Simon from Earth and guides him. She acts as his mentor and protector.",
          "sentiment": "positive",
          "addressing": "Nephthys-nim"
        }
      ],
      "key_events": [
        "Simon is discovered on Earth by Nephthys",
        "Simon enters Kizen Academy as special admission",
        "Simon learns about necromancy basics"
      ],
      "terms": [
        {
          "id": "term-chilheuk",
          "original": "칠흑",
          "translation": "Jet-Black",
          "context": "The dark mana source used by necromancers at Kizen",
          "category": "magic"
        }
      ]
    },
    {
      "id": "rivalry-arc",
      "name": "First Week & Rivalries",
      "description": "Simon's first week includes...",
      "theme": "Competition and growth",
      "start_chunk": 6,
      "end_chunk": 10,
      "characters": [
        {
          "id": "char-simon",
          "name": "Simon Polentia",
          "korean_name": "시몬 폴렌티아",
          "age": "teenager",
          "gender": "male",
          "speech_style": "Polite and formal with elders using '입니다/습니다' endings, casual and friendly with peers using '해요' style",
          "physical_appearance": "Young boy with distinctive mixed heritage features, fit athletic build, dark hair and eyes",
          "personality": "Curious and eager to learn, determined when facing challenges, adaptable to new situations, respectful of authority figures",
          "traits": ["genius", "mixed heritage", "necromancer", "adaptable", "respectful", "determined"],
          "name_variants": {"title": "Special Admission No.1", "nickname": "Simon"},
          "emoji": "👦",
          "role": "protagonist",
          "first_appearance_arc": "Admission to Kizen",
          "role_in_arc": "protagonist",
          "first_appearance": false
        },
        {
          "id": "char-hector",
          "name": "Hector Moore",
          "korean_name": "헥토르 무어",
          "age": "teenager",
          "speech_style": "Competitive and challenging, informal with peers",
          "physical_appearance": "Athletic build, confident posture",
          "personality": "Competitive rival, prideful but respects strength",
          "traits": ["competitive", "proud", "talented"],
          "emoji": "⚔️",
          "role": "supporting",
          "first_appearance_arc": "First Week & Rivalries",
          "role_in_arc": "rival",
          "first_appearance": true
        }
      ],
      "relationships": [
        {
          "character_a": "Simon Polentia",
          "character_b": "Hector Moore",
          "relationship_type": "rival",
          "description": "They compete for top rankings and clash over magical approaches",
          "sentiment": "negative",
          "addressing": "야"
        }
      ],
      "key_events": ["Simon's first class at Kizen", "First confrontation with Hector"],
      "terms": []
    }
  ]
}

**CRITICAL: Each arc MUST have complete character objects with ALL fields filled. Do NOT just list character names or IDs.**

**Return ONLY valid JSON. NO code blocks. NO markdown. Remove ALL empty fields.**`;

  try {
    if (!geminiAPI) throw new Error('Gemini API not initialized');
    
    console.log('🔄 Consolidating arcs with LLM...');
    const model = geminiAPI.getGenerativeModel({ model: 'gemini-3-pro-preview' });
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
    
    // Build comprehensive maps from original arcs to preserve full data
    const characterMap = new Map<string, GlossaryCharacter>();
    const characterByKoreanName = new Map<string, GlossaryCharacter>();
    const eventMap = new Map<string, GlossaryEvent>();
    const locationMap = new Map<string, GlossaryLocation>();
    
    console.log('🗂️ Building character database from original arcs...');
    arcs.forEach((arc, arcIdx) => {
      console.log(`   Arc ${arcIdx}: ${arc.name} - ${arc.characters?.length || 0} characters`);
      (arc.characters || []).forEach(char => {
        const englishKey = char.name?.toLowerCase().trim() || '';
        const koreanKey = char.korean_name?.toLowerCase().trim() || '';
        
        if (englishKey) {
          // Merge with existing character if found, otherwise add new
          const existing = characterMap.get(englishKey);
          if (existing) {
            // Merge: take longest/most complete fields
            characterMap.set(englishKey, {
              ...existing,
              speech_style: (char.speech_style?.length || 0) > (existing.speech_style?.length || 0) ? char.speech_style : existing.speech_style,
              physical_appearance: (char.physical_appearance?.length || 0) > (existing.physical_appearance?.length || 0) ? char.physical_appearance : existing.physical_appearance,
              personality: (char.personality?.length || 0) > (existing.personality?.length || 0) ? char.personality : existing.personality,
              traits: [...new Set([...(existing.traits || []), ...(char.traits || [])])],
              name_variants: { ...(existing.name_variants || {}), ...(char.name_variants || {}) },
              age: char.age || existing.age,
              gender: char.gender || existing.gender,
              occupation: char.occupation || existing.occupation,
              abilities: [...new Set([...(existing.abilities || []), ...(char.abilities || [])])],
            });
          } else {
            characterMap.set(englishKey, char);
            console.log(`     ✅ Added: ${char.name} (${char.korean_name || 'no korean'})`);
          }
        }
        
        if (koreanKey && !characterByKoreanName.has(koreanKey)) {
          characterByKoreanName.set(koreanKey, char);
        }
      });
      
      (arc.events || []).forEach(event => {
        const key = event.name?.toLowerCase() || '';
        if (key && !eventMap.has(key)) {
          eventMap.set(key, event);
        }
      });
      
      (arc.locations || []).forEach(loc => {
        const key = loc.name?.toLowerCase() || '';
        if (key && !locationMap.has(key)) {
          locationMap.set(key, loc);
        }
      });
    });
    
    console.log(`📊 Character database: ${characterMap.size} unique characters`);
    characterMap.forEach((char, key) => {
      console.log(`   - ${key}: ${char.korean_name || 'no korean'} [${char.role}]`);
    });

    const consolidatedArcs = (parsed.arcs || []).map((arc: any, arcIdx: number) => {
      console.log(`🔍 Processing consolidated arc ${arcIdx}: ${arc.name}`);
      console.log(`   - Relationships in parsed arc: ${(arc.relationships || []).length}`);
      
      return {
      id: arc.name || arc.id,
      name: arc.name || 'Unknown Arc',
      description: arc.description || '',
      theme: arc.theme || '',
      characters: (arc.characters || []).map((char: any, charIdx: number) => {
        console.log(`     Character ${charIdx}: ${JSON.stringify(char).substring(0, 100)}...`);
        
        // Try multiple ways to find the full character data
        const charNameLower = (char.name || '').toLowerCase().trim();
        const charKoreanLower = (char.korean_name || '').toLowerCase().trim();
        
        let fullChar = characterMap.get(charNameLower);
        if (!fullChar && charKoreanLower) {
          fullChar = characterByKoreanName.get(charKoreanLower);
        }
        
        if (fullChar) {
          console.log(`       ✅ Found full character: ${fullChar.name}`);
          // Return full character with arc-specific metadata
          return {
            ...fullChar,
            role_in_arc: char.role_in_arc || char.role || fullChar.role,
            first_appearance: char.first_appearance === true || (char.first_appearance_arc === arc.name),
          };
        }
        
        // If LLM returned a complete character object, use it
        if (char.name && char.korean_name && (char.speech_style || char.personality)) {
          console.log(`       ℹ️ Using LLM-provided character data: ${char.name}`);
          return {
            id: char.id || `char-${char.name.replace(/\s+/g, '-').toLowerCase()}`,
            name: char.name,
            korean_name: char.korean_name || '',
            description: char.description || '',
            physical_appearance: char.physical_appearance || '',
            personality: char.personality || '',
            traits: char.traits || [],
            emoji: char.emoji || '👤',
            age: char.age || '',
            gender: char.gender || '',
            role: char.role || 'minor',
            role_in_arc: char.role_in_arc || char.role || 'minor',
            first_appearance: char.first_appearance === true || (char.first_appearance_arc === arc.name),
            age_group: char.age_group || 'adult',
            occupation: char.occupation || '',
            abilities: char.abilities || [],
            speech_style: char.speech_style || '',
            name_variants: char.name_variants || {},
            honorifics_used: char.honorifics_used || {},
            relationships: [],
          };
        }
        
        // Last resort: create minimal character object
        console.warn(`       ⚠️ Creating minimal character for: ${char.name || 'unknown'}`);
        return {
          id: `char-${(char.name || 'unknown').replace(/\s+/g, '-').toLowerCase()}`,
          name: char.name || 'Unknown Character',
          korean_name: char.korean_name || '',
          description: '',
          physical_appearance: '',
          personality: '',
          traits: [],
          emoji: '👤',
          age: '',
          gender: '',
          role: char.role || 'minor',
          role_in_arc: char.role_in_arc || char.role || 'minor',
          first_appearance: char.first_appearance === true,
          age_group: 'adult',
          occupation: '',
          abilities: [],
          speech_style: '',
          name_variants: {},
          honorifics_used: {},
          relationships: [],
        };
      }),
      relationships: (() => {
        const parsedRels = (arc.relationships || []).map((rel: any) => ({
          character_a: rel.character_a || '',
          character_b: rel.character_b || '',
          relationship_type: rel.relationship_type || 'unknown',
          description: rel.description || '',
          sentiment: rel.sentiment || 'neutral',
          addressing: rel.addressing || '',
        }));
        
        console.log(`   - Parsed relationships: ${parsedRels.length}`);
        
        // If LLM didn't return relationships, try to find from original arcs
        if (parsedRels.length === 0) {
          console.log(`   ⚠️ No relationships in parsed arc, checking original arcs...`);
          const originalArc = arcs.find(a => 
            a.name.toLowerCase() === arc.name.toLowerCase() ||
            a.id === arc.id ||
            a.id === arc.name
          );
          
          if (originalArc && originalArc.relationships && originalArc.relationships.length > 0) {
            console.log(`   ✅ Found ${originalArc.relationships.length} relationships in original arc`);
            return originalArc.relationships;
          }
        }
        
        return parsedRels.filter((r: any) => r.character_a && r.character_b);
      })(),
      events: (arc.events || arc.key_events || []).map((evt: any) => {
        // If evt is just a string (from key_events), create minimal event object
        if (typeof evt === 'string') {
          return {
            id: `event-${evt.replace(/\s+/g, '-').toLowerCase()}`,
            name: evt,
            description: evt,
            characters_involved: [],
            location: '',
            importance: 'major' as const,
          };
        }
        
        // Try to find full event data
        const eventName = (evt.name || '').toLowerCase();
        const fullEvent = eventMap.get(eventName);
        
        return fullEvent || {
          id: evt.id || `event-${evt.name?.replace(/\s+/g, '-').toLowerCase() || 'unknown'}`,
          name: evt.name || '',
          description: evt.description || '',
          characters_involved: evt.characters_involved || [],
          location: evt.location || '',
          importance: evt.importance || 'minor' as const,
        };
      }),
      locations: (arc.locations || arc.background_changes || []).map((loc: any) => {
        // If loc is just a string (from background_changes), create minimal location object
        if (typeof loc === 'string') {
          return {
            id: `location-${loc.replace(/\s+/g, '-').toLowerCase()}`,
            name: loc,
            korean_name: '',
            description: loc,
            emoji: '📍',
          };
        }
        
        // Try to find full location data
        const locName = (loc.name || '').toLowerCase();
        const fullLoc = locationMap.get(locName);
        
        return fullLoc || {
          id: loc.id || `location-${loc.name?.replace(/\s+/g, '-').toLowerCase() || 'unknown'}`,
          name: loc.name || '',
          korean_name: loc.korean_name || '',
          description: loc.description || '',
          emoji: loc.emoji || '📍',
        };
      }),
      key_events: arc.key_events || [],
      background_changes: arc.background_changes || [],
      terms: (arc.terms || []).map((term: any) => ({
        id: term.id || `term-${term.original?.replace(/\s+/g, '-').toLowerCase() || 'unknown'}`,
        original: term.original || '',
        translation: term.translation || '',
        context: term.context || '',
        category: term.category || '',
        notes: term.notes || '',
      })),
      start_chunk: arc.start_chunk,
      end_chunk: arc.end_chunk,
    };
    });
    
    console.log('✅ Arc consolidation complete');
    consolidatedArcs.forEach((arc: any, idx: number) => {
      console.log(`📊 Arc ${idx}: ${arc.name}`);
      console.log(`   - Characters: ${arc.characters.length}`);
      console.log(`   - Relationships: ${arc.relationships.length}`);
      console.log(`   - Events: ${arc.events.length}`);
      console.log(`   - Terms: ${arc.terms.length}`);
      if (arc.relationships.length > 0) {
        arc.relationships.forEach((rel: any, relIdx: number) => {
          console.log(`     Rel ${relIdx}: ${rel.character_a} → ${rel.character_b} [${rel.addressing || 'no addressing'}]`);
        });
      }
    });
    
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

      // Immediately save to localStorage after consolidation
      console.log('💾 Saving consolidated glossary to localStorage...');
      try {
        const currentId = localStorage.getItem('vsw.currentProjectId');
        if (currentId) {
          const raw = localStorage.getItem('vsw.projects') || '[]';
          const arr = JSON.parse(raw);
          const projectIndex = arr.findIndex((p: any) => p.id === currentId);
          
          if (projectIndex >= 0) {
            const glossaryState = get();
            const glossarySnapshot = {
              arcs: JSON.parse(JSON.stringify(consolidatedArcs)),
              fullText: glossaryState.fullText,
              story_summary: JSON.parse(JSON.stringify(glossaryState.story_summary)),
              honorifics: JSON.parse(JSON.stringify(glossaryState.honorifics)),
              recurring_phrases: JSON.parse(JSON.stringify(glossaryState.recurring_phrases)),
              style_guide: JSON.parse(JSON.stringify(glossaryState.style_guide)),
              target_language: glossaryState.target_language,
            };
            
            arr[projectIndex].glossary = glossarySnapshot;
            localStorage.setItem('vsw.projects', JSON.stringify(arr));
            console.log('✅ Glossary saved to localStorage immediately after consolidation');
          }
        }
      } catch (saveError) {
        console.error('❌ Failed to save glossary after consolidation:', saveError);
      }
    } catch (error) {
      console.error('❌ Error consolidating results:', error);
      set({ isLoading: false });
    }
  },

  addArc: (arc) => {
    set((state) => ({
      arcs: [...state.arcs, arc],
    }));
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

  // ============================================
  // Obsolete CRUD functions (data now in arcs)
  // ============================================
  // These functions are deprecated as characters, events, locations, and terms
  // are now managed within arcs. Keeping as no-op stubs for backward compatibility.

  addCharacter: () => console.warn("addCharacter is deprecated - manage characters within arcs"),
  addEvent: () => console.warn("addEvent is deprecated - manage events within arcs"),
  addLocation: () => console.warn("addLocation is deprecated - manage locations within arcs"),
  addTerm: () => console.warn("addTerm is deprecated - manage terms within arcs"),
  updateCharacter: () => console.warn("updateCharacter is deprecated - manage characters within arcs"),
  updateEvent: () => console.warn("updateEvent is deprecated - manage events within arcs"),
  updateLocation: () => console.warn("updateLocation is deprecated - manage locations within arcs"),
  updateTerm: () => console.warn("updateTerm is deprecated - manage terms within arcs"),
  deleteCharacter: () => console.warn("deleteCharacter is deprecated - manage characters within arcs"),
  deleteEvent: () => console.warn("deleteEvent is deprecated - manage events within arcs"),
  deleteLocation: () => console.warn("deleteLocation is deprecated - manage locations within arcs"),
  deleteTerm: () => console.warn("deleteTerm is deprecated - manage terms within arcs"),
  mergeCharacters: () => console.warn("mergeCharacters is deprecated - manage characters within arcs"),


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
        properties: (char.traits || []).slice(0, 3).map(trait => ({
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
