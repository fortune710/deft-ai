import OpenAI from 'openai';
import { AIModelConfig, AIModelResponse } from '@/types/ai-models';
import { z } from 'zod';

const client = new OpenAI({
  apiKey: process.env.XAI_API_KEY,
  baseURL: 'https://api.x.ai/v1',
});

export async function generateWithGrok(
  config: AIModelConfig,
  prompt: string,
  systemPrompt?: string
): Promise<AIModelResponse> {
  try {
    const apiKey = process.env.XAI_API_KEY;

    if (!apiKey) {
      throw new Error('XAI_API_KEY environment variable is not set');
    }

    const messages: OpenAI.MessageParam[] = [];

    if (systemPrompt) {
      messages.push({
        role: 'user',
        content: systemPrompt,
      });
    }

    messages.push({
      role: 'user',
      content: prompt,
    });

    const response = await client.messages.create({
      model: config.model,
      messages,
      max_tokens: config.maxTokens ?? 8192,
      temperature: config.temperature ?? 0.7,
    });

    const text = response.content
      .filter((block) => block.type === 'text')
      .map((block) => (block as any).text)
      .join('');

    return {
      content: text,
      usage: {
        promptTokens: response.usage?.input_tokens,
        completionTokens: response.usage?.output_tokens,
        totalTokens:
          (response.usage?.input_tokens ?? 0) + (response.usage?.output_tokens ?? 0),
      },
    };
  } catch (error) {
    console.error('Grok AI generation error:', error);
    throw new Error(`Failed to generate with Grok AI: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function generateObjectWithGrok<T extends z.ZodSchema>(
  config: AIModelConfig,
  schema: T,
  prompt: string,
  systemPrompt?: string
): Promise<z.infer<T>> {
  try {
    const apiKey = process.env.XAI_API_KEY;

    if (!apiKey) {
      throw new Error('XAI_API_KEY environment variable is not set');
    }

    const messages: OpenAI.MessageParam[] = [];

    if (systemPrompt) {
      messages.push({
        role: 'user',
        content: systemPrompt,
      });
    }

    messages.push({
      role: 'user',
      content: prompt,
    });

    const response = await client.messages.create({
      model: config.model,
      messages,
      max_tokens: config.maxTokens ?? 8192,
      temperature: config.temperature ?? 0.7,
    });

    const text = response.content
      .filter((block) => block.type === 'text')
      .map((block) => (block as any).text)
      .join('');

    const parsed = JSON.parse(text);
    return parsed;
  } catch (error) {
    console.error('Grok AI structured generation error:', error);
    throw new Error(
      `Failed to generate structured content with Grok AI: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

export async function generateTextWithGrok(
  config: AIModelConfig,
  prompt: string,
  systemPrompt?: string
): Promise<string> {
  try {
    const apiKey = process.env.XAI_API_KEY;

    if (!apiKey) {
      throw new Error('XAI_API_KEY environment variable is not set');
    }

    const messages: OpenAI.MessageParam[] = [];

    if (systemPrompt) {
      messages.push({
        role: 'user',
        content: systemPrompt,
      });
    }

    messages.push({
      role: 'user',
      content: prompt,
    });

    const response = await client.messages.create({
      model: config.model,
      messages,
      max_tokens: config.maxTokens ?? 8192,
      temperature: config.temperature ?? 0.7,
    });

    return response.content
      .filter((block) => block.type === 'text')
      .map((block) => (block as any).text)
      .join('');
  } catch (error) {
    console.error('Grok AI text generation error:', error);
    throw new Error(
      `Failed to generate text with Grok AI: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}
