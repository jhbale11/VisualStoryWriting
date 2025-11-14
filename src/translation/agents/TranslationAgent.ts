import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { SystemMessage, HumanMessage } from '@langchain/core/messages';
import type { Glossary, ChunkMetadata } from '../types';
import { DEFAULT_TRANSLATION_PROMPT_EN, DEFAULT_TRANSLATION_PROMPT_JA } from '../prompts/defaultPrompts';

export class TranslationAgent {
  private prompt: string;
  private client: BaseChatModel;
  private glossary?: Glossary;

  constructor(
    client: BaseChatModel,
    glossary?: Glossary,
    targetLanguage: 'en' | 'ja' = 'en',
    customPrompt?: string
  ) {
    this.client = client;
    this.glossary = glossary;
    this.prompt = customPrompt || (targetLanguage === 'ja' ? DEFAULT_TRANSLATION_PROMPT_JA : DEFAULT_TRANSLATION_PROMPT_EN);
  }

  setPrompt(prompt: string) {
    this.prompt = prompt;
  }

  async translate(
    text: string,
    metadata?: ChunkMetadata,
    previousContext?: string
  ): Promise<string> {
    const glossaryStr = this.glossary ? this.formatGlossary(this.glossary) : '';
    const contextStr = previousContext ? `\n\nPrevious context for continuity:\n${previousContext}` : '';
    const customInstructionStr = metadata?.custom_instruction 
      ? `\n\nCustom instruction: ${metadata.custom_instruction}` 
      : '';

    const systemPrompt = this.prompt + (glossaryStr ? `\n\nGlossary:\n${glossaryStr}` : '');
    
    const userPrompt = `Translate the following Korean text:${contextStr}${customInstructionStr}

${text}`;

    const messages = [
      new SystemMessage(systemPrompt),
      new HumanMessage(userPrompt),
    ];

    const response = await this.client.invoke(messages);
    const content = typeof response.content === 'string' 
      ? response.content 
      : JSON.stringify(response.content);

    return content.trim();
  }

  private formatGlossary(glossary: Glossary): string {
    const lines: string[] = [];
    const glossaryAny = glossary as any;

    // Helper to convert to array
    const toArray = (items: any) => {
      if (!items) return [];
      return Array.isArray(items) 
        ? items 
        : Object.entries(items).map(([key, value]) => 
            typeof value === 'object' && value !== null 
              ? { key, ...value } 
              : { key, value }
          );
    };

    // Characters
    const characters = toArray(glossaryAny.characters);
    if (characters.length > 0) {
      lines.push('Characters:');
      for (const char of characters) {
        const korean = char.korean_name || char.name || char.key;
        const english = char.english_name || char.english || char.name;
        const details: string[] = [`${korean} → ${english}`];
        
        if (char.age) details.push(`Age: ${char.age}`);
        if (char.gender) details.push(`Gender: ${char.gender}`);
        if (char.personality) details.push(`Personality: ${char.personality}`);
        if (char.tone || char.speech_style) details.push(`Tone: ${char.tone || char.speech_style}`);
        if (char.honorifics) details.push(`Honorifics: ${char.honorifics}`);
        if (char.description) details.push(`Description: ${char.description.substring(0, 100)}...`);
        
        lines.push(`  - ${details.join(', ')}`);
      }
    }

    // Terms
    const terms = toArray(glossaryAny.terms);
    if (terms.length > 0) {
      lines.push('\nTerms:');
      for (const term of terms) {
        const korean = term.original || term.korean_name || term.key;
        const english = term.translation || term.english;
        lines.push(`  - ${korean} → ${english}`);
        if (term.description || term.context) {
          lines.push(`    ${term.description || term.context}`);
        }
      }
    }

    // Places/Locations
    const places = toArray(glossaryAny.places || glossaryAny.locations);
    if (places.length > 0) {
      lines.push('\nPlaces:');
      for (const place of places) {
        const korean = place.korean_name || place.name || place.key;
        const english = place.english_name || place.english || place.name;
        lines.push(`  - ${korean} → ${english}`);
        if (place.description) {
          lines.push(`    ${place.description}`);
        }
      }
    }

    // Events (if available)
    if (glossaryAny.events && Array.isArray(glossaryAny.events) && glossaryAny.events.length > 0) {
      lines.push('\nKey Events:');
      for (const event of glossaryAny.events.slice(0, 5)) { // Limit to 5 most important
        if (event.name) {
          lines.push(`  - ${event.name}`);
        }
      }
    }

    // Style Guide (if available)
    if (glossaryAny.style_guide) {
      lines.push('\nStyle Guide:');
      if (glossaryAny.style_guide.genre) {
        lines.push(`  Genre: ${glossaryAny.style_guide.genre}`);
      }
      if (glossaryAny.style_guide.tone) {
        lines.push(`  Tone: ${glossaryAny.style_guide.tone}`);
      }
      if (glossaryAny.style_guide.content_rating) {
        lines.push(`  Content Rating: ${glossaryAny.style_guide.content_rating}`);
      }
    }

    // Honorifics (if available)
    if (glossaryAny.honorifics && typeof glossaryAny.honorifics === 'object') {
      lines.push('\nHonorifics:');
      const honorificEntries = Object.entries(glossaryAny.honorifics).slice(0, 10);
      for (const [key, value] of honorificEntries) {
        lines.push(`  - ${key}: ${value}`);
      }
    }

    return lines.join('\n');
  }
}

