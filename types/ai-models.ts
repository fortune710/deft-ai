export type AIModelProvider = 'google' | 'grok';

export type AIModelName =
  | 'gemini-2.5-flash'
  | 'gemini-2.5-pro'
  | 'gemini-3-flash-preview'
  | 'grok-4-fast-reasoning'
  | 'grok-4-fast-non-reasoning';

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
    model: 'gemini-2.5-flash' as AIModelName,
    temperature: 0.7,
  },
  GOOGLE_PRO: {
    provider: 'google' as AIModelProvider,
    model: 'gemini-2.5-pro' as AIModelName,
    temperature: 0.7,
  },
  GROK_REASONING: {
    provider: 'grok' as AIModelProvider,
    model: 'grok-4-fast-reasoning' as AIModelName,
    temperature: 0.7,
  },
  GROK_NON_REASONING: {
    provider: 'grok' as AIModelProvider,
    model: 'grok-4-fast-non-reasoning' as AIModelName,
    temperature: 0.7,
  },
} as const;
