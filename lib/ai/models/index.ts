import { AIModelConfig, AIModelResponse } from '@/types/ai-models';
import { generateWithGoogle, generateObjectWithGoogle, generateTextWithGoogle } from './google';
import { generateWithGrok, generateObjectWithGrok, generateTextWithGrok } from './grok';
import { z } from 'zod';

export async function generateWithModel(
  config: AIModelConfig,
  prompt: string,
  systemPrompt?: string
): Promise<AIModelResponse> {
  switch (config.provider) {
    case 'google':
      return generateWithGoogle(config, prompt, systemPrompt);
    case 'grok':
      return generateWithGrok(config, prompt, systemPrompt);
    default:
      throw new Error(`Unsupported AI provider: ${config.provider}`);
  }
}

export async function generateObjectWithModel<T extends z.ZodSchema>(
  config: AIModelConfig,
  schema: T,
  prompt: string,
  systemPrompt?: string
): Promise<z.infer<T>> {
  switch (config.provider) {
    case 'google':
      return generateObjectWithGoogle(config, schema, prompt, systemPrompt);
    case 'grok':
      return generateObjectWithGrok(config, schema, prompt, systemPrompt);
    default:
      throw new Error(`Unsupported AI provider: ${config.provider}`);
  }
}

export async function generateTextWithModel(
  config: AIModelConfig,
  prompt: string,
  systemPrompt?: string
): Promise<string> {
  switch (config.provider) {
    case 'google':
      return generateTextWithGoogle(config, prompt, systemPrompt);
    case 'grok':
      return generateTextWithGrok(config, prompt, systemPrompt);
    default:
      throw new Error(`Unsupported AI provider: ${config.provider}`);
  }
}

export { generateWithGoogle, generateObjectWithGoogle, generateTextWithGoogle } from './google';
export { generateWithGrok, generateObjectWithGrok, generateTextWithGrok } from './grok';
