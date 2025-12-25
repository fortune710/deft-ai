import { xai } from '@ai-sdk/xai';
import { generateObject, generateText } from 'ai';
import { AIModelConfig, AIModelResponse } from '@/types/ai-models';
import { z } from 'zod';

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

    const messages = [];

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

    const response = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: config.model,
        messages,
        temperature: config.temperature ?? 0.7,
        max_tokens: config.maxTokens ?? 8192,
        top_p: config.topP ?? 0.95,
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`Grok API error: ${response.status} ${errorData}`);
    }

    const data = await response.json();

    return {
      content: data.choices[0]?.message?.content || '',
      usage: {
        promptTokens: data.usage?.prompt_tokens,
        completionTokens: data.usage?.completion_tokens,
        totalTokens: data.usage?.total_tokens,
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
    const model = xai(config.model, {
      apiKey: process.env.XAI_API_KEY,
    });

    const result = await generateObject({
      model,
      schema,
      prompt,
      system: systemPrompt,
      temperature: config.temperature ?? 0.7,
      maxTokens: config.maxTokens ?? 8192,
    });

    return result.object;
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
    const model = xai(config.model, {
      apiKey: process.env.XAI_API_KEY,
    });

    const result = await generateText({
      model,
      prompt,
      system: systemPrompt,
      temperature: config.temperature ?? 0.7,
      maxTokens: config.maxTokens ?? 8192,
    });

    return result.text;
  } catch (error) {
    console.error('Grok AI text generation error:', error);
    throw new Error(
      `Failed to generate text with Grok AI: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}
