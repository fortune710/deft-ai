<<<<<<< HEAD
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { generateObject, generateText, Output } from 'ai';
=======
>>>>>>> 1c5ef9ed947023d042cc77279a5d374fc50a110e
import { GoogleGenerativeAI, ObjectSchema } from '@google/generative-ai';
import { AIModelConfig, AIModelResponse } from '@/types/ai-models';
import { z } from 'zod';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

const google = createGoogleGenerativeAI({
  apiKey: process.env.GEMINI_API_KEY || '',
});

export async function generateWithGoogle(
  config: AIModelConfig,
  prompt: string,
  systemPrompt?: string
): Promise<AIModelResponse> {
  try {
    const model = genAI.getGenerativeModel({
      model: config.model,
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
    const model = genAI.getGenerativeModel({
      model: config.model,
      systemInstruction: systemPrompt,
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: 'object',
          properties: convertZodToJsonSchema(schema),
          //required: Object.keys(schema.shape as z.ZodObject<any>).map((key) => key as string),
        } as ObjectSchema,
      },
    });

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    const parsed = JSON.parse(responseText);

    return parsed;
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
    const model = genAI.getGenerativeModel({
      model: config.model,
      systemInstruction: systemPrompt,
    });

    const result = await model.generateContent(prompt);
    return result.response.text();
  } catch (error) {
    console.error('Google AI text generation error:', error);
    throw new Error(
      `Failed to generate text with Google AI: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

function convertZodToJsonSchema(schema: z.ZodSchema): Record<string, any> {
  if (schema instanceof z.ZodObject) {
    const shape = schema.shape;
    const properties: Record<string, any> = {};
    const required: string[] = [];

    for (const [key, value] of Object.entries(shape)) {
      properties[key] = zodTypeToJsonSchema(value as z.ZodType);
      if (!(value instanceof z.ZodOptional || value instanceof z.ZodNullable)) {
        required.push(key);
      }
    }

    return {
      type: 'object',
      properties,
      required,
    };
  }

  return { type: 'string' };
}

function zodTypeToJsonSchema(type: z.ZodType): Record<string, any> {
  if (type instanceof z.ZodString) {
    return { type: 'string' };
  } else if (type instanceof z.ZodNumber) {
    return { type: 'number' };
  } else if (type instanceof z.ZodBoolean) {
    return { type: 'boolean' };
  } else if (type instanceof z.ZodArray) {
    return {
      type: 'array',
      items: zodTypeToJsonSchema(type.element),
    };
  } else if (type instanceof z.ZodObject) {
    return convertZodToJsonSchema(type);
  } else if (type instanceof z.ZodOptional || type instanceof z.ZodNullable) {
    return zodTypeToJsonSchema(type.unwrap());
  }

  return { type: 'string' };
}
