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
   * Goal: align Korean to the English paragraph layout.
   * Returns:
   * - englishParagraphs: EN paragraphs (split by \n\n, fallback to \n)
   * - koreanParagraphs: KR paragraphs aligned to EN paragraph count (same length)
   * - unmatchedKorean: KR segments that cannot be aligned to any EN paragraph (likely omissions)
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

    // Create prompt for alignment/splitting KR to EN layout (plus unmatched KR)
    const prompt = this.createMatchingPrompt(koreanText, englishParagraphs);

    try {
      console.log('Invoking paragraph matching model...');
      const response = await this.model.invoke(prompt);
      console.log('Model response received');
      const result = this.parseMatchingResult(
        response.content as string,
        koreanText,
        englishParagraphs
      );

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

TASK: Given the Korean SOURCE TEXT and the English translation paragraphs (already split by \\n\\n), your job is to:
1) Split/segment the Korean text so that it matches the ENGLISH paragraph layout (same number of paragraphs)
2) If some Korean content appears to be omitted in the English translation, put that Korean text into "unmatchedKorean"

IMPORTANT RULES:
- DO NOT translate. Return Korean text only in koreanParagraphs/unmatchedKorean.
- The "koreanParagraphs" array MUST have EXACTLY ${englishParagraphs.length} items (same count/order as EN).
- Every character of the Korean source must appear EITHER in koreanParagraphs OR unmatchedKorean. NO omissions.
- Preserve original order.
- For each index i: koreanParagraphs[i] should be the Korean slice corresponding to [EN-i]. It can be empty if truly no corresponding Korean.
- unmatchedKorean items are Korean slices that do not correspond to any EN paragraph (likely omitted). Keep them in-order.
- unmatchedKorean.beforeEnglishIndex is an integer from 0..${englishParagraphs.length} indicating where the unmatched text should be displayed:
  - 0: before EN-0
  - k: between EN-(k-1) and EN-k
  - ${englishParagraphs.length}: after EN-${englishParagraphs.length - 1}

ENGLISH PARAGRAPHS (${englishParagraphs.length} paragraphs):
${englishParagraphsText}

KOREAN SOURCE TEXT:
${koreanText}

OUTPUT FORMAT (JSON):
Return a JSON object:
{
  "koreanParagraphs": [ "...", "...", ... ], // length exactly ${englishParagraphs.length}
  "unmatchedKorean": [ { "beforeEnglishIndex": 0, "text": "..." } ] // optional
}

Return ONLY the JSON object, no other text.`;
  }

  private parseMatchingResult(
    content: string,
    koreanText: string,
    englishParagraphs: string[]
  ): ParagraphMatchResult {
    try {
      // Extract JSON from the response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      const parsed = JSON.parse(jsonMatch[0]);

      if (!parsed.koreanParagraphs || !Array.isArray(parsed.koreanParagraphs)) {
        throw new Error('Invalid response format: missing koreanParagraphs array');
      }

      let alignedKorean: string[] = parsed.koreanParagraphs.map((x: any) => String(x ?? ''));
      if (alignedKorean.length !== englishParagraphs.length) {
        console.warn(`ParagraphMatchingAgent: alignedKorean length mismatch EN=${englishParagraphs.length}, KRAligned=${alignedKorean.length}`);
        if (alignedKorean.length < englishParagraphs.length) {
          while (alignedKorean.length < englishParagraphs.length) alignedKorean.push('');
        } else {
          alignedKorean = alignedKorean.slice(0, englishParagraphs.length);
        }
      }

      const unmatchedRaw = Array.isArray(parsed.unmatchedKorean) ? parsed.unmatchedKorean : [];
      const unmatchedKorean: Array<{ beforeEnglishIndex: number; text: string }> = unmatchedRaw
        .map((u: any) => ({
          beforeEnglishIndex: typeof u?.beforeEnglishIndex === 'number' ? u.beforeEnglishIndex : englishParagraphs.length,
          text: String(u?.text ?? ''),
        }))
        .filter(u => u.text.trim().length > 0)
        .map(u => ({
          beforeEnglishIndex: Math.min(Math.max(u.beforeEnglishIndex, 0), englishParagraphs.length),
          text: u.text,
        }));

      // Safety: if the model omitted too much KR, fall back to showing everything as unmatched at the top.
      const normalize = (s: string) => s.replace(/\s+/g, '');
      const originalLen = normalize(koreanText).length;
      const reconstructedLen = normalize(alignedKorean.join('') + unmatchedKorean.map(u => u.text).join('')).length;
      if (originalLen > 0 && reconstructedLen < originalLen * 0.75) {
        console.warn('ParagraphMatchingAgent: reconstruction coverage too low, falling back to unmatchedKorean=full source');
        alignedKorean = new Array(englishParagraphs.length).fill('');
        unmatchedKorean.length = 0;
        unmatchedKorean.push({ beforeEnglishIndex: 0, text: koreanText });
      }

      const matches: ParagraphMatch[] = englishParagraphs.map((_, idx) => ({
        englishIndex: idx,
        koreanIndex: idx, // aligned 1:1 by row
      }));

      return {
        englishParagraphs,
        koreanParagraphs: alignedKorean,
        unmatchedKorean,
        matches,
      };
    } catch (error) {
      console.error('Error parsing matching result:', error);
      console.error('Content:', content);
      throw new Error(`Failed to parse matching result: ${error}`);
    }
  }
}

