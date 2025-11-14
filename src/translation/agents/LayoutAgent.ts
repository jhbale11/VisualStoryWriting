import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { SystemMessage, HumanMessage } from '@langchain/core/messages';
import { DEFAULT_LAYOUT_PROMPT, DEFAULT_LAYOUT_PROMPT_JA } from '../prompts/defaultPrompts';

export class LayoutAgent {
  private prompt: string;
  private client: BaseChatModel;

  constructor(
    client: BaseChatModel,
    targetLanguage: 'en' | 'ja' = 'en',
    customPrompt?: string
  ) {
    this.client = client;
    this.prompt = customPrompt || (targetLanguage === 'ja' ? DEFAULT_LAYOUT_PROMPT_JA : DEFAULT_LAYOUT_PROMPT);
  }

  setPrompt(prompt: string) {
    this.prompt = prompt;
  }

  async format(text: string): Promise<string> {
    const messages = [
      new SystemMessage(this.prompt),
      new HumanMessage(`Format the following text:\n\n${text}`),
    ];

    const response = await this.client.invoke(messages);
    const content = typeof response.content === 'string' 
      ? response.content 
      : JSON.stringify(response.content);

    return content.trim();
  }
}

