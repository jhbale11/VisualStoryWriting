import { z } from 'zod';

// ============== LLM Configuration ==============
export const LLMConfigSchema = z.object({
  provider: z.enum(['openai', 'anthropic', 'gemini']),
  model: z.string(),
  temperature: z.number().min(0).max(2).default(0.3),
  apiKey: z.string().optional(),
});

export type LLMConfig = z.infer<typeof LLMConfigSchema>;

// ============== Agent Configurations ==============
export interface AgentConfigs {
  glossary?: LLMConfig;
  translation?: LLMConfig;
  tagging?: LLMConfig;
  enhancement?: LLMConfig;
  quality?: LLMConfig;
  proofreader?: LLMConfig;
  layout?: LLMConfig;
  review?: LLMConfig;
  publish?: LLMConfig;
}

// ============== Glossary ==============
export interface CharacterInfo {
  english: string;
  name?: string;
  age?: number | string;
  gender?: string;
  personality?: string;
  tone?: string;
  honorifics?: string;
  description?: string;
  // Support for complex glossary structure
  [key: string]: any;
}

export interface TermInfo {
  english: string;
  description?: string;
  // Support for complex glossary structure
  [key: string]: any;
}

export interface PlaceInfo {
  english: string;
  description?: string;
  // Support for complex glossary structure
  [key: string]: any;
}

// Basic glossary structure (backward compatible)
export interface BasicGlossary {
  characters?: Record<string, CharacterInfo> | CharacterInfo[];
  terms?: Record<string, TermInfo> | TermInfo[];
  places?: Record<string, PlaceInfo> | PlaceInfo[];
  locations?: Record<string, PlaceInfo> | PlaceInfo[]; // Alternative name for places
}

// Extended glossary structure (for advanced use)
export interface ExtendedGlossary extends BasicGlossary {
  target_language?: string;
  events?: any[];
  story_summary?: any;
  key_events_and_arcs?: string[];
  honorifics?: Record<string, string>;
  recurring_phrases?: Record<string, string>;
  world_building_notes?: string[];
  style_guide?: any;
  [key: string]: any; // Allow any additional fields
}

// Union type to support both structures
export type Glossary = BasicGlossary | ExtendedGlossary | string;

// ============== Paragraph Matching ==============
export interface ParagraphMatch {
  englishIndex: number;
  koreanIndex: number;
}

export interface ParagraphMatchResult {
  englishParagraphs: string[];
  // Korean paragraphs aligned to the EN paragraph layout (same length as englishParagraphs)
  koreanParagraphs: string[];
  // Korean segments that could not be aligned to any EN paragraph (likely omitted in translation).
  // beforeEnglishIndex=0 means before EN-0, beforeEnglishIndex=N means after the last EN paragraph.
  unmatchedKorean?: Array<{ beforeEnglishIndex: number; text: string }>;
  matches: ParagraphMatch[];
}

// ============== Review (QA) ==============
export type ReviewSeverity = 'high' | 'medium' | 'low';

export interface ReviewIssue {
  start?: number;
  end?: number;
  text?: string;
  category: string;
  subcategory?: string;
  severity: ReviewSeverity;
  message: string;
  suggestion?: string;
}

// ============== Chunk ==============
export interface ChunkMetadata {
  chunk_index: number;
  total_chunks: number;
  custom_instruction?: string;
  startIndex?: number;
  endIndex?: number;
  [key: string]: any;
}

export interface TranslationResult {
  tagged?: string;
  translated?: string;
  enhanced?: string;
  proofread?: string;
  final?: string;
  qualityScore?: number;
  paragraphMatches?: ParagraphMatchResult;
  reviewIssues?: ReviewIssue[];
}

export interface Chunk {
  id: string;
  text: string;
  index: number;
  metadata: ChunkMetadata;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  translations: TranslationResult;
  error?: string;
  draft_final?: string;
}

// ============== Project ==============
export type ProjectStatus =
  | 'setup'
  | 'glossary_running'
  | 'glossary_completed'
  | 'translating'
  | 'translation_completed'
  | 'reviewing'
  | 'review_completed'
  | 'review_open';

export interface TranslationProject {
  id: string;
  name: string;
  status: ProjectStatus;
  type: 'translation' | 'glossary' | 'publish';
  created_at: string;
  updated_at: string;

  // Source content
  file_content: string;

  // Glossary
  glossary?: Glossary;

  // Chunks
  chunks: Chunk[];
  chunk_size: number;
  overlap: number;

  // Progress
  translation_progress: number;

  // Configuration
  max_retries: number;
  enable_proofreader: boolean;
  language: 'en' | 'ja';
  agent_configs: AgentConfigs;

  // Custom prompts
  prompts?: {
    translation?: string;
    enhancement?: string;
    quality?: string;
    proofreader?: string;
    layout?: string;
    review?: string;
    publish?: string;
  };
}

// ============== Task Management ==============
export type TaskType =
  | 'glossary'
  | 'glossary_extraction'
  | 'glossary_reconsolidation'
  | 'translation'
  | 'retranslate'
  | 'review'
  | 'review_chunk'
  | 'match_paragraphs'
  | 'publish'
  | 'publish_chunk';

export type TaskStatus =
  | 'pending'
  | 'running'
  | 'completed'
  | 'failed'
  | 'cancelled';

export interface Task {
  id: string;
  type: TaskType;
  status: TaskStatus;
  progress: number;
  message?: string;
  projectId: string;
  chunkId?: string;
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
  error?: string;
}

// ============== Translation State (for LangGraph) ==============
export interface TranslationState {
  // Input
  sourceText: string;
  previousContext?: string;
  glossary?: Glossary;
  chunkMetadata: ChunkMetadata;
  customPrompts?: Record<string, string>;

  // Intermediate results
  tagged?: string;
  translated?: string;
  enhanced?: string;
  qualityScore?: number;
  qualityIssues?: string[];
  proofread?: string;
  final?: string;
  paragraphMatches?: ParagraphMatchResult;
  reviewIssues?: ReviewIssue[];

  // Control
  retryCount: number;
  maxRetries: number;
  enableProofreader: boolean;
  needsReenhancement?: boolean;

  // Error handling
  error?: string;

  // Progress tracking
  currentStage?: string;
  llmCalls?: number;
}

// ============== UI State ==============
export interface UIState {
  selectedProjectId?: string;
  selectedChunkId?: string;
  view: 'main' | 'glossary' | 'translation' | 'review';
}
