import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { z } from 'zod';
import type { ReviewIssue } from '../types';
import { DEFAULT_REVIEW_PROMPT_EN } from '../prompts/defaultPrompts';

const ReviewIssueSchema = z.object({
  text: z.string().optional(),
  category: z.string(),
  subcategory: z.string().optional(),
  severity: z.enum(['high', 'medium', 'low']),
  message: z.string(),
  suggestion: z.string().optional(),
  start: z.number().optional(),
  end: z.number().optional(),
});

const ReviewResponseSchema = z.object({
  issues: z.array(ReviewIssueSchema).min(1),
});

function extractJsonObject(text: string): string | null {
  const match = text.match(/\{[\s\S]*\}/);
  return match ? match[0] : null;
}

export class ReviewAgent {
  constructor(
    private model: BaseChatModel,
    private customPrompt?: string
  ) {}

  async review(koreanText: string, englishText: string): Promise<ReviewIssue[]> {
    const template = (this.customPrompt || DEFAULT_REVIEW_PROMPT_EN);
    const prompt = template
      .replace('{{KOREAN}}', koreanText)
      .replace('{{ENGLISH}}', englishText);

    const response = await this.model.invoke(prompt);
    const content = String(response.content ?? '');

    const json = extractJsonObject(content);
    if (!json) {
      throw new Error('ReviewAgent: No JSON object found in model response');
    }

    const parsed = JSON.parse(json);
    const validated = ReviewResponseSchema.safeParse(parsed);
    if (!validated.success) {
      throw new Error(`ReviewAgent: Invalid JSON schema: ${validated.error.message}`);
    }

    return validated.data.issues as ReviewIssue[];
  }
}


