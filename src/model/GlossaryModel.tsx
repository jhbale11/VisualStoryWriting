import { GoogleGenerativeAI } from '@google/generative-ai';
import { create } from 'zustand';
import type { EntityNode, ActionEdge, LocationNode } from './Model';
import { MarkerType } from '@xyflow/react';
import { jsonrepair } from 'jsonrepair';
import { browserStorage } from '../translation/services/BrowserStorage';
import type { ExtendedGlossary } from '../translation/types';

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
  // Alternate surface forms used in text (nicknames, titles, different transliterations, etc.)
  // Filled primarily during consolidation (LLM entity resolution).
  aliases?: string[];
  korean_name?: string;
  korean_surname?: string;
  korean_given_name?: string;
  surname?: string;
  given_name?: string;
  english_name?: string;
  description: string;
  physical_appearance?: string;
  personality?: string;
  traits?: string[];
  emoji: string;
  age?: string;
  age_group?: string;
  gender?: string;
  role?: 'protagonist' | 'antagonist' | 'major' | 'supporting' | 'minor';
  // Arc-specific metadata (should NOT be globally synced)
  role_in_arc?: string;
  first_appearance?: boolean;
  first_appearance_arc?: string;
  occupation?: string;
  abilities?: string[];
  speech_style?: string;
  translation_notes?: string; // Nuances, charm points, gap moe, etc.
  name_variants?: { [key: string]: string }; // e.g., {"nickname": "별명", "title": "직함"}
  honorifics_used?: Record<string, string>;
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
  atmosphere?: string;
  significance?: string;
}

export interface GlossaryTerm {
  id: string;
  original: string; // Korean term
  translation: string; // English translation
  context: string;
  category?: 'name' | 'place' | 'item' | 'concept' | 'cultural' | 'other';
  notes?: string;
  // Optional richer decision data (used by consolidation to create translator-facing guidance)
  aliases?: string[];
  preferred_translation?: string;
  alternatives?: string[];
  why_hard?: string;
  do_not_translate_as?: string[];
  decision_notes?: string;
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
  honorific_usage: string; // e.g., "Keep Korean honorifics", "Localize to Mr./Ms."
  translation_guidelines?: string; // Global translation notes, differentiation between characters, etc.
  formal_speech_level: string; // e.g., "Strict", "Loose", "Match English equivalents"lation
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
  terms: GlossaryTerm[]; // Terms specific to this arc
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
  // Raw per-chunk LLM extractions (source-of-truth for consolidation).
  raw_chunks: RawChunkExtraction[];
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

  // Global update actions
  updateCharacterGlobally: (character: GlossaryCharacter) => void;
  updateLocationGlobally: (location: GlossaryLocation) => void;
  updateTermGlobally: (term: GlossaryTerm) => void;

  // Project Storage Actions
  loadProject: (projectId: string) => Promise<void>;
  saveProject: (projectId: string) => Promise<void>;
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
  raw_chunks: [],
};

export interface RawChunkExtraction {
  chunkIndex: number;
  extractedAt: string; // ISO timestamp
  model: string;
  // Parsed JSON returned by LLM (kept verbatim as much as possible)
  raw: any;
  // For debugging / re-parsing if needed
  rawText?: string;
  parseError?: string;
}

function upsertRawChunk(
  chunks: RawChunkExtraction[],
  item: RawChunkExtraction
): RawChunkExtraction[] {
  const idx = chunks.findIndex(c => c.chunkIndex === item.chunkIndex);
  if (idx === -1) return [...chunks, item].sort((a, b) => a.chunkIndex - b.chunkIndex);
  const next = [...chunks];
  next[idx] = item;
  return next.sort((a, b) => a.chunkIndex - b.chunkIndex);
}

function extractFirstJsonObject(text: string): string | null {
  if (!text) return null;
  // Greedy match from first "{" to last "}".
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  return jsonMatch ? jsonMatch[0] : null;
}

function parseLenientJson(text: string): any {
  const candidate = extractFirstJsonObject(text) ?? text;
  try {
    return JSON.parse(candidate);
  } catch {
    // Attempt repair; this handles trailing commas, unescaped newlines, etc.
    try {
      return JSON.parse(jsonrepair(candidate));
    } catch {
      // Last resort: repair the whole text (sometimes the regex cut is wrong)
      return JSON.parse(jsonrepair(text));
    }
  }
}

function asStringRecordOrEmpty(value: any): Record<string, string> {
  if (!value || typeof value !== 'object') return {};
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(value)) {
    if (typeof v === 'string') {
      out[k] = v;
      continue;
    }
    if (v && typeof v === 'object') {
      // Compact object into a translator-friendly single line.
      // Prefer common fields if present.
      const obj = v as any;
      const parts: string[] = [];
      if (obj.meaning) parts.push(`meaning: ${obj.meaning}`);
      if (obj.translation_strategy) parts.push(`strategy: ${obj.translation_strategy}`);
      if (obj.translation) parts.push(`translation: ${obj.translation}`);
      if (obj.nuance) parts.push(`nuance: ${obj.nuance}`);
      if (obj.usage_notes) parts.push(`notes: ${obj.usage_notes}`);
      if (Array.isArray(obj.examples) && obj.examples.length > 0) {
        parts.push(`examples: ${obj.examples.slice(0, 3).join(' / ')}`);
      }
      out[k] = parts.length > 0 ? parts.join(' | ') : JSON.stringify(obj);
      continue;
    }
    out[k] = String(v);
  }
  return out;
}

function fallbackAggregateGlobalsFromRaw(rawChunks: RawChunkExtraction[]): {
  honorifics: Record<string, string>;
  recurring_phrases: Record<string, string>;
  style_guide: Partial<StyleGuide>;
} {
  const honorificBuckets = new Map<string, Set<string>>();
  const phraseBuckets = new Map<string, Set<string>>();
  const styleGuideParts: Partial<StyleGuide>[] = [];

  for (const c of rawChunks) {
    const raw = c?.raw;
    if (!raw || typeof raw !== 'object') continue;

    const honorifics = asStringRecordOrEmpty((raw as any).honorifics);
    for (const [k, v] of Object.entries(honorifics)) {
      if (!honorificBuckets.has(k)) honorificBuckets.set(k, new Set());
      if (v && v.trim()) honorificBuckets.get(k)!.add(v.trim());
    }

    const phrases = asStringRecordOrEmpty((raw as any).recurring_phrases);
    for (const [k, v] of Object.entries(phrases)) {
      if (!phraseBuckets.has(k)) phraseBuckets.set(k, new Set());
      if (v && v.trim()) phraseBuckets.get(k)!.add(v.trim());
    }

    const sg = (raw as any).style_guide;
    if (sg && typeof sg === 'object') styleGuideParts.push(sg);
  }

  const honorifics: Record<string, string> = {};
  for (const [k, set] of honorificBuckets.entries()) {
    const arr = Array.from(set);
    honorifics[k] = arr.length === 1 ? arr[0] : arr.join(' || ');
  }

  const recurring_phrases: Record<string, string> = {};
  for (const [k, set] of phraseBuckets.entries()) {
    const arr = Array.from(set);
    recurring_phrases[k] = arr.length === 1 ? arr[0] : arr.join(' || ');
  }

  // Shallow merge style guide parts; prefer later (later chunks often have more context).
  const style_guide = styleGuideParts.reduce((acc, sg) => ({ ...acc, ...sg }), {} as Partial<StyleGuide>);
  return { honorifics, recurring_phrases, style_guide };
}

function getLanguageDirective(targetLanguage: 'en' | 'ja'): string {
  if (targetLanguage === 'ja') {
    return `
  
  **🌐 TARGET LANGUAGE: Japanese (日本語)**
  
  この韓国語小説を読んで、**日本語話者のための翻訳用語集**を作成してください。
  
  **重要な言語規則:**
  1. **翻訳フィールド (日本語で記述):**
     - Characters: 'name', 'surname', 'given_name', 'english_name', 'description', 'physical_appearance', 'personality', 'occupation', 'speech_style', 'first_appearance', **'abilities'** → 日本語
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
  - Character "name": "キム・ブジャ", "description": "熟練したゲーマー", "abilities": ["火炎魔法", "剣術"]
  - Event "name": "主人公がライバルと初めて出会う"
  - "key_events_in_chunk": ["主人公が新しい力を覚醒させる"]
  `;
  }
  return `
  
  **🌐 TARGET LANGUAGE: English**
  
  You are reading a Korean novel and creating a **translation glossary for English speakers**.
  
  **Critical Language Rules:**
  1. **Translation Fields (Write in ENGLISH):**
     - Characters: 'name', 'surname', 'given_name', 'english_name', 'description', 'physical_appearance', 'personality', 'occupation', 'speech_style', 'first_appearance', **'abilities'** → English
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
  - Character "name": "Kim Bu-ja", "description": "A skilled gamer", "abilities": ["Fire Magic", "Swordsmanship"]
  - Event "name": "The protagonist meets their rival for the first time"
  - "key_events_in_chunk": ["The protagonist awakens a new power"]
  `;
}

function normalizeKey(value: string): string {
  return String(value || '').trim().toLowerCase();
}

function scoreCharacter(c: Partial<GlossaryCharacter> | undefined): number {
  if (!c) return 0;
  const strScore = (s?: string) => (s ? Math.min(200, s.trim().length) : 0);
  const arrScore = (a?: any[]) => (Array.isArray(a) ? Math.min(80, a.length * 10) : 0);
  const objScore = (o?: any) => (o && typeof o === 'object' ? Math.min(50, Object.keys(o).length * 5) : 0);
  return (
    strScore(c.korean_name) +
    strScore(c.name) +
    strScore(c.description) +
    strScore(c.physical_appearance) +
    strScore(c.personality) +
    strScore(c.speech_style) +
    strScore(c.translation_notes) +
    arrScore(c.traits) +
    arrScore(c.abilities) +
    arrScore((c as any).aliases) +
    objScore(c.name_variants)
  );
}

function mergeStringsPreferLonger(a?: string, b?: string): string | undefined {
  const aa = (a || '').trim();
  const bb = (b || '').trim();
  if (!aa) return bb || undefined;
  if (!bb) return aa || undefined;
  return bb.length > aa.length ? bb : aa;
}

