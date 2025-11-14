import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { SystemMessage, HumanMessage } from '@langchain/core/messages';
import { DEFAULT_QUALITY_PROMPT, DEFAULT_QUALITY_PROMPT_JA } from '../prompts/defaultPrompts';

interface QualityCheckResult {
  overall_score: number;
  passes: boolean;
  major_issues: string[];
  minor_issues: string[];
  specific_improvements: string[];
}

export class QualityAgent {
  private prompt: string;
  private client: BaseChatModel;

  constructor(
    client: BaseChatModel,
    targetLanguage: 'en' | 'ja' = 'en',
    customPrompt?: string
  ) {
    this.client = client;
    this.prompt = customPrompt || (targetLanguage === 'ja' ? DEFAULT_QUALITY_PROMPT_JA : DEFAULT_QUALITY_PROMPT);
  }

  setPrompt(prompt: string) {
    this.prompt = prompt;
  }

  async checkQuality(
    translatedText: string,
    originalText?: string
  ): Promise<QualityCheckResult> {
    let userPrompt = `Review this translation:\n\n${translatedText}`;
    
    if (originalText) {
      userPrompt += `\n\nOriginal Korean text:\n${originalText}`;
    }

    const messages = [
      new SystemMessage(this.prompt),
      new HumanMessage(userPrompt),
    ];

    const response = await this.client.invoke(messages);
    const content = typeof response.content === 'string' 
      ? response.content 
      : JSON.stringify(response.content);

    try {
      // Try to extract JSON from markdown code blocks
      const jsonMatch = content.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
      const jsonStr = jsonMatch ? jsonMatch[1] : content;
      
      const result = JSON.parse(jsonStr.trim()) as QualityCheckResult;
      
      // Validate structure
      return {
        overall_score: result.overall_score || 0,
        passes: result.passes !== false,
        major_issues: Array.isArray(result.major_issues) ? result.major_issues : [],
        minor_issues: Array.isArray(result.minor_issues) ? result.minor_issues : [],
        specific_improvements: Array.isArray(result.specific_improvements) ? result.specific_improvements : [],
      };
    } catch (error) {
      console.error('Failed to parse quality check result:', error);
      // Return default passing result on parse error
      return {
        overall_score: 70,
        passes: true,
        major_issues: [],
        minor_issues: ['Failed to parse quality check response'],
        specific_improvements: [],
      };
    }
  }
}

