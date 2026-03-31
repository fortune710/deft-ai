import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { ChatXAI } from "@langchain/xai";
import { AIModelConfig } from "@/types/ai-models";
import { BaseChatModel } from "@langchain/core/language_models/chat_models";

export function getModel(config: AIModelConfig): BaseChatModel {
    const { provider, model, temperature, maxTokens } = config;

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