function mergeStringArrays(a?: string[], b?: string[]): string[] | undefined {
  const out = new Set<string>();
  for (const x of (a || [])) if (x && String(x).trim()) out.add(String(x).trim());
  for (const x of (b || [])) if (x && String(x).trim()) out.add(String(x).trim());
  const arr = Array.from(out);
  return arr.length > 0 ? arr : undefined;
}

function mergeCharactersRich(a: GlossaryCharacter, b: Partial<GlossaryCharacter>): GlossaryCharacter {
  // Keep ID from consolidated a; enrich other fields.
  const merged: GlossaryCharacter = {
    ...a,
    korean_name: mergeStringsPreferLonger(a.korean_name, b.korean_name),
    description: mergeStringsPreferLonger(a.description, b.description) || a.description,
    physical_appearance: mergeStringsPreferLonger(a.physical_appearance, b.physical_appearance),
    personality: mergeStringsPreferLonger(a.personality, b.personality),
    speech_style: mergeStringsPreferLonger(a.speech_style, b.speech_style),
    translation_notes: mergeStringsPreferLonger(a.translation_notes, b.translation_notes),
    occupation: mergeStringsPreferLonger(a.occupation, b.occupation),
    age: mergeStringsPreferLonger(a.age, b.age),
    gender: mergeStringsPreferLonger(a.gender, b.gender),
    role: (a.role || b.role) as any,
    traits: mergeStringArrays(a.traits, b.traits),
    abilities: mergeStringArrays(a.abilities, b.abilities),
    aliases: mergeStringArrays(a.aliases, (b as any).aliases),
    name_variants: { ...(a.name_variants || {}), ...(b.name_variants || {}) },
  };
  return merged;
}

function buildRawCharacterIndex(rawChunks: RawChunkExtraction[]): {
  byKey: Map<string, GlossaryCharacter>;
  surfaceToKey: Map<string, string>;
} {
  const byKey = new Map<string, GlossaryCharacter>();
  const surfaceToKey = new Map<string, string>();

  for (const c of rawChunks) {
    const raw = c?.raw;
    const arcs = Array.isArray(raw?.arcs) ? raw.arcs : [];
    for (const arc of arcs) {
      const chars = Array.isArray(arc?.characters) ? arc.characters : [];
      for (const ch of chars) {
        if (!ch) continue;
        const name = String(ch.name || '').trim();
        const korean = String(ch.korean_name || '').trim();
        const key = normalizeKey(korean || name);
        if (!key) continue;

        const candidate: GlossaryCharacter = {
          id: String(ch.id || `char-${key}`),
          name: name || (korean || 'Unknown'),
          korean_name: korean || '',
          description: String(ch.description || ''),
          physical_appearance: String(ch.physical_appearance || ''),
          personality: String(ch.personality || ''),
          traits: Array.isArray(ch.traits) ? ch.traits : [],
          emoji: String(ch.emoji || '👤'),
          age: String(ch.age || ''),
          gender: String(ch.gender || ''),
          role: ch.role,
          occupation: String(ch.occupation || ''),
          abilities: Array.isArray(ch.abilities) ? ch.abilities : [],
          speech_style: String(ch.speech_style || ''),
          translation_notes: String(ch.translation_notes || ''),
          name_variants: ch.name_variants || {},
          aliases: Array.isArray(ch.aliases) ? ch.aliases : undefined,
        };

        const existing = byKey.get(key);
        const pick = !existing || scoreCharacter(candidate) > scoreCharacter(existing) ? candidate : existing;
        byKey.set(key, pick);

        // Build surface mapping
        const surfaces: string[] = [];
        if (candidate.name) surfaces.push(candidate.name);
        if (candidate.korean_name) surfaces.push(candidate.korean_name);
        for (const a of (candidate.aliases || [])) surfaces.push(a);
        for (const s of surfaces) {
          const sk = normalizeKey(s);
          if (sk) surfaceToKey.set(sk, key);
        }
      }
    }
  }

  return { byKey, surfaceToKey };
}

function enrichArcsFromRaw(
  arcs: GlossaryArc[],
  rawChunks: RawChunkExtraction[]
): GlossaryArc[] {
  const { byKey, surfaceToKey } = buildRawCharacterIndex(rawChunks);

  return arcs.map((arc) => {
    const surfaceToCanonical = new Map<string, string>();
    for (const ch of (arc.characters || [])) {
      const canonical = ch.name;
      const surfaces = [
        ch.name,
        ch.korean_name,
        ...(ch.aliases || []),
        ...Object.values(ch.name_variants || {}),
      ].filter(Boolean) as string[];
      for (const s of surfaces) {
        const sk = normalizeKey(s);
        if (sk) surfaceToCanonical.set(sk, canonical);
      }
    }

    const enrichedCharacters = (arc.characters || []).map((ch) => {
      const key =
        (ch.korean_name && byKey.has(normalizeKey(ch.korean_name))) ? normalizeKey(ch.korean_name) :
        (byKey.has(normalizeKey(ch.name)) ? normalizeKey(ch.name) :
          surfaceToKey.get(normalizeKey(ch.name)) ||
          (ch.korean_name ? surfaceToKey.get(normalizeKey(ch.korean_name)) : undefined));

      const rawBest = key ? byKey.get(key) : undefined;
      return rawBest ? mergeCharactersRich(ch, rawBest) : ch;
    });

    // Relationship enrichment: if missing or too sparse, pull from raw relationships that map to arc characters.
    let relationships = Array.isArray(arc.relationships) ? [...arc.relationships] : [];
    const relKey = (a: string, b: string, t: string) => `${normalizeKey(a)}|${normalizeKey(b)}|${normalizeKey(t)}`;
    const existingRelKeys = new Set<string>(relationships.map(r => relKey(r.character_a, r.character_b, r.relationship_type)));

    if (relationships.length < 2) {
      for (const c of rawChunks) {
        const raw = c?.raw;
        const rawArcs = Array.isArray(raw?.arcs) ? raw.arcs : [];
        for (const ra of rawArcs) {
          const rels = Array.isArray(ra?.relationships) ? ra.relationships : [];
          for (const r of rels) {
            const a = normalizeKey(String(r.character_a || ''));
            const b = normalizeKey(String(r.character_b || ''));
            if (!a || !b) continue;
            const ca = surfaceToCanonical.get(a);
            const cb = surfaceToCanonical.get(b);
            if (!ca || !cb) continue;
            const next = {
              character_a: ca,
              character_b: cb,
              relationship_type: String(r.relationship_type || 'unknown'),
              description: String(r.description || ''),
              sentiment: r.sentiment || 'neutral',
              addressing: String(r.addressing || ''),
            };
            const k = relKey(next.character_a, next.character_b, next.relationship_type);
            if (existingRelKeys.has(k)) continue;
            existingRelKeys.add(k);
            relationships.push(next);
          }
        }
      }
    }

    // Term enrichment: ensure we don't end up with an empty/too-thin term list.
    let terms = Array.isArray(arc.terms) ? [...arc.terms] : [];
    const termByOriginal = new Set<string>(terms.map(t => normalizeKey(t.original)));
    if (terms.length < 10) {
      for (const c of rawChunks) {
        const raw = c?.raw;
        const rawArcs = Array.isArray(raw?.arcs) ? raw.arcs : [];
        for (const ra of rawArcs) {
          const tlist = Array.isArray(ra?.terms) ? ra.terms : [];
          for (const t of tlist) {
            const orig = String(t.original || '').trim();
            if (!orig) continue;
            const ok =
              typeof t.notes === 'string' && t.notes.trim().length > 0 ||
              typeof t.context === 'string' && t.context.trim().length > 40 ||
              (typeof t.category === 'string' && ['slang', 'cultural', 'concept', 'other'].includes(t.category.toLowerCase()));
            if (!ok) continue;
            const k = normalizeKey(orig);
            if (termByOriginal.has(k)) continue;
            termByOriginal.add(k);
            terms.push({
              id: String(t.id || `term-${k}`),
              original: orig,
              translation: String(t.translation || ''),
              context: String(t.context || ''),
              category: (t.category as any) || 'other',
              notes: String(t.notes || ''),
              aliases: Array.isArray(t.aliases) ? t.aliases : undefined,
            });
          }
        }
      }
    }

    return {
      ...arc,
      characters: enrichedCharacters,
      relationships,
      terms,
    };
  });
}

