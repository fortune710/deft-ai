import { AIModelConfig, AIModelResponse } from '@/types/ai-models';
import { generateWithGoogle } from './google';
import { generateWithGrok } from './grok';

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

export { generateWithGoogle } from './google';
export { generateWithGrok } from './grok';
