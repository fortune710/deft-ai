export type AIModelProvider = 'google' | 'grok';

export type AIModelName =
  | 'gemini-2.0-flash-exp'
  | 'gemini-1.5-pro'
  | 'grok-beta'
  | 'grok-2-latest';

export interface AIModelConfig {
  provider: AIModelProvider;
  model: AIModelName;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  topK?: number;
}

export interface AIModelResponse {
  content: string;
  usage?: {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
  };
}

export interface StreamingAIModelResponse {
  stream: ReadableStream<string>;
  usage?: {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
  };
}

export const AI_MODELS = {
  GOOGLE_FLASH: {
    provider: 'google' as AIModelProvider,
    model: 'gemini-2.0-flash-exp' as AIModelName,
    temperature: 0.7,
  },
  GOOGLE_PRO: {
    provider: 'google' as AIModelProvider,
    model: 'gemini-1.5-pro' as AIModelName,
    temperature: 0.7,
  },
  GROK_BETA: {
    provider: 'grok' as AIModelProvider,
    model: 'grok-beta' as AIModelName,
    temperature: 0.7,
  },
  GROK_2: {
    provider: 'grok' as AIModelProvider,
    model: 'grok-2-latest' as AIModelName,
    temperature: 0.7,
  },
} as const;