async function extractFromChunk(chunk: string, chunkIndex: number): Promise<{
  arcs: GlossaryArc[];
  // NOTE: These are treated as *provisional* during per-chunk extraction.
  // Final versions must be produced during consolidation from raw_chunks.
  honorifics?: Record<string, any>;
  recurring_phrases?: Record<string, any>;
  style_guide?: Partial<StyleGuide>;
  rawChunk?: RawChunkExtraction;
}> {
  const targetLanguage = useGlossaryStore.getState().target_language;
  const languageDirective = getLanguageDirective(targetLanguage);

  const prompt = `You are a Korean web novel translation expert. Extract COMPLETE and DETAILED information for translation from this chunk.
${languageDirective}

**🎯 EXTRACTION PRIORITY: NUANCE & COMPACTNESS**

0. **RAW MENTIONS (IMPORTANT FOR ENTITY RESOLUTION)**
   - For each character/location/term, include:
     - aliases: [all surface forms used in THIS chunk: nicknames, titles, variants, transliterations]
   - Do NOT try to unify across chunks here; just capture mentions faithfully.

1. **CHARACTERS - Extract EVERY character**
   ✅ ALWAYS extract these fields:
   - name (English transliteration)
   - korean_name (Original Korean)
   - age (Approximate)
   - speech_style (Detailed description with examples)
   - physical_appearance (Distinctive features only)
   - personality (Core personality)
   - traits (Key traits list)
   - role (protagonist/antagonist/major/supporting/minor)
   - emoji (Icon)
   - translation_notes (CRITICAL: "Charm points", "Gap moe", "Nuances to preserve", "Differentiation")
   
   ✅ Extract if mentioned:
   - name_variants (Nicknames)
   - gender
   - occupation
   - abilities (Specific skills/magic)
   - description (General)

   💡 IMPORTANT: Capture the "vibe" in translation_notes.

2. **RELATIONSHIPS**
   - character_a, character_b
   - addressing (Exact term)
   - relationship_type
   - description (Concise)
   - sentiment

3. **KEY EVENTS**
   - 5-10 key plot points (Concise)

4. **LOCATIONS & TERMS**
   - Extract all relevant items with context

5. **HONORIFICS & PHRASES**
   - All honorifics and recurring phrases

6. **STYLE GUIDE**
   - translation_guidelines: Global notes (e.g. Heroine differentiation)

**📋 JSON STRUCTURE:**
{
  "arcs": [{
    "id": "arc-${chunkIndex}",
    "name": "Arc Name",
    "description": "Short description",
    "theme": "Theme",
    "start_chunk": ${chunkIndex},
    "characters": [{
      "id": "char-name-${chunkIndex}",
      "name": "English Name",
      "korean_name": "한글이름",
      "aliases": ["별명", "직함", "다른표기"],
      "age": "age",
      "speech_style": "Style description",
      "physical_appearance": "Features",
      "personality": "Personality",
      "traits": ["trait1"],
      "translation_notes": "Charm points, nuances",
      "name_variants": {"nickname": "별명"},
      "emoji": "😊",
      "role": "role",
      "abilities": ["ability1"]
    }],
    "relationships": [{
      "character_a": "Name A",
      "character_b": "Name B",
      "relationship_type": "type",
      "description": "desc",
      "sentiment": "neutral",
      "addressing": "term"
    }],
    "events": [{
      "id": "event-${chunkIndex}-0",
      "name": "Event name",
      "description": "What happened",
      "characters_involved": ["Name1"],
      "importance": "major"
    }],
    "locations": [{
      "id": "loc-${chunkIndex}-0",
      "name": "Place Name",
      "korean_name": "한글지명",
      "aliases": ["다른지명표기"],
      "description": "Desc",
      "type": "type",
      "emoji": "🏰"
    }],
    "key_events": ["Event 1"],
    "terms": [{
      "original": "한글",
      "translation": "English",
      "context": "Context",
      "aliases": ["다른표현", "약칭"],
      "category": "cat"
    }]
  }],
  "honorifics": {
    "님": {
      "meaning": "formal honorific suffix",
      "translation_strategy": "keep as -nim on first mention then optionally omit depending on context",
      "usage_notes": "attached to names/titles; conveys respect and distance",
      "examples": ["OO님"]
    }
  },
  "recurring_phrases": {
    "그때 그 순간": {
      "translation": "at that very moment",
      "nuance": "heightens immediacy/drama; recurring narration hook",
      "usage_notes": "often used at climactic beats; keep consistent",
      "examples": ["그때 그 순간, ..."]
    }
  },
  "style_guide": {
    "translation_guidelines": "Global notes",
    "genre": "genre",
    "tone": "tone"
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
        translation: term.translation || term.preferred_translation || '',
        context: term.context || '',
        category: term.category || 'other',
        notes: term.notes || '',
        aliases: Array.isArray(term.aliases) ? term.aliases : undefined,
        preferred_translation: term.preferred_translation || undefined,
        alternatives: Array.isArray(term.alternatives) ? term.alternatives : undefined,
        why_hard: term.why_hard || undefined,
        do_not_translate_as: Array.isArray(term.do_not_translate_as) ? term.do_not_translate_as : undefined,
        decision_notes: term.decision_notes || undefined,
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

    const rawChunk: RawChunkExtraction = {
      chunkIndex,
      extractedAt: new Date().toISOString(),
      model: 'gemini-3-pro-preview',
      raw: parsed,
      rawText: jsonString,
    };

    return { arcs, honorifics, recurring_phrases, style_guide, rawChunk };
  } catch (error) {
    console.error(`❌ Error extracting from chunk ${chunkIndex}:`, error);
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Stack trace:', error.stack);
    }
    const rawChunk: RawChunkExtraction = {
      chunkIndex,
      extractedAt: new Date().toISOString(),
      model: 'gemini-3-pro-preview',
      raw: null,
      rawText: undefined,
      parseError: error instanceof Error ? error.message : String(error),
    };
    return { arcs: [], rawChunk };
  }
}


// Removed unused consolidation functions:
// - consolidateCharacters (previously lines 498-645)
// - consolidateEvents (previously lines 646-726)
// - consolidateLocations (previously lines 727-785)
// - consolidateTerms (previously lines 786-844)
// All data is now managed within arcs.

// Legacy arc-only consolidation (LLM-based). Used only as a last-resort fallback when raw consolidation fails.
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
   - Combine similar/sequential arcs
   - Sort chronologically
   - Each arc = distinct story phase

**2. COMPLETE CHARACTERS IN EACH ARC ⭐ CRITICAL ⭐**
   
   **Step A: Build character database**
   - For EACH unique character across ALL arcs, merge all information:
     * Combine all traits/name_variants
     * Take longest/most detailed speech_style, physical_appearance, personality
     * **MERGE translation_notes**: Combine all notes about charm points/nuances
     * Use first appearance arc
     * Keep highest importance role
   
   **Step B: Populate EACH arc's characters array**
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
     "translation_notes": "Charm point: Contrast between his polite speech and ruthless efficiency in battle.",
     "name_variants": {"title": "Special Admission No.1", "nickname": "Simon"},
     "emoji": "👦",
     "role": "protagonist",
     "first_appearance_arc": "Admission to Kizen",
     "role_in_arc": "protagonist",
     "first_appearance": true
   }
   
   💡 KEY POINT: Same character appears in multiple arcs → Include COMPLETE info in EACH arc
   💡 NO SHORTCUTS: Every arc.characters must have full GlossaryCharacter objects

**3. CONSOLIDATE STYLE GUIDE**
   - Merge translation_guidelines from all chunks into a comprehensive guide.
   - Ensure tone, genre, and honorific usage are consistent.

**4. ORGANIZE RELATIONSHIPS (Arc-specific)**
   ✅ Group relationships by arc
   ✅ Keep relationship evolution visible across arcs
   ✅ MUST include "addressing" field for EVERY relationship

**5. MERGE TERMS & LOCATIONS**
   - Deduplicate identical terms/locations
   - Keep arc-specific context if meaning changes

**6. HONORIFICS & PHRASES**
   - Consolidate into global lists

**📋 JSON STRUCTURE:**
{
  "arcs": [{
    "id": "arc-consolidated-1",
    "name": "Arc Name",
    "description": "Description",
    "theme": "Theme",
    "characters": [ { /* ...Complete Character Object... */ } ],
    "relationships": [ { /* ...Relationship Object... */ } ],
    "events": [ { /* ...Event Object... */ } ],
    "locations": [ { /* ...Location Object... */ } ],
    "key_events": ["Event 1", "Event 2"],
    "terms": [ { /* ...Term Object... */ } ]
  }],
  "honorifics": {},
  "recurring_phrases": {},
  "style_guide": {
    "translation_guidelines": "Global notes",
    "genre": "genre",
    "tone": "tone"
  }
}

Return ONLY valid JSON. NO code blocks. NO markdown.

Data to consolidate:
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

async function consolidateFromRawChunks(input: RawChunkExtraction[]): Promise<{
  arcs: GlossaryArc[];
  honorifics?: Record<string, string>;
  recurring_phrases?: Record<string, string>;
  style_guide?: Partial<StyleGuide>;
}> {
  if (!geminiAPI) throw new Error('Gemini API not initialized');

  const targetLanguage = useGlossaryStore.getState().target_language;
  const languageDirective = getLanguageDirective(targetLanguage);

  // Keep prompt size bounded: only pass parsed JSON (no full novel text).
  const compact = input
    .filter(c => c && c.chunkIndex !== undefined)
    .map(c => ({
      chunkIndex: c.chunkIndex,
      extractedAt: c.extractedAt,
      parseError: c.parseError,
      raw: c.raw,
    }));

  const prompt = `You are a Korean web novel translation expert.
${languageDirective}

You will be given RAW per-chunk extractions from earlier LLM calls.
Your job is to IMPROVE the glossary by doing a consolidation pass that:

1) ENTITY RESOLUTION (CRITICAL)
   - Identify when multiple surface forms refer to the SAME character/location/term across chunks.
   - Merge them into a single canonical entity.
   - Preserve ALL aliases/surface forms you used to unify them.
   - Do NOT rely on naive string matching only; use evidence, relationships, roles, speech style, context.

2) ARC CONSOLIDATION (DO NOT OVER-COLLAPSE)
   - Create a chronologically ordered arc list that is useful for translators.
   - If the input clearly contains multiple distinct arcs (different settings, goals, cast focus), keep them separate.
   - HARD RULE: If there are 4+ chunk extractions, do NOT output fewer than 4 arcs.
   - Prefer 6-12 arcs for long works. Only merge arcs when they are truly the same segment.
   - Each arc must contain complete character objects (not just names).

3) ARC-SPECIFIC EXTRACTION / ENRICHMENT
   - For each arc, (re)extract and refine: personality, status/identity (신분/직함/역할), abilities, and relationships.
   - Relationships must include addressing when available (호칭/부르는 말).

3.5) CHARACTER RICHNESS (TRANSLATION GUIDE QUALITY)
   - Characters are the most important part of this glossary. Do NOT compress them into one-liners.
   - Merge duplicates across chunks (same person with different names) but KEEP their richness:
     - keep the best/longest descriptions, speech_style, translation_notes
     - union traits, abilities, aliases, name_variants
   - Make sure major characters have substantial translation_notes describing how to translate their voice.

3.6) TRANSLATION-CRITICAL TERMS (NOT LOW-LEVEL)
   - The goal is a translator guide. Prefer terms that are genuinely hard or decision-heavy:
     - idioms, slang/insults, speech-pattern markers, illeism/quirks, honorific/title localization decisions,
       culturally loaded phrases, magic/system terminology with inconsistent renderings, ambiguous polysemy.
   - Avoid trivial obvious nouns/titles unless they have special nuance in THIS work.
   - For each term, provide a clear decision: canonical translation + allowed variants + what NOT to translate as + why.
   - Minimum: 12 terms if there is enough data; Maximum: 60 terms total per entire output.

