import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { ChatXAI } from "@langchain/xai";
import { AIModelConfig } from "@/types/ai-models";
import { BaseChatModel } from "@langchain/core/language_models/chat_models";
import { CohereEmbeddings } from '@langchain/cohere';
import { Embeddings } from '@langchain/core/embeddings';
import type { EmbeddingModelConfig } from '@/types/ai-models';
import { logger } from '@/lib/logger.server';

const log = logger.child({ file: 'lib/ai/models/get-model.ts' });

export function getModel(config: AIModelConfig): BaseChatModel;
export function getModel(config: EmbeddingModelConfig): Embeddings;
export function getModel(config: AIModelConfig | EmbeddingModelConfig): BaseChatModel | Embeddings {
    const userId = 'system';
    if ('kind' in config && config.kind === 'embedding') {
        log.debug('Creating embedding model', {
            userId,
            action: 'create_embedding_model',
            provider: config.provider,
            model: config.model,
            dimensions: config.dimensions,
        });
        return new CohereEmbeddings({
            apiKey: process.env.COHERE_API_KEY,
            model: config.model,
            embeddingTypes: ['float'],
            maxRetries: 3,
        });
    }

    const chatConfig = config as AIModelConfig;
    const { provider, model, temperature, maxTokens } = chatConfig;
    log.debug('Creating chat model', {
        userId,
        action: 'create_chat_model',
        provider,
        model,
    });

    switch (provider) {
        case "google":
            return new ChatGoogleGenerativeAI({
                model: model,
                temperature: temperature ?? 0.7,
                maxOutputTokens: maxTokens,
                apiKey: process.env.GEMINI_API_KEY,
                maxRetries: 3,
            }) as unknown as BaseChatModel;
        case "grok":
            return new ChatXAI({
                model: model,
                temperature: temperature ?? 0.7,
                maxTokens: maxTokens,
                apiKey: process.env.XAI_API_KEY,
                maxRetries: 3,
            }) as unknown as BaseChatModel;
        default:
            throw new Error(`Unsupported AI provider: ${provider}`);
    }
}
