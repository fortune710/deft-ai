import OpenAI from 'openai';
import { zodResponseFormat } from 'openai/helpers/zod';
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

    const messages: OpenAI.ChatCompletionMessageParam[] = [];

    if (systemPrompt) {
      messages.push({
        role: 'system',
        content: systemPrompt,
      });
    }

    messages.push({
      role: 'user',
      content: prompt,
    });

    const response = await client.chat.completions.create({
      model: config.model,
      messages,
      max_tokens: config.maxTokens ?? 8192,
      temperature: config.temperature ?? 0.7,
    });

    const text = response.choices[0]?.message?.content || '';

    return {
      content: text,
      usage: {
        promptTokens: response.usage?.prompt_tokens,
        completionTokens: response.usage?.completion_tokens,
        totalTokens: response.usage?.total_tokens,
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

    const messages: OpenAI.ChatCompletionMessageParam[] = [];

    if (systemPrompt) {
      messages.push({
        role: 'system',
        content: systemPrompt,
      });
    }

    messages.push({
      role: 'user',
      content: prompt,
    });

    const response = await client.beta.chat.completions.parse({
      model: config.model,
      messages,
      response_format: zodResponseFormat(schema, 'response'),
      max_tokens: config.maxTokens ?? 8192,
      temperature: config.temperature ?? 0.7,
    });

    const parsed = response.choices[0]?.message?.parsed;

    if (!parsed) {
      throw new Error('Failed to parse structured response from Grok');
    }

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

    const messages: OpenAI.ChatCompletionMessageParam[] = [];

    if (systemPrompt) {
      messages.push({
        role: 'system',
        content: systemPrompt,
      });
    }

    messages.push({
      role: 'user',
      content: prompt,
    });

    const response = await client.chat.completions.create({
      model: config.model,
      messages,
      max_tokens: config.maxTokens ?? 8192,
      temperature: config.temperature ?? 0.7,
      //maxTokens: config.maxTokens ?? 8192,
    });

    return response.choices[0]?.message?.content || '';
  } catch (error) {
    console.error('Grok AI text generation error:', error);
    throw new Error(
      `Failed to generate text with Grok AI: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}