4) STRICT OUTPUT REQUIREMENTS
   - Return ONLY valid JSON. No markdown, no code fences.
   - Keep this output schema (you may add fields but must not remove these):
{
  "arcs": [{
    "id": "arc-1",
    "name": "Arc Name",
    "description": "Description",
    "theme": "Theme",
    "start_chunk": 0,
    "end_chunk": 5,
    "characters": [{
      "id": "char-canonical-id",
      "name": "Canonical English Name",
      "korean_name": "한글이름",
      "aliases": ["별칭/직함/다른표기"],
      "description": "Short description",
      "physical_appearance": "Distinctive features",
      "personality": "Core personality (arc-aware)",
      "traits": ["trait1", "trait2"],
      "emoji": "👤",
      "age": "age",
      "gender": "gender",
      "role": "protagonist|antagonist|major|supporting|minor",
      "occupation": "occupation",
      "abilities": ["ability1"],
      "speech_style": "speech style",
      "translation_notes": "nuances to preserve",
      "name_variants": {"title": "직함"},
      "role_in_arc": "role in this arc",
      "first_appearance": true
    }],
    "relationships": [{
      "character_a": "Canonical English Name A",
      "character_b": "Canonical English Name B",
      "relationship_type": "type",
      "description": "desc",
      "sentiment": "positive|negative|neutral",
      "addressing": "호칭/부르는말"
    }],
    "events": [{
      "id": "event-...",
      "name": "Event name",
      "description": "What happened",
      "characters_involved": ["Canonical English Name"],
      "location": "Canonical location name",
      "importance": "major|minor"
    }],
    "locations": [{
      "id": "location-...",
      "name": "Canonical location name",
      "korean_name": "한글지명",
      "aliases": ["다른표기"],
      "description": "desc",
      "emoji": "📍",
      "type": "type"
    }],
    "key_events": ["..."],
    "terms": [{
      "id": "term-...",
      "original": "한글",
      "translation": "English/Japanese",
      "context": "context",
      "category": "name|place|item|concept|cultural|other",
      "notes": "notes",
      "aliases": ["다른표현"],
      "preferred_translation": "same as translation (canonical)",
      "alternatives": ["allowed variant 1", "allowed variant 2"],
      "why_hard": "why this is hard / what nuance is at stake",
      "do_not_translate_as": ["bad option 1", "bad option 2"],
      "decision_notes": "short, actionable guidance for the translator"
    }]
  }],
  "honorifics": {},
  "recurring_phrases": {},
  "style_guide": {}
}

HONORIFICS (CRITICAL):
- Build honorifics by considering ALL chunk raw extractions (do NOT just union keys).
- Deduplicate near-duplicates and merge explanations into ONE best translator-facing entry per key.
- Value should be a single string that includes: meaning + usage + recommended translation strategy.
- If the same key has conflicting notes across chunks, resolve by context and include the most defensible guidance.

RECURRING PHRASES (CRITICAL):
- Build recurring_phrases by considering ALL chunk raw extractions.
- Deduplicate and choose a canonical translation (or a primary + allowed variants).
- Value should be a single string that includes: canonical translation + nuance + consistency guidance.

IMPORTANT:
- Remove empty fields.
- Ensure relationships' character names match the arc character names exactly.
- DO NOT discard arc.relationships — they are required for translation guidance.

