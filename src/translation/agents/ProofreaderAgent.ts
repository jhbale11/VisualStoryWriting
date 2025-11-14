import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { SystemMessage, HumanMessage } from '@langchain/core/messages';
import { DEFAULT_PROOFREADER_PROMPT, DEFAULT_PROOFREADER_PROMPT_JA } from '../prompts/defaultPrompts';

export class ProofreaderAgent {
  private prompt: string;
  private client: BaseChatModel;

  constructor(
    client: BaseChatModel,
    targetLanguage: 'en' | 'ja' = 'en',
    customPrompt?: string
  ) {
    this.client = client;
    this.prompt = customPrompt || (targetLanguage === 'ja' ? DEFAULT_PROOFREADER_PROMPT_JA : DEFAULT_PROOFREADER_PROMPT);
  }

  setPrompt(prompt: string) {
    this.prompt = prompt;
  }

  async proofread(translatedText: string, originalText?: string): Promise<string> {
    let userPrompt = `Proofread the following text:\n\n${translatedText}`;
    
    if (originalText) {
      userPrompt += `\n\nOriginal Korean text for reference:\n${originalText}`;
    }

    const messages = [
      new SystemMessage(this.prompt),
      new HumanMessage(userPrompt),
    ];

    const response = await this.client.invoke(messages);
    const content = typeof response.content === 'string' 
      ? response.content 
      : JSON.stringify(response.content);

    return content.trim();
  }
}

