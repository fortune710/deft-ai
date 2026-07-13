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
    name: 'Gemini 2.5 Flash',
    temperature: 0.7,
  },
  GOOGLE_PRO: {
    provider: 'google' as AIModelProvider,
    model: 'gemini-2.5-pro' as AIModelName,
    name: 'Gemini 2.5 Pro',
    temperature: 0.7,
  },
  GROK_REASONING: {
    provider: 'grok' as AIModelProvider,
    model: 'grok-4-fast-reasoning' as AIModelName,
    name: 'Grok 4 Fast Reasoning',
    temperature: 0.7,
  },
  GROK_NON_REASONING: {
    provider: 'grok' as AIModelProvider,
    model: 'grok-4-fast-non-reasoning' as AIModelName,
    name: 'Grok 4 Fast Non-Reasoning',
    temperature: 0.7,
  },
} as const;

export function getModelConfig(modelName: AIModelName): AIModelConfig {
  const model = Object.values(AI_MODELS).find((m) => m.model === modelName);
  if (!model) {
    return AI_MODELS.GOOGLE_FLASH as AIModelConfig;
  }
  return model as AIModelConfig;
}