RAW CHUNK EXTRACTIONS:
${JSON.stringify(compact, null, 2)}
`;

  console.log('🔄 Consolidating glossary from raw chunks with LLM...');
  const model = geminiAPI.getGenerativeModel({ model: 'gemini-3-pro-preview' });
  const result = await model.generateContent(prompt);
  const content = (await result.response).text();

  let parsed: any;
  try {
    parsed = parseLenientJson(content);
  } catch (e) {
    console.error('❌ Failed to parse raw consolidation response');
    console.error('Full response:', content);
    throw e;
  }
  const normalizedArcs: GlossaryArc[] = (parsed.arcs || []).map((arc: any, arcIdx: number) => ({
    id: arc.id || arc.name || `arc-${arcIdx}`,
    name: arc.name || `Arc ${arcIdx + 1}`,
    description: arc.description || '',
    theme: arc.theme || '',
    characters: Array.isArray(arc.characters) ? arc.characters : [],
    events: Array.isArray(arc.events) ? arc.events : [],
    locations: Array.isArray(arc.locations) ? arc.locations : [],
    relationships: Array.isArray(arc.relationships) ? arc.relationships : [],
    key_events: Array.isArray(arc.key_events) ? arc.key_events : [],
    background_changes: Array.isArray(arc.background_changes) ? arc.background_changes : [],
    terms: (Array.isArray(arc.terms) ? arc.terms : []).map((t: any, termIdx: number) => ({
      id: t.id || `term-${arcIdx}-${termIdx}`,
      original: t.original || '',
      translation: t.translation || t.preferred_translation || '',
      context: t.context || '',
      category: (t.category as GlossaryTerm['category']) || 'other',
      notes: t.notes || '',
      aliases: Array.isArray(t.aliases) ? t.aliases : undefined,
      preferred_translation: t.preferred_translation || undefined,
      alternatives: Array.isArray(t.alternatives) ? t.alternatives : undefined,
      why_hard: t.why_hard || undefined,
      do_not_translate_as: Array.isArray(t.do_not_translate_as) ? t.do_not_translate_as : undefined,
      decision_notes: t.decision_notes || undefined,
    })),
    start_chunk: arc.start_chunk,
    end_chunk: arc.end_chunk,
  }));
  const enriched = enrichArcsFromRaw(normalizedArcs, input);

  // Safety: if the LLM collapses arcs too aggressively, fall back to richer per-chunk arcs.
  const rawSeedCount = input.reduce((acc, c) => {
    const arcs = Array.isArray(c?.raw?.arcs) ? c.raw.arcs : [];
    for (const a of arcs) {
      const nm = normalizeKey(String(a?.name || a?.id || ''));
      if (nm) acc.add(nm);
    }
    return acc;
  }, new Set<string>()).size;

  const finalArcs = (rawSeedCount >= 4 && enriched.length <= 2) ? enrichArcsFromRaw(
    input.flatMap(c => (Array.isArray(c?.raw?.arcs) ? c.raw.arcs : []))
      .map((a: any, i: number) => ({
        id: a.id || a.name || `arc-raw-${i}`,
        name: a.name || `Arc ${i + 1}`,
        description: a.description || '',
        theme: a.theme || '',
        characters: Array.isArray(a.characters) ? a.characters : [],
        events: Array.isArray(a.events) ? a.events : [],
        locations: Array.isArray(a.locations) ? a.locations : [],
        relationships: Array.isArray(a.relationships) ? a.relationships : [],
        key_events: Array.isArray(a.key_events) ? a.key_events : [],
        background_changes: Array.isArray(a.background_changes) ? a.background_changes : [],
        terms: Array.isArray(a.terms) ? a.terms : [],
        start_chunk: a.start_chunk,
        end_chunk: a.end_chunk,
      })) as any,
    input
  ) : enriched;

  return {
    arcs: finalArcs,
    honorifics: asStringRecordOrEmpty(parsed.honorifics),
    recurring_phrases: asStringRecordOrEmpty(parsed.recurring_phrases),
    style_guide: parsed.style_guide || {},
  };
}

type ConsolidatedGlossary = {
  arcs: GlossaryArc[];
  honorifics?: Record<string, string>;
  recurring_phrases?: Record<string, string>;
  style_guide?: Partial<StyleGuide>;
};

function summarizeRawForLLM(c: RawChunkExtraction) {
  // Keep only what matters for consolidation; avoid prompt bloat.
  const raw = c?.raw || {};
  const arcs = Array.isArray((raw as any).arcs) ? (raw as any).arcs : [];
  const slimArcs = arcs.map((a: any) => ({
    id: a.id,
    name: a.name,
    description: a.description,
    theme: a.theme,
    start_chunk: a.start_chunk,
    end_chunk: a.end_chunk,
    characters: Array.isArray(a.characters)
      ? a.characters.map((ch: any) => ({
          id: ch.id,
          name: ch.name,
          korean_name: ch.korean_name,
          aliases: ch.aliases,
          role: ch.role,
          occupation: ch.occupation,
          abilities: ch.abilities,
          speech_style: ch.speech_style,
          translation_notes: ch.translation_notes,
          traits: ch.traits,
          physical_appearance: ch.physical_appearance,
          personality: ch.personality,
          name_variants: ch.name_variants,
        }))
      : [],
    relationships: Array.isArray(a.relationships) ? a.relationships : [],
    events: Array.isArray(a.events) ? a.events : [],
    locations: Array.isArray(a.locations) ? a.locations : [],
    terms: Array.isArray(a.terms)
      ? a.terms.map((t: any) => ({
          id: t.id,
          original: t.original,
          translation: t.translation,
          preferred_translation: t.preferred_translation,
          alternatives: t.alternatives,
          category: t.category,
          context: t.context,
          notes: t.notes,
          aliases: t.aliases,
          why_hard: t.why_hard,
          do_not_translate_as: t.do_not_translate_as,
          decision_notes: t.decision_notes,
        }))
      : [],
    key_events: Array.isArray(a.key_events) ? a.key_events : [],
  }));

  return {
    chunkIndex: c.chunkIndex,
    extractedAt: c.extractedAt,
    parseError: c.parseError,
    raw: {
      arcs: slimArcs,
      honorifics: (raw as any).honorifics,
      recurring_phrases: (raw as any).recurring_phrases,
      style_guide: (raw as any).style_guide,
    },
  };
}

function batchByJsonSize<T>(items: T[], maxChars: number): T[][] {
  const batches: T[][] = [];
  let cur: T[] = [];
  let curSize = 0;

  for (const it of items) {
    const s = JSON.stringify(it);
    const size = s.length;
    if (cur.length > 0 && curSize + size > maxChars) {
      batches.push(cur);
      cur = [];
      curSize = 0;
    }
    cur.push(it);
    curSize += size;
  }
  if (cur.length > 0) batches.push(cur);
  return batches;
}

async function llmConsolidateJson(prompt: string): Promise<any> {
  if (!geminiAPI) throw new Error('Gemini API not initialized');
  const model = geminiAPI.getGenerativeModel({ model: 'gemini-3-pro-preview' });
  const result = await model.generateContent(prompt);
  const content = (await result.response).text();
  return parseLenientJson(content);
}

function normalizeConsolidated(parsed: any): ConsolidatedGlossary {
  const arcs: GlossaryArc[] = (parsed?.arcs || []).map((arc: any, arcIdx: number) => ({
    id: arc.id || arc.name || `arc-${arcIdx}`,
    name: arc.name || `Arc ${arcIdx + 1}`,
    description: arc.description || '',
    theme: arc.theme || '',
    characters: Array.isArray(arc.characters) ? arc.characters : [],
    events: Array.isArray(arc.events) ? arc.events : [],
    locations: Array.isArray(arc.locations) ? arc.locations : [],
    relationships: Array.isArray(arc.relationships) ? arc.relationships : [],
    key_events: Array.isArray(arc.key_events) ? arc.key_events : [],
    background_changes: Array.isArray(arc.background_changes) ? arc.background_changes : [],
    terms: (Array.isArray(arc.terms) ? arc.terms : []).map((t: any, termIdx: number) => ({
      id: t.id || `term-${arcIdx}-${termIdx}`,
      original: t.original || '',
      translation: t.translation || t.preferred_translation || '',
      preferred_translation: t.preferred_translation || undefined,
      alternatives: Array.isArray(t.alternatives) ? t.alternatives : undefined,
      context: t.context || '',
      category: (t.category as GlossaryTerm['category']) || 'other',
      notes: t.notes || '',
      aliases: Array.isArray(t.aliases) ? t.aliases : undefined,
      why_hard: t.why_hard || undefined,
      do_not_translate_as: Array.isArray(t.do_not_translate_as) ? t.do_not_translate_as : undefined,
      decision_notes: t.decision_notes || undefined,
    })),
    start_chunk: arc.start_chunk,
    end_chunk: arc.end_chunk,
  }));

  return {
    arcs,
    honorifics: asStringRecordOrEmpty(parsed?.honorifics),
    recurring_phrases: asStringRecordOrEmpty(parsed?.recurring_phrases),
    style_guide: parsed?.style_guide || {},
  };
}

function backfillArcFromRawByChunkRange(
  arc: GlossaryArc,
  rawChunks: RawChunkExtraction[]
): GlossaryArc {
  const { byKey, surfaceToKey } = buildRawCharacterIndex(rawChunks);

  const start = Number.isFinite(arc.start_chunk as any) ? (arc.start_chunk as number) : 0;
  const end = Number.isFinite(arc.end_chunk as any)
    ? (arc.end_chunk as number)
    : (rawChunks.length > 0 ? Math.max(...rawChunks.map(c => c.chunkIndex)) : start);

  const inRange = (idx: number) => idx >= start && idx <= end;

  // Collect candidate entities (keys) observed in raw chunks within range
  const charKeys = new Set<string>();
  const locNames = new Map<string, any>();
  const termByOrig = new Map<string, any>();
  const relCandidates: any[] = [];
  const eventCandidates: any[] = [];

  for (const c of rawChunks) {
    if (!c || !inRange(c.chunkIndex)) continue;
    const arcs = Array.isArray(c.raw?.arcs) ? c.raw.arcs : [];
    for (const ra of arcs) {
      const chars = Array.isArray(ra?.characters) ? ra.characters : [];
      for (const ch of chars) {
        const key = normalizeKey(String(ch?.korean_name || ch?.name || ''));
        if (key) charKeys.add(key);
        const aliases = Array.isArray(ch?.aliases) ? ch.aliases : [];
        for (const a of aliases) {
          const ak = surfaceToKey.get(normalizeKey(String(a)));
          if (ak) charKeys.add(ak);
        }
      }

      const rels = Array.isArray(ra?.relationships) ? ra.relationships : [];
      for (const r of rels) relCandidates.push(r);

      const events = Array.isArray(ra?.events) ? ra.events : [];
      for (const e of events) eventCandidates.push(e);

      const locs = Array.isArray(ra?.locations) ? ra.locations : [];
      for (const l of locs) {
        const name = String(l?.name || '').trim();
        if (!name) continue;
        const k = normalizeKey(name);
        if (!locNames.has(k)) locNames.set(k, l);
      }

      const terms = Array.isArray(ra?.terms) ? ra.terms : [];
      for (const t of terms) {
        const orig = String(t?.original || '').trim();
        if (!orig) continue;
        const ok =
          (typeof t.notes === 'string' && t.notes.trim().length > 0) ||
          (typeof t.context === 'string' && t.context.trim().length > 40) ||
          (typeof t.why_hard === 'string' && t.why_hard.trim().length > 0) ||
          (typeof t.decision_notes === 'string' && t.decision_notes.trim().length > 0);
        if (!ok) continue;
        const tk = normalizeKey(orig);
        if (!termByOrig.has(tk)) termByOrig.set(tk, t);
      }
    }
  }

  // If LLM returned no chunk ranges, avoid duplicating everything into every arc by using a smaller heuristic:
  // fall back to "seed by arc name" only if we can, otherwise keep range-based fill.
  const needsSeed = !Number.isFinite(arc.start_chunk as any) || !Number.isFinite(arc.end_chunk as any);
  if (needsSeed && charKeys.size === 0) {
    // nothing to backfill
    return arc;
  }

  // Backfill characters if empty (or suspiciously small)
  const existingCount = Array.isArray(arc.characters) ? arc.characters.length : 0;
  let characters = Array.isArray(arc.characters) ? [...arc.characters] : [];
  const canonNameByKey = new Map<string, string>();
  for (const k of charKeys) {
    const best = byKey.get(k);
    if (!best) continue;
    canonNameByKey.set(k, best.name);
  }

  if (existingCount < 3 && charKeys.size > 0) {
    characters = [];
    for (const k of charKeys) {
      const best = byKey.get(k);
      if (!best) continue;
      // Deep clone-ish to avoid accidental shared references
      characters.push({
        ...best,
        traits: Array.isArray(best.traits) ? [...best.traits] : best.traits,
        abilities: Array.isArray(best.abilities) ? [...best.abilities] : best.abilities,
        aliases: Array.isArray(best.aliases) ? [...best.aliases] : best.aliases,
        name_variants: best.name_variants ? { ...best.name_variants } : best.name_variants,
      });
    }
  }

  // Backfill relationships if empty
  let relationships = Array.isArray(arc.relationships) ? [...arc.relationships] : [];
  if (relationships.length < 2 && characters.length > 0 && relCandidates.length > 0) {
    const surfaceToCanonical = new Map<string, string>();
    for (const ch of characters) {
      const surfaces = [
        ch.name,
        ch.korean_name,
        ...(ch.aliases || []),
        ...Object.values(ch.name_variants || {}),
      ].filter(Boolean) as string[];
      for (const s of surfaces) surfaceToCanonical.set(normalizeKey(s), ch.name);
    }

    const seen = new Set<string>();
    for (const r of relCandidates) {
      const a = surfaceToCanonical.get(normalizeKey(String(r?.character_a || '')));
      const b = surfaceToCanonical.get(normalizeKey(String(r?.character_b || '')));
      if (!a || !b) continue;
      const type = String(r?.relationship_type || 'unknown');
      const key = `${normalizeKey(a)}|${normalizeKey(b)}|${normalizeKey(type)}`;
      if (seen.has(key)) continue;
      seen.add(key);
      relationships.push({
        character_a: a,
        character_b: b,
        relationship_type: type,
        description: String(r?.description || ''),
        sentiment: (r?.sentiment as any) || 'neutral',
        addressing: String(r?.addressing || ''),
      });
    }
  }

  // Backfill locations/events if empty
  let locations = Array.isArray(arc.locations) ? [...arc.locations] : [];
  if (locations.length === 0 && locNames.size > 0) {
    for (const l of locNames.values()) {
      const name = String(l?.name || '').trim();
      if (!name) continue;
      locations.push({
        id: String(l?.id || `location-${normalizeKey(name)}`),
        name,
        korean_name: String(l?.korean_name || ''),
        description: String(l?.description || ''),
        emoji: String(l?.emoji || '📍'),
        type: String(l?.type || ''),
        atmosphere: l?.atmosphere,
        significance: l?.significance,
        aliases: Array.isArray(l?.aliases) ? l.aliases : undefined,
      } as any);
    }
  }

  let events = Array.isArray(arc.events) ? [...arc.events] : [];
  if (events.length === 0 && eventCandidates.length > 0) {
    // Only keep events that mention any arc character surface form (best-effort).
    const surfaceSet = new Set<string>();
    for (const ch of characters) {
      surfaceSet.add(normalizeKey(ch.name));
      if (ch.korean_name) surfaceSet.add(normalizeKey(ch.korean_name));
      for (const a of (ch.aliases || [])) surfaceSet.add(normalizeKey(a));
    }
    for (const e of eventCandidates) {
      const involved = Array.isArray(e?.characters_involved) ? e.characters_involved : [];
      const hit = involved.some((x: any) => surfaceSet.has(normalizeKey(String(x))));
      if (!hit && involved.length > 0) continue;
      events.push({
        id: String(e?.id || `event-${normalizeKey(String(e?.name || ''))}`),
        name: String(e?.name || ''),
        description: String(e?.description || ''),
        characters_involved: involved.map((x: any) => String(x)),
        location: String(e?.location || ''),
        importance: (e?.importance as any) || 'minor',
      });
    }
  }

  // Backfill terms if empty/too small
  let terms = Array.isArray(arc.terms) ? [...arc.terms] : [];
  if (terms.length < 5 && termByOrig.size > 0) {
    for (const t of termByOrig.values()) {
      terms.push({
        id: String(t?.id || `term-${normalizeKey(String(t?.original || ''))}`),
        original: String(t?.original || ''),
        translation: String(t?.translation || t?.preferred_translation || ''),
        preferred_translation: t?.preferred_translation || undefined,
        alternatives: Array.isArray(t?.alternatives) ? t.alternatives : undefined,
        context: String(t?.context || ''),
        category: t?.category || 'other',
        notes: String(t?.notes || ''),
        aliases: Array.isArray(t?.aliases) ? t.aliases : undefined,
        why_hard: t?.why_hard || undefined,
        do_not_translate_as: Array.isArray(t?.do_not_translate_as) ? t.do_not_translate_as : undefined,
        decision_notes: t?.decision_notes || undefined,
      } as any);
    }
  }

  return {
    ...arc,
    start_chunk: Number.isFinite(arc.start_chunk as any) ? arc.start_chunk : start,
    end_chunk: Number.isFinite(arc.end_chunk as any) ? arc.end_chunk : end,
    characters,
    relationships,
    locations,
    events,
    terms,
  };
}

function backfillGlossaryFromRaw(
  arcs: GlossaryArc[],
  rawChunks: RawChunkExtraction[]
): GlossaryArc[] {
  return arcs.map((a) => backfillArcFromRawByChunkRange(a, rawChunks));
}

async function consolidateFromRawChunksHierarchical(input: RawChunkExtraction[]): Promise<ConsolidatedGlossary> {
  const targetLanguage = useGlossaryStore.getState().target_language;
  const languageDirective = getLanguageDirective(targetLanguage);
  const compact = input.filter(Boolean).map(summarizeRawForLLM);

  // Map phase: consolidate in batches to avoid prompt overflow.
  const mapBatches = batchByJsonSize(compact, 42000);

  const mapPromptBase = `You are a Korean web novel translation expert.
