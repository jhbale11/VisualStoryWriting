import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import type { ParagraphMatch, ParagraphMatchResult } from '../types';

export class ParagraphMatchingAgent {
  private model: ChatGoogleGenerativeAI;

  constructor() {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

    if (!apiKey) {
      console.warn('VITE_GEMINI_API_KEY is not set - paragraph matching will not be available');
      throw new Error('VITE_GEMINI_API_KEY is not set');
    }

    this.model = new ChatGoogleGenerativeAI({
      modelName: 'gemini-2.5-pro',
      temperature: 0.1,
      apiKey: apiKey,
    });
  }

  /**
   * Match Korean paragraphs to English paragraphs
   * English text is the reference (split by \n\n)
   * Korean text needs to be split to match English paragraphs
   */
  async matchParagraphs(koreanText: string, englishText: string): Promise<ParagraphMatchResult> {
    // Split English text by double newlines
    let englishParagraphs = englishText.split(/\n\n+/).filter(p => p.trim().length > 0);

    // Fallback logic: If we have very few paragraphs (e.g. just 1) but the text is long,
    // it might be that the layout agent failed to use double newlines.
    // In that case, try splitting by single newlines.
    if (englishParagraphs.length <= 1 && englishText.length > 200) {
      const singleNewlineParagraphs = englishText.split(/\n+/).filter(p => p.trim().length > 0);

      // If single newline splitting yields significantly more paragraphs, use that
      if (singleNewlineParagraphs.length > englishParagraphs.length) {
        console.log('ParagraphMatchingAgent: Detected potential layout issue (single newlines). Using single newline fallback.');
        englishParagraphs = singleNewlineParagraphs;
      }
    }

    if (englishParagraphs.length === 0) {
      throw new Error('No paragraphs found in English text');
    }

    // Create prompt for matching
    const prompt = this.createMatchingPrompt(koreanText, englishParagraphs);

    try {
      console.log('Invoking paragraph matching model...');
      const response = await this.model.invoke(prompt);
      console.log('Model response received');
      const result = this.parseMatchingResult(response.content as string, englishParagraphs);

      return result;
    } catch (error) {
      console.error('Error matching paragraphs:', error);
      if (error instanceof Error) {
        console.error('Error details:', error.message, error.stack);
      }
      throw error;
    }
  }

  private createMatchingPrompt(koreanText: string, englishParagraphs: string[]): string {
    const englishParagraphsText = englishParagraphs
      .map((para, idx) => `[EN-${idx}]\n${para}`)
      .join('\n\n---\n\n');

    return `You are a precise paragraph alignment expert for Korean-to-English translations.

TASK: Given the Korean source text and English translation paragraphs (already split by \\n\\n), your job is to:
1. Split the Korean text into the SAME NUMBER of paragraphs as the English text
2. Each Korean paragraph should correspond to exactly one English paragraph
3. Return the Korean paragraphs in order, maintaining the 1:1 correspondence

IMPORTANT RULES:
- The number of Korean paragraphs MUST equal the number of English paragraphs (${englishParagraphs.length})
- Preserve the sequential order - KR paragraph [i] matches EN paragraph [i]
- Split Korean text at appropriate sentence boundaries to match the content flow
- If Korean text naturally has different breaks, adjust to match English structure
- Do NOT translate or modify text - only split into paragraphs

ENGLISH PARAGRAPHS (${englishParagraphs.length} paragraphs):
${englishParagraphsText}

KOREAN SOURCE TEXT:
${koreanText}

OUTPUT FORMAT (JSON):
Return a JSON object with exactly ${englishParagraphs.length} Korean paragraphs in the "paragraphs" array:
{
  "paragraphs": [
    "Korean paragraph 0 text here",
    "Korean paragraph 1 text here",
    ...
  ]
}

The order matters: paragraphs[0] corresponds to [EN-0], paragraphs[1] to [EN-1], etc.

Return ONLY the JSON object, no other text.`;
  }

  private parseMatchingResult(
    content: string,
    englishParagraphs: string[]
  ): ParagraphMatchResult {
    try {
      // Extract JSON from the response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      const parsed = JSON.parse(jsonMatch[0]);

      if (!parsed.paragraphs || !Array.isArray(parsed.paragraphs)) {
        throw new Error('Invalid response format: missing paragraphs array');
      }

      const koreanParagraphs: string[] = parsed.paragraphs;

      // Validate that we have the same number of paragraphs
      if (koreanParagraphs.length !== englishParagraphs.length) {
        console.warn(
          `Paragraph count mismatch: English=${englishParagraphs.length}, Korean=${koreanParagraphs.length}`
        );

        // Try to adjust if close
        if (koreanParagraphs.length < englishParagraphs.length) {
          // Pad with empty paragraphs
          while (koreanParagraphs.length < englishParagraphs.length) {
            koreanParagraphs.push('');
          }
        } else {
          // Truncate extra paragraphs
          koreanParagraphs.splice(englishParagraphs.length);
        }
      }

      // Create 1:1 matches (index to index)
      const matches: ParagraphMatch[] = englishParagraphs.map((_, idx) => ({
        englishIndex: idx,
        koreanIndex: idx,
      }));

      return {
        englishParagraphs,
        koreanParagraphs,
        matches,
      };
    } catch (error) {
      console.error('Error parsing matching result:', error);
      console.error('Content:', content);
      throw new Error(`Failed to parse matching result: ${error}`);
    }
  }
}

