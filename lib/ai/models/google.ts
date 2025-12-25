import { google } from '@ai-sdk/google';
import { generateObject, generateText } from 'ai';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { AIModelConfig, AIModelResponse } from '@/types/ai-models';
import { z } from 'zod';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function generateWithGoogle(
  config: AIModelConfig,
  prompt: string,
  systemPrompt?: string
): Promise<AIModelResponse> {
  try {
    const model = genAI.getGenerativeModel({
      model: config.model,
      generationConfig: {
        temperature: config.temperature ?? 0.7,
        maxOutputTokens: config.maxTokens ?? 8192,
        topP: config.topP ?? 0.95,
        topK: config.topK ?? 40,
      },
      systemInstruction: systemPrompt,
    });

    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text();

    return {
      content: text,
      usage: {
        promptTokens: response.usageMetadata?.promptTokenCount,
        completionTokens: response.usageMetadata?.candidatesTokenCount,
        totalTokens: response.usageMetadata?.totalTokenCount,
      },
    };
  } catch (error) {
    console.error('Google AI generation error:', error);
    throw new Error(`Failed to generate with Google AI: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function generateObjectWithGoogle<T extends z.ZodSchema>(
  config: AIModelConfig,
  schema: T,
  prompt: string,
  systemPrompt?: string
): Promise<z.infer<T>> {
  try {
    const model = google(config.model, {
      apiKey: process.env.GEMINI_API_KEY,
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
    console.error('Google AI structured generation error:', error);
    throw new Error(
      `Failed to generate structured content with Google AI: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

export async function generateTextWithGoogle(
  config: AIModelConfig,
  prompt: string,
  systemPrompt?: string
): Promise<string> {
  try {
    const model = google(config.model, {
      apiKey: process.env.GEMINI_API_KEY,
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
    console.error('Google AI text generation error:', error);
    throw new Error(
      `Failed to generate text with Google AI: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}