${languageDirective}

You will receive RAW per-chunk glossary extractions for a SUBSET of chunks.
Your task: produce a HIGH-FIDELITY consolidated glossary JSON for THIS subset.

CRITICAL REQUIREMENTS:
- Do NOT over-summarize. Preserve character richness (speech_style, translation_notes, traits, abilities).
- Merge duplicate entities within this subset, preserving aliases.
- Preserve and enrich arc relationships (addressing, relationship_type, sentiment) when present in inputs.
- Extract TRANSLATION-CRITICAL TERMS (hard decisions). Avoid trivial nouns/titles unless nuance matters.
- Output ONLY valid JSON (no markdown).

OUTPUT SCHEMA (must include these keys; you may add fields):
{
  "arcs": [...],
  "honorifics": {},
  "recurring_phrases": {},
  "style_guide": {}
}
`;

  const slices: ConsolidatedGlossary[] = [];
  for (let i = 0; i < mapBatches.length; i++) {
    const batch = mapBatches[i];
    const prompt = `${mapPromptBase}

RAW SUBSET (${i + 1}/${mapBatches.length}):
${JSON.stringify(batch, null, 2)}
`;
    const parsed = await llmConsolidateJson(prompt);
    slices.push(normalizeConsolidated(parsed));
  }

  // Reduce phase: iteratively merge slice glossaries until one remains.
  let current = slices.map((s, idx) => ({
    sliceIndex: idx,
    arcs: s.arcs,
    honorifics: s.honorifics,
    recurring_phrases: s.recurring_phrases,
    style_guide: s.style_guide,
  }));

  const reducePromptBase = `You are a Korean web novel translation expert.
${languageDirective}

You will receive MULTIPLE already-consolidated glossary slices (JSON).
Merge them into ONE final glossary JSON.

CRITICAL REQUIREMENTS:
- ENTITY RESOLUTION across slices (same character with different names/aliases).
- DO NOT over-collapse arcs. For long works, prefer 6-12 arcs. If there are many slices, do NOT output fewer than 6 arcs unless the story truly has fewer.
- Preserve rich character fields (keep the best/longest descriptions and union traits/abilities/aliases).
- Preserve arc-specific relationships and addressing; do not drop them.
- Terms must be translation-decision oriented (canonical choice + why + allowed variants + avoid list).
- Output ONLY valid JSON (no markdown).

HARD OUTPUT REQUIREMENTS:
- Every arc MUST include start_chunk and end_chunk as integers.
- Every arc MUST include non-empty arrays for characters and relationships when the information exists in slices.
`;

  while (current.length > 1) {
    const reduceBatches = batchByJsonSize(current, 42000);
    const next: any[] = [];
    for (let i = 0; i < reduceBatches.length; i++) {
      const prompt = `${reducePromptBase}

