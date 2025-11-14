import { ChatOpenAI } from '@langchain/openai';
import { ChatAnthropic } from '@langchain/anthropic';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import type { LLMConfig } from '../types';

export class LLMClientFactory {
  private static getApiKey(provider: string, configKey?: string): string {
    if (configKey) return configKey;
    
    const envKey = `VITE_${provider.toUpperCase()}_API_KEY`;
    const key = import.meta.env[envKey];
    
    if (!key) {
      throw new Error(
        `API key not found for ${provider}. Please set ${envKey} in your .env file`
      );
    }
    
    return key;
  }

  static createClient(config: LLMConfig): BaseChatModel {
    const apiKey = this.getApiKey(config.provider, config.apiKey);

    switch (config.provider) {
      case 'openai':
        return new ChatOpenAI({
          modelName: config.model,
          temperature: config.temperature,
          openAIApiKey: apiKey,
        });

      case 'anthropic':
        return new ChatAnthropic({
          modelName: config.model,
          temperature: config.temperature,
          anthropicApiKey: apiKey,
        });

      case 'gemini':
        return new ChatGoogleGenerativeAI({
          modelName: config.model,
          temperature: config.temperature,
          apiKey: apiKey,
        });

      default:
        throw new Error(`Unsupported provider: ${config.provider}`);
    }
  }

  static createClients(configs: Record<string, LLMConfig>): Record<string, BaseChatModel> {
    const clients: Record<string, BaseChatModel> = {};
    
    for (const [name, config] of Object.entries(configs)) {
      try {
        clients[name] = this.createClient(config);
      } catch (error) {
        console.error(`Failed to create ${name} client:`, error);
      }
    }
    
    return clients;
  }
}



