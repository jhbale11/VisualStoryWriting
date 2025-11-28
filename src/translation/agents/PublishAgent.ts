import { GoogleGenerativeAI } from '@google/generative-ai';
import { LLMConfig } from '../types';
import { DEFAULT_PUBLISH_PROMPT } from '../prompts/defaultPrompts';

export class PublishAgent {
    private genAI: GoogleGenerativeAI;
    private model: any;

    constructor(apiKey: string, config: LLMConfig) {
        this.genAI = new GoogleGenerativeAI(apiKey);
        this.model = this.genAI.getGenerativeModel({
            model: config.model || 'gemini-3-pro-preview',
            generationConfig: {
                temperature: config.temperature || 0.3, // Lower temperature for formatting tasks
            },
        });
    }

    async process(
        text: string,
        customPrompt?: string,
        onProgress?: (progress: number) => void
    ): Promise<string> {
        try {
            const prompt = customPrompt || DEFAULT_PUBLISH_PROMPT;

            // Construct the full prompt
            const fullPrompt = `${prompt}\n\nHere is the text to format:\n\n${text}`;

            // For very large texts, we might need to chunk, but for now let's try processing as a whole 
            // or assume the caller handles chunking. 
            // Given the context of "Publish Project", it's likely the whole novel or a large chapter.
            // Gemini 1.5/3.0 has a large context window, so we can try sending it all.

            if (onProgress) onProgress(0.1);

            const result = await this.model.generateContent(fullPrompt);
            const response = await result.response;
            const formattedText = response.text();

            if (onProgress) onProgress(1.0);

            return formattedText;
        } catch (error) {
            console.error('PublishAgent error:', error);
            throw error;
        }
    }
}
