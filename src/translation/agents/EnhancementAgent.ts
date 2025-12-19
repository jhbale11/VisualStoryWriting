import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { SystemMessage, HumanMessage } from '@langchain/core/messages';
import type { Glossary } from '../types';
import { DEFAULT_ENHANCEMENT_PROMPT, DEFAULT_ENHANCEMENT_PROMPT_JA } from '../prompts/defaultPrompts';

export class EnhancementAgent {
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
    this.prompt = customPrompt || (targetLanguage === 'ja' ? DEFAULT_ENHANCEMENT_PROMPT_JA : DEFAULT_ENHANCEMENT_PROMPT);
  }

  setPrompt(prompt: string) {
    this.prompt = prompt;
  }

  async enhance(
    translatedText: string,
    originalText?: string,
    feedback?: string[] | string
  ): Promise<string> {
    const glossaryStr = this.glossary ? this.formatGlossary(this.glossary) : '';
    const systemPrompt = this.prompt + (glossaryStr ? `\n\nGlossary:\n${glossaryStr}` : '');
    
    let userPrompt = `Enhance the following translated text:\n\n${translatedText}`;
    
    if (originalText) {
      userPrompt += `\n\nOriginal Korean text for reference:\n${originalText}`;
    }

    if (feedback && (Array.isArray(feedback) ? feedback.length > 0 : String(feedback).trim().length > 0)) {
      const feedbackStr = Array.isArray(feedback) ? feedback.map((f) => `- ${f}`).join('\n') : String(feedback);
      userPrompt += `\n\nQuality feedback to address (fix these issues explicitly):\n${feedbackStr}`;
    }

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
      return Array.isArray(items) ? items : Object.entries(items).map(([key, value]) => ({ key, ...value }));
    };

    // Characters
    const characters = toArray(glossaryAny.characters);
    if (characters.length > 0) {
      lines.push('Characters:');
      for (const char of characters) {
        const korean = char.korean_name || char.name || char.key;
        const english = char.english_name || char.english || char.name;
        lines.push(`  - ${korean} → ${english}`);
        if (char.personality) lines.push(`    Personality: ${char.personality}`);
        if (char.tone || char.speech_style) lines.push(`    Speech: ${char.tone || char.speech_style}`);
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
    }

    return lines.join('\n');
  }
}

