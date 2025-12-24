import { GoogleGenerativeAI } from '@google/generative-ai';
import { AIModelConfig, AIModelResponse } from '@/types/ai-models';

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
