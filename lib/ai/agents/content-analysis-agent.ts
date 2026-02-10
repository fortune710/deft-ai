import type { SupabaseClient } from '@supabase/supabase-js';
import { AI_MODELS, AIModelConfig } from '@/types/ai-models';
import type { ContentType, FeedbackGenerationResult } from '@/types/content-analytics';
import { generateContentFeedback } from '@/lib/ai/content-feedback-generator';

export interface ContentAnalysisContext {
  supabase: SupabaseClient;
  analyticsId: string;
  userId: string;
  contentType: ContentType;
}

export interface ContentAnalysisProgress {
  phase: 'content_analysis';
  progress: number;
  message: string;
  details?: string;
}

export type ContentAnalysisProgressCallback = (progress: ContentAnalysisProgress) => void | Promise<void>;

export type ContentAnalysisProvider = (context: ContentAnalysisContext) => Promise<FeedbackGenerationResult>;

export class ContentAnalysisAgent {
  name = 'Content Analysis';
  description = 'Analyzes text or video content and returns structured feedback.';
  modelConfig: AIModelConfig = AI_MODELS.GROK_REASONING;
  private provider: ContentAnalysisProvider;

  constructor(provider?: ContentAnalysisProvider) {
    this.provider = provider ?? this.defaultProvider;
  }

  async execute(context: ContentAnalysisContext, onProgress?: ContentAnalysisProgressCallback): Promise<FeedbackGenerationResult> {
    await onProgress?.({
      phase: 'content_analysis',
      progress: 0,
      message: 'Starting content analysis',
      details: `Content type: ${context.contentType}`,
    });

    const result = await this.provider(context);

    await onProgress?.({
      phase: 'content_analysis',
      progress: result.success ? 100 : 95,
      message: result.success ? 'Content analysis completed' : 'Content analysis failed',
      details: result.error,
    });

    return result;
  }

  private defaultProvider: ContentAnalysisProvider = async (context) => {
    return generateContentFeedback(context.supabase, context.analyticsId, context.userId, { persist: false });
  };
}
