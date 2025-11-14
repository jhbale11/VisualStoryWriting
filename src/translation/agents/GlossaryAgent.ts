import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { SystemMessage, HumanMessage } from '@langchain/core/messages';
import type { Glossary } from '../types';

const GLOSSARY_PROMPT = `You are an expert in analyzing Korean novels and creating comprehensive glossaries for translation.

Analyze the provided Korean text and extract:
1. Characters (characters) - Korean name as key, with english, age, gender, personality, tone, honorifics
2. Terms (terms) - Important terminology, items, abilities, ranks
3. Places (places) - Locations mentioned in the text

Return ONLY a valid JSON object with this structure:
{
  "characters": {
    "김민수": {
      "english": "Kim Minsu",
      "age": 25,
      "gender": "male",
      "personality": "brave and determined",
      "tone": "casual but respectful",
      "honorifics": "hyung to older males"
    }
  },
  "terms": {
    "마물": {
      "english": "demonic beast",
      "description": "corrupted creatures"
    }
  },
  "places": {
    "서울": {
      "english": "Seoul",
      "description": "Capital city"
    }
  }
}

Be thorough and extract all relevant information.`;

export class GlossaryAgent {
  constructor(
    private client: BaseChatModel,
    private targetLanguage: 'en' | 'ja' = 'en'
  ) {}

  async analyzeText(text: string): Promise<Glossary> {
    const messages = [
      new SystemMessage(GLOSSARY_PROMPT),
      new HumanMessage(`Analyze this Korean text and extract glossary information:\n\n${text}`),
    ];

    const response = await this.client.invoke(messages);
    const content = typeof response.content === 'string' 
      ? response.content 
      : JSON.stringify(response.content);

    try {
      // Try to extract JSON from markdown code blocks
      const jsonMatch = content.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
      const jsonStr = jsonMatch ? jsonMatch[1] : content;
      
      const glossary = JSON.parse(jsonStr.trim()) as Glossary;
      
      // Normalize structure
      return this.normalizeGlossary(glossary);
    } catch (error) {
      console.error('Failed to parse glossary:', error);
      // Return empty glossary on error
      return {
        characters: {},
        terms: {},
        places: {},
      };
    }
  }

  private normalizeGlossary(glossary: any): Glossary {
    const normalized: Glossary = {
      characters: {},
      terms: {},
      places: {},
    };

    // Normalize characters
    if (glossary.characters && typeof glossary.characters === 'object') {
      for (const [key, value] of Object.entries(glossary.characters)) {
        if (value && typeof value === 'object') {
          const char = value as any;
          normalized.characters[key] = {
            english: char.english || char.name || key,
            name: char.name,
            age: char.age,
            gender: char.gender,
            personality: char.personality,
            tone: char.tone,
            honorifics: char.honorifics,
          };
        }
      }
    }

    // Normalize terms
    if (glossary.terms && typeof glossary.terms === 'object') {
      for (const [key, value] of Object.entries(glossary.terms)) {
        if (value && typeof value === 'object') {
          const term = value as any;
          normalized.terms[key] = {
            english: term.english || key,
            description: term.description,
          };
        }
      }
    }

    // Normalize places
    if (glossary.places && typeof glossary.places === 'object') {
      for (const [key, value] of Object.entries(glossary.places)) {
        if (value && typeof value === 'object') {
          const place = value as any;
          normalized.places[key] = {
            english: place.english || key,
            description: place.description,
          };
        }
      }
    }

    return normalized;
  }
}