GLOSSARY SLICES BATCH (${i + 1}/${reduceBatches.length}):
${JSON.stringify(reduceBatches[i], null, 2)}
`;
      const parsed = await llmConsolidateJson(prompt);
      const norm = normalizeConsolidated(parsed);
      next.push({
        sliceIndex: `merge-${Date.now()}-${i}`,
        arcs: norm.arcs,
        honorifics: norm.honorifics,
        recurring_phrases: norm.recurring_phrases,
        style_guide: norm.style_guide,
      });
    }
    current = next;
  }

  const finalParsed = current[0] || {};
  const normalized = normalizeConsolidated(finalParsed);
  // Final safety: if the LLM returns arc skeletons, backfill details from raw chunks so the UI isn't empty.
  return {
    ...normalized,
    arcs: backfillGlossaryFromRaw(normalized.arcs, input),
  };
}

async function consolidateFromRawChunksWithRetries(
  input: RawChunkExtraction[]
): Promise<{
  arcs: GlossaryArc[];
  honorifics?: Record<string, string>;
  recurring_phrases?: Record<string, string>;
  style_guide?: Partial<StyleGuide>;
}> {
  // Attempt 0: Hierarchical LLM consolidation for large projects (avoids prompt overflow).
  if (input.length >= 20) {
    try {
      return await consolidateFromRawChunksHierarchical(input);
    } catch (e0) {
      console.warn('⚠️ Hierarchical consolidation failed; falling back to single-shot attempts...', e0);
    }
  }

  // Attempt 1: single-shot full raw JSON
  try {
    return await consolidateFromRawChunks(input);
  } catch (e1) {
    console.warn('⚠️ Raw consolidation attempt 1 failed; retrying with compact-lite payload...', e1);
  }

  // Attempt 2: reduce payload size to avoid truncation / prompt overflow.
  const lite: RawChunkExtraction[] = input.map(c => {
    const raw = c?.raw;
    const arcs = Array.isArray(raw?.arcs) ? raw.arcs : [];
    const slimArcs = arcs.map((a: any) => ({
      id: a.id,
      name: a.name,
      description: a.description,
      theme: a.theme,
      start_chunk: a.start_chunk,
      end_chunk: a.end_chunk,
      // Keep only the minimum needed for entity resolution + arc shaping
      characters: Array.isArray(a.characters)
        ? a.characters.map((ch: any) => ({
            name: ch.name,
            korean_name: ch.korean_name,
            aliases: ch.aliases,
            role: ch.role,
            occupation: ch.occupation,
            abilities: ch.abilities,
            speech_style: ch.speech_style,
          }))
        : [],
      relationships: Array.isArray(a.relationships) ? a.relationships : [],
      terms: Array.isArray(a.terms)
        ? a.terms.map((t: any) => ({
            original: t.original,
            translation: t.translation,
            category: t.category,
            aliases: t.aliases,
          }))
        : [],
      locations: Array.isArray(a.locations)
        ? a.locations.map((l: any) => ({
            name: l.name,
            korean_name: l.korean_name,
            aliases: l.aliases,
            type: l.type,
          }))
        : [],
      key_events: Array.isArray(a.key_events) ? a.key_events : [],
    }));

    return {
      chunkIndex: c.chunkIndex,
      extractedAt: c.extractedAt,
      model: c.model || 'unknown',
      parseError: c.parseError,
      raw: {
        arcs: slimArcs,
        honorifics: raw?.honorifics,
        recurring_phrases: raw?.recurring_phrases,
        style_guide: raw?.style_guide,
      },
    };
  });

  try {
    return await consolidateFromRawChunks(lite);
  } catch (e2) {
    console.warn('⚠️ Raw consolidation attempt 2 failed; falling back to minimal outputs...', e2);
  }

  // Attempt 3: minimal deterministic result (no LLM reliance)
  const globals = fallbackAggregateGlobalsFromRaw(input);
  return {
    arcs: [],
    honorifics: globals.honorifics,
    recurring_phrases: globals.recurring_phrases,
    style_guide: globals.style_guide,
  };
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

    const { arcs, rawChunk } = await extractFromChunk(chunk, chunkIndex);
    console.log(`📦 Received from extractFromChunk: ${arcs?.length || 0} arcs`);

    // Persist raw chunk extraction for LLM-driven consolidation later
    if (rawChunk) {
      set((state) => ({
        raw_chunks: upsertRawChunk(state.raw_chunks, rawChunk),
      }));
    }

    // NOTE: Do NOT aggressively merge arcs/honorifics/phrases/style guide during chunk processing.
    // These are often inconsistent per chunk and should be consolidated from raw_chunks by the LLM.
    // We still keep provisional arcs for progressive UI feedback, but we avoid name-based merging.
    if (arcs && arcs.length > 0) {
      arcs.forEach((newArc) => {
        get().addArc(newArc);
      });
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
      console.log('🔄 Starting consolidation (LLM-driven, from raw chunks)...');

      let consolidatedArcs: GlossaryArc[] = [];
      let consolidatedHonorifics: Record<string, string> = {};
      let consolidatedPhrases: Record<string, string> = {};
      let consolidatedStyleGuide: Partial<StyleGuide> = {};

      const canUseLLM = !!geminiAPI;

      if (canUseLLM && state.raw_chunks && state.raw_chunks.length >= 2) {
        console.log(`📦 Using raw_chunks for consolidation: ${state.raw_chunks.length} chunks`);
        const consolidated = await consolidateFromRawChunksWithRetries(state.raw_chunks);
        consolidatedArcs = consolidated.arcs || [];
        consolidatedHonorifics = consolidated.honorifics || {};
        consolidatedPhrases = consolidated.recurring_phrases || {};
        consolidatedStyleGuide = consolidated.style_guide || {};
      } else {
        // Fallback if LLM not available or raw data missing (backward compatibility)
        if (!canUseLLM) {
          console.warn('⚠️ Gemini not initialized; using deterministic fallback from raw_chunks/state');
        } else {
          console.warn('⚠️ raw_chunks missing/too small; using deterministic fallback + (optional) arc-only consolidation');
        }
        const globals = fallbackAggregateGlobalsFromRaw(state.raw_chunks || []);
        consolidatedHonorifics = globals.honorifics;
        consolidatedPhrases = globals.recurring_phrases;
        consolidatedStyleGuide = globals.style_guide;
        // Keep arcs as-is (minimum viable output); avoid extra LLM calls.
        consolidatedArcs = state.arcs.length > 0 ? state.arcs : [];
      }

      // If LLM consolidation failed to return arcs, keep a minimum viable arc list.
      if (!consolidatedArcs || consolidatedArcs.length === 0) {
        consolidatedArcs = state.arcs.length > 0 ? state.arcs : [];
      }

      // Last-resort attempt: if we do have LLM access but raw-based consolidation couldn't produce arcs,
      // try the legacy arc-only consolidation (it might salvage usable arc structure).
      if (canUseLLM && consolidatedArcs.length === 0 && state.arcs.length > 3) {
        try {
          console.warn('⚠️ Attempting legacy arc-only consolidation as last resort...');
          consolidatedArcs = await consolidateArcs(state.arcs);
        } catch (legacyErr) {
          console.warn('⚠️ Legacy arc-only consolidation failed; keeping minimum viable arcs.', legacyErr);
          consolidatedArcs = state.arcs.length > 0 ? state.arcs : [];
        }
      }

      console.log(`✅ Consolidation done: ${state.arcs.length} → ${consolidatedArcs.length} arcs`);

      // Count totals from within arcs
      const totalCharacters = consolidatedArcs.reduce((sum, arc) => sum + (arc.characters?.length || 0), 0);
      const totalEvents = consolidatedArcs.reduce((sum, arc) => sum + (arc.events?.length || 0), 0);
      const totalLocations = consolidatedArcs.reduce((sum, arc) => sum + (arc.locations?.length || 0), 0);
      const totalTerms = consolidatedArcs.reduce((sum, arc) => sum + (arc.terms?.length || 0), 0);

      console.log('✅ Arc-centric consolidation complete!');
      console.log(`📊 Final counts: ${consolidatedArcs.length} arcs, ${totalCharacters} characters, ${totalEvents} events, ${totalLocations} locations, ${totalTerms} terms`);

      set({
        arcs: consolidatedArcs,
        honorifics: Object.keys(consolidatedHonorifics).length > 0 ? consolidatedHonorifics : state.honorifics,
        recurring_phrases: Object.keys(consolidatedPhrases).length > 0 ? consolidatedPhrases : state.recurring_phrases,
        style_guide: Object.keys(consolidatedStyleGuide).length > 0 ? { ...state.style_guide, ...consolidatedStyleGuide } : state.style_guide,
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
      const involved = Array.isArray((event as any).characters_involved)
        ? (event as any).characters_involved.filter(Boolean)
        : [];
      if (involved.length === 0) return null;

      const sourceChar = involved[0];
      const targetChar = involved[1] || involved[0];

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
    }).filter((edge): edge is ActionEdge => {
      if (!edge) return false;
      const sourceExists = entityNodes.find(n => n.id === edge.source);
      const targetExists = entityNodes.find(n => n.id === edge.target);
      return !!sourceExists && !!targetExists;
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
    return JSON.stringify({
      arcs: state.arcs,
      story_summary: state.story_summary,
      honorifics: state.honorifics,
      recurring_phrases: state.recurring_phrases,
      style_guide: state.style_guide,
      target_language: state.target_language
    }, null, 2);
  },

  loadProject: async (projectId: string) => {
    set({ isLoading: true });
    try {
      console.log(`📂 Loading project ${projectId} from storage...`);
      const project = await browserStorage.getProject(projectId);

      if (!project) {
        console.error(`❌ Project ${projectId} not found`);
        set({ isLoading: false });
        return;
      }

      // Clear current state before loading new data to prevent bleeding
      set({
        ...initialState,
        isLoading: true, // Keep loading true
        fullText: project.file_content || ''
      });

      if (project.glossary) {
        const glossary = project.glossary as any; // Cast to any to access our custom fields

        // Handle both legacy structure and new structure
        const arcs = glossary.arcs || [];
        const story_summary = glossary.story_summary || { logline: '', blurb: '' };
        const honorifics = glossary.honorifics || {};
        const recurring_phrases = glossary.recurring_phrases || {};
        const style_guide = glossary.style_guide || initialState.style_guide;
        const target_language = glossary.target_language || 'en';
        const fullText = project.file_content || ''; // Use project file content as full text

        set({
          arcs,
          story_summary,
          honorifics,
          recurring_phrases,
          style_guide,
          target_language,
          fullText,
          isLoading: false
        });
        console.log(`✅ Project loaded successfully: ${arcs.length} arcs`);
      } else {
        // Initialize with empty state if no glossary data but project exists
        set({
          ...initialState,
          fullText: project.file_content || '',
          isLoading: false
        });
        console.log('⚠️ Project loaded but has no glossary data');
      }
    } catch (error) {
      console.error('❌ Failed to load project:', error);
      set({ isLoading: false });
    }
  },

  saveProject: async (projectId: string) => {
    try {
      console.log(`💾 Saving project ${projectId} to storage...`);
      const state = get();

      // Don't save if we are still loading
      if (state.isLoading) {
        console.warn('⚠️ Attempted to save while loading, skipping...');
        return;
      }

      const project = await browserStorage.getProject(projectId);

      if (!project) {
        console.error(`❌ Cannot save: Project ${projectId} not found`);
        return;
      }

      // Create glossary object matching our state
      const glossaryData: ExtendedGlossary = {
        english: "Glossary", // Required field stub
        arcs: state.arcs,
        story_summary: state.story_summary,
        honorifics: state.honorifics,
        recurring_phrases: state.recurring_phrases,
        style_guide: state.style_guide,
        target_language: state.target_language,
        // Also map to BasicGlossary fields for compatibility if needed
        characters: [], // We could populate this from arcs if we wanted backward compat
        terms: [],
        places: []
      };

      // Update project
      project.glossary = glossaryData;
      project.updated_at = new Date().toISOString();

      await browserStorage.saveProject(project);
      console.log('✅ Project saved successfully');
    } catch (error) {
      console.error('❌ Failed to save project:', error);
    }
  },

  updateCharacterGlobally: (updatedCharacter: GlossaryCharacter) => {
    set((state) => {
      const newArcs = state.arcs.map(arc => {
        // Check if this arc contains the character (by ID)
        const charIndex = arc.characters.findIndex(c => c.id === updatedCharacter.id);

        if (charIndex === -1) return arc; // Character not in this arc

        // Update the character in this arc
        const newCharacters = [...arc.characters];
        const existingChar = newCharacters[charIndex];

        // Merge shared attributes, preserve arc-specific ones (role, relationships)
        newCharacters[charIndex] = {
          ...existingChar,
          // Shared attributes to sync
          name: updatedCharacter.name,
          korean_name: updatedCharacter.korean_name,
          description: updatedCharacter.description,
          physical_appearance: updatedCharacter.physical_appearance,
          personality: updatedCharacter.personality,
          traits: updatedCharacter.traits,
          emoji: updatedCharacter.emoji,
          age: updatedCharacter.age,
          gender: updatedCharacter.gender,
          occupation: updatedCharacter.occupation,
          abilities: updatedCharacter.abilities,
          speech_style: updatedCharacter.speech_style,
          translation_notes: updatedCharacter.translation_notes,
          name_variants: updatedCharacter.name_variants,
          // Note: role is NOT synced as it can change per arc (e.g. minor -> major)
          // relationships are NOT synced as they are arc-specific
        };

        return {
          ...arc,
          characters: newCharacters
        };
      });

      return { arcs: newArcs };
    });
  },

  updateLocationGlobally: (updatedLocation: GlossaryLocation) => {
    set((state) => {
      const newArcs = state.arcs.map(arc => {
        const locIndex = arc.locations.findIndex(l => l.id === updatedLocation.id);

        if (locIndex === -1) return arc;

        const newLocations = [...arc.locations];
        newLocations[locIndex] = {
          ...newLocations[locIndex],
          // Sync all location fields as they are generally static
          name: updatedLocation.name,
          korean_name: updatedLocation.korean_name,
          description: updatedLocation.description,
          emoji: updatedLocation.emoji,
          type: updatedLocation.type,
        };

        return {
          ...arc,
          locations: newLocations
        };
      });

      return { arcs: newArcs };
    });
  },

  updateTermGlobally: (updatedTerm: GlossaryTerm) => {
    set((state) => {
      const newArcs = state.arcs.map(arc => {
        const termIndex = arc.terms.findIndex(t => t.id === updatedTerm.id);

        if (termIndex === -1) return arc;

        const newTerms = [...arc.terms];
        newTerms[termIndex] = {
          ...newTerms[termIndex],
          // Sync all term fields
          original: updatedTerm.original,
          translation: updatedTerm.translation,
          context: updatedTerm.context,
          category: updatedTerm.category,
        };

        return {
          ...arc,
          terms: newTerms
        };
      });

      return { arcs: newArcs };
    });
  },


}));

type LegacyCollection<T> = T[] | Record<string, T>;

export interface GlossarySnapshot {
  arcs: GlossaryArc[];
  story_summary: StorySummary;
  honorifics: { [key: string]: string };
  recurring_phrases: { [korean: string]: string };
  style_guide: StyleGuide;
  target_language: 'en' | 'ja';
  fullText: string;
  raw_chunks?: RawChunkExtraction[];
  characters?: GlossaryCharacter[];
  events?: GlossaryEvent[];
  locations?: GlossaryLocation[];
  terms?: GlossaryTerm[];
  key_events_and_arcs?: string[];
  world_building_notes?: string[];
}

function deepClone<T>(value: T): T {
  if (value === undefined || value === null) {
    return value;
  }
  return JSON.parse(JSON.stringify(value));
}

function normalizeLegacyCollection<T>(value?: LegacyCollection<T>): T[] | undefined {
  if (!value) return undefined;
  if (Array.isArray(value)) {
    return deepClone(value);
  }
  return Object.values(value).map(item => deepClone(item));
}

const deriveArcsFromLegacy = (snapshot?: Partial<GlossarySnapshot>): GlossaryArc[] => {
  if (snapshot?.arcs && snapshot.arcs.length > 0) {
    return deepClone(snapshot.arcs);
  }

  const legacyCharacters = normalizeLegacyCollection(snapshot?.characters) ?? [];
  const legacyEvents = normalizeLegacyCollection(snapshot?.events) ?? [];
  const legacyLocations = normalizeLegacyCollection(snapshot?.locations) ?? [];
  const legacyTerms = normalizeLegacyCollection(snapshot?.terms) ?? [];

  if (
    legacyCharacters.length === 0 &&
    legacyEvents.length === 0 &&
    legacyLocations.length === 0 &&
    legacyTerms.length === 0
  ) {
    return [];
  }

  return [{
    id: 'legacy-arc',
    name: 'Legacy Glossary',
    description: 'Imported from legacy format',
    theme: '',
    characters: legacyCharacters,
    events: legacyEvents,
    locations: legacyLocations,
    relationships: [],
    key_events: snapshot?.key_events_and_arcs ? [...snapshot.key_events_and_arcs] : [],
    background_changes: snapshot?.world_building_notes ? [...snapshot.world_building_notes] : [],
    terms: legacyTerms,
    start_chunk: 0,
    end_chunk: 0,
  }];
};

const aggregateLegacyFromArcs = (arcs: GlossaryArc[]) => {
  const characterMap = new Map<string, GlossaryCharacter>();
  const eventMap = new Map<string, GlossaryEvent>();
  const locationMap = new Map<string, GlossaryLocation>();
  const termMap = new Map<string, GlossaryTerm>();

  arcs.forEach(arc => {
    (arc.characters || []).forEach(char => {
      const key = (char.id || char.name || `character-${characterMap.size}`).toLowerCase();
      if (!characterMap.has(key)) {
        characterMap.set(key, deepClone(char));
      }
    });

    (arc.events || []).forEach(event => {
      const key = (event.id || event.name || `event-${eventMap.size}`).toLowerCase();
      if (!eventMap.has(key)) {
        eventMap.set(key, deepClone(event));
      }
    });

    (arc.locations || []).forEach(location => {
      const key = (location.id || location.name || `location-${locationMap.size}`).toLowerCase();
      if (!locationMap.has(key)) {
        locationMap.set(key, deepClone(location));
      }
    });

    (arc.terms || []).forEach(term => {
      const key = (term.id || term.original || `term-${termMap.size}`).toLowerCase();
      if (!termMap.has(key)) {
        termMap.set(key, deepClone(term));
      }
    });
  });

  return {
    characters: Array.from(characterMap.values()),
    events: Array.from(eventMap.values()),
    locations: Array.from(locationMap.values()),
    terms: Array.from(termMap.values()),
    keyEvents: arcs.flatMap(arc => arc.key_events || []),
    worldBuildingNotes: arcs.flatMap(arc => arc.background_changes || []),
  };
};

const mergeStyleGuide = (styleGuide?: StyleGuide): StyleGuide => {
  const base = deepClone(initialState.style_guide);
  if (!styleGuide) return base;
  const incoming = deepClone(styleGuide);
  return {
    ...base,
    ...incoming,
    narrative_style: {
      ...base.narrative_style,
      ...(incoming.narrative_style || {}),
    },
  };
};

const normalizeSnapshot = (
  snapshot?: Partial<GlossarySnapshot>,
  options?: { fullTextFallback?: string }
): GlossarySnapshot => {
  const arcs = deriveArcsFromLegacy(snapshot);
  const aggregated = aggregateLegacyFromArcs(arcs);

  const normalizedCharacters = normalizeLegacyCollection(snapshot?.characters) ?? aggregated.characters;
  const normalizedEvents = normalizeLegacyCollection(snapshot?.events) ?? aggregated.events;
  const normalizedLocations = normalizeLegacyCollection(snapshot?.locations) ?? aggregated.locations;
  const normalizedTerms = normalizeLegacyCollection(snapshot?.terms) ?? aggregated.terms;

  return {
    arcs,
    story_summary: snapshot?.story_summary ? deepClone(snapshot.story_summary) : { logline: '', blurb: '' },
    honorifics: snapshot?.honorifics ? deepClone(snapshot.honorifics) : {},
    recurring_phrases: snapshot?.recurring_phrases ? deepClone(snapshot.recurring_phrases) : {},
    style_guide: mergeStyleGuide(snapshot?.style_guide),
    target_language: snapshot?.target_language ?? 'en',
    fullText: snapshot?.fullText ?? options?.fullTextFallback ?? '',
    raw_chunks: snapshot?.raw_chunks ? deepClone(snapshot.raw_chunks) : [],
    characters: normalizedCharacters,
    events: normalizedEvents,
    locations: normalizedLocations,
    terms: normalizedTerms,
    key_events_and_arcs: snapshot?.key_events_and_arcs
      ? [...snapshot.key_events_and_arcs]
      : aggregated.keyEvents,
    world_building_notes: snapshot?.world_building_notes
      ? [...snapshot.world_building_notes]
      : aggregated.worldBuildingNotes,
  };
};

export const serializeGlossaryState = (state?: GlossaryState): GlossarySnapshot => {
  const source = state ?? useGlossaryStore.getState();
  const arcs = deepClone(source.arcs);
  const aggregated = aggregateLegacyFromArcs(arcs);

  return {
    arcs,
    story_summary: deepClone(source.story_summary),
    honorifics: deepClone(source.honorifics),
    recurring_phrases: deepClone(source.recurring_phrases),
    style_guide: deepClone(source.style_guide),
    target_language: source.target_language,
    fullText: source.fullText,
    raw_chunks: deepClone(source.raw_chunks),
    characters: aggregated.characters,
    events: aggregated.events,
    locations: aggregated.locations,
    terms: aggregated.terms,
    key_events_and_arcs: aggregated.keyEvents,
    world_building_notes: aggregated.worldBuildingNotes,
  };
};

export const restoreGlossarySnapshot = (
  snapshot?: Partial<GlossarySnapshot>,
  options?: { fullTextFallback?: string }
): GlossarySnapshot => {
  const normalized = normalizeSnapshot(snapshot, options);
  useGlossaryStore.setState({
    arcs: normalized.arcs,
    story_summary: normalized.story_summary,
    honorifics: normalized.honorifics,
    recurring_phrases: normalized.recurring_phrases,
    style_guide: normalized.style_guide,
    target_language: normalized.target_language,
    fullText: normalized.fullText,
    raw_chunks: normalized.raw_chunks || [],
    isLoading: false,
  });

  return normalized;
};

export function generateGlossaryString(state: GlossaryState): string {
  const { arcs, style_guide, honorifics, recurring_phrases } = state;
  const lines: string[] = [];

  // 1. Characters (Consolidated view)
  lines.push("## Characters");
  const allCharacters = new Map<string, GlossaryCharacter>();
  arcs.forEach(arc => {
    arc.characters.forEach(char => {
      if (!allCharacters.has(char.name)) {
        allCharacters.set(char.name, char);
      }
    });
  });

  allCharacters.forEach(char => {
    // Format: Name (Korean) - Age - Appearance - Personality - Speech - Notes
    const parts = [
      `${char.korean_name || ''} (${char.name})`,
      char.age,
      char.physical_appearance ? `Appearance: ${char.physical_appearance}` : '',
      char.personality ? `Personality: ${char.personality}` : '',
      char.speech_style ? `Speech: ${char.speech_style}` : '',
      char.translation_notes ? `Notes: ${char.translation_notes}` : ''
    ].filter(Boolean);
    lines.push(`- ${parts.join(' - ')}`);
  });

  lines.push("\n## Arcs");
  arcs.forEach(arc => {
    lines.push(`### ${arc.name}`);
    lines.push(`Description: ${arc.description}`);
    if (arc.events.length > 0) {
      lines.push(`Events: ${arc.events.map(e => e.name).join(', ')}`);
    }
    if (arc.relationships.length > 0) {
      lines.push("Relationships:");
      arc.relationships.forEach(rel => {
        lines.push(`  - ${rel.character_a} -> ${rel.character_b} (${rel.relationship_type}): ${rel.description}`);
      });
    }
    lines.push("");
  });

  lines.push("## Terms & Settings (Translation Decisions)");
  const allTerms = new Map<string, string>();
  arcs.forEach(arc => {
    arc.terms.forEach(term => {
      const canonical = (term.preferred_translation || term.translation || '').trim();
      const alts = Array.isArray(term.alternatives) && term.alternatives.length > 0
        ? ` | alts: ${term.alternatives.slice(0, 4).join(', ')}`
        : '';
      const key = `${term.original} (${canonical})${alts}`;
      if (!allTerms.has(key)) {
        const notesParts: string[] = [];
        if (term.why_hard) notesParts.push(`why_hard: ${term.why_hard}`);
        if (term.decision_notes) notesParts.push(`decision: ${term.decision_notes}`);
        if (term.notes) notesParts.push(`notes: ${term.notes}`);
        const note = notesParts.length > 0 ? ` | ${notesParts.join(' | ')}` : '';
        allTerms.set(key, `${term.context || ''}${note}`.trim());
      }
    });
  });
  allTerms.forEach((context, key) => {
    lines.push(`- ${key}: ${context}`);
  });

  lines.push("\n## Style Guide");
  lines.push(`Tone: ${style_guide.tone}`);
  lines.push(`Genre: ${style_guide.genre}`);
  if (style_guide.narrative_style) {
    const ns = style_guide.narrative_style;
    lines.push(`Narrative Style: POV=${ns.point_of_view || 'N/A'}, Tense=${ns.tense || 'N/A'}`);
  }
  if (style_guide.translation_guidelines) {
    lines.push(`Translation Guidelines: ${style_guide.translation_guidelines}`);
  }

  lines.push("\n## Honorifics");
  Object.entries(honorifics).forEach(([key, value]) => {
    lines.push(`- ${key}: ${value}`);
  });

  lines.push("\n## Recurring Phrases");
  Object.entries(recurring_phrases).forEach(([key, value]) => {
    lines.push(`- ${key}: ${value}`);
  });

  lines.push("\n## Translation Notes (Global)");
  if (style_guide.translation_guidelines) {
    lines.push(style_guide.translation_guidelines);
  }
  // Collect character specific notes if not already obvious
  allCharacters.forEach(char => {
    if (char.translation_notes) {
      lines.push(`- ${char.name}: ${char.translation_notes}`);
    }
  });

  return lines.join('\n');
}
