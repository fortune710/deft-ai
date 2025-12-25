import { Agent, AgentContext, ContentGeneratorResult, ScoredContentIdea, GeneratedContent, ProgressCallback } from '@/types/ai-agents';
import { AI_MODELS, AIModelConfig } from '@/types/ai-models';
import { generateObjectWithModel } from '../models';
import { buildContentGenerationPrompt } from '../prompts/content-templates';
import {
  generatePlatformContent,
  generateFallbackContent,
  validatePlatformContent,
  extractMetadataFromContent,
} from '../utils/content-generator-utils';
import { getContentSchema } from '../schemas/content-schemas';
import { addDays, startOfDay } from 'date-fns';

export class ContentGeneratorAgent implements Agent {
  name = 'Content Generator';
  description = 'Generates platform-specific, scroll-stopping content for each selected idea';
  modelConfig: AIModelConfig = AI_MODELS.GOOGLE_FLASH;

  private getModelForPlatform(platform: string): AIModelConfig {
    const platformLower = platform.toLowerCase();
    if (platformLower === 'twitter' || platformLower === 'linkedin') {
      return AI_MODELS.GROK_NON_REASONING;
    }
    return this.modelConfig;
  }

  async execute(
    context: AgentContext,
    onProgress?: ProgressCallback,
    selectedIdeas?: ScoredContentIdea[]
  ): Promise<ContentGeneratorResult> {
    if (!selectedIdeas || selectedIdeas.length === 0) {
      throw new Error('No ideas provided for content generation');
    }

    onProgress?.({
      phase: 'content_generation',
      progress: 65,
      message: 'Starting content generation',
      details: `Creating ${selectedIdeas.length} platform-specific posts`,
    });

    const generatedContent: GeneratedContent[] = [];
    let successCount = 0;
    let failedCount = 0;

    const startDate = startOfDay(addDays(new Date(), 1));

    for (let i = 0; i < selectedIdeas.length; i++) {
      const idea = selectedIdeas[i];
      const progress = 65 + ((i / selectedIdeas.length) * 30);

      onProgress?.({
        phase: 'content_generation',
        progress,
        message: `Generating content (${i + 1}/${selectedIdeas.length})`,
        details: `Creating ${idea.platform} post: ${idea.title.substring(0, 50)}...`,
      });

      try {
        const result = await this.generateContentForIdea(idea, context);
        const scheduledDate = addDays(startDate, i);

        generatedContent.push({
          idea,
          content: result.scriptContent,
          platform: idea.platform,
          scheduledDate,
          hashtags: result.platformContent.hashtags || [],
          metadata: result.metadata,
        });

        successCount++;
      } catch (error) {
        console.error(`Error generating content for idea ${idea.id}:`, error);
        failedCount++;

        try {
          const fallbackContent = await generateFallbackContent(idea, this.modelConfig);
          generatedContent.push({
            idea,
            content: fallbackContent,
            platform: idea.platform,
            scheduledDate: addDays(startDate, i),
            hashtags: [],
            metadata: {
              hookType: 'fallback',
              structure: 'simple',
              callToAction: 'engage',
            },
          });
        } catch (fallbackError) {
          console.error(`Fallback generation also failed for idea ${idea.id}:`, fallbackError);
          generatedContent.push({
            idea,
            content: `${idea.title}\n\n${idea.description}`,
            platform: idea.platform,
            scheduledDate: addDays(startDate, i),
            hashtags: [],
            metadata: {
              hookType: 'error',
              structure: 'basic',
              callToAction: 'engage',
            },
          });
        }
      }
    }

    onProgress?.({
      phase: 'content_generation',
      progress: 95,
      message: `Generated ${successCount} pieces of content`,
      details: `Success: ${successCount}, Failed: ${failedCount}`,
    });

    return {
      generatedContent,
      successCount,
      failedCount,
    };
  }

  private async generateContentForIdea(
    idea: ScoredContentIdea,
    context: AgentContext
  ): Promise<{ scriptContent: string; platformContent: any; metadata: any }> {
    const prompt = buildContentGenerationPrompt(
      idea.platform,
      {
        title: idea.title,
        description: idea.description,
        contentPillar: idea.contentPillar,
        hook: idea.hook,
      },
      context.niche,
      context.targetAudience
    );

    const modelToUse = this.getModelForPlatform(idea.platform);
    const schema = getContentSchema(idea.platform);

    const systemPrompt =
      'You are an expert content creator. Return ONLY valid JSON with the exact structure requested. No markdown, no explanations, no code blocks.';

    const platformContent = await generateObjectWithModel(modelToUse, schema, prompt, systemPrompt);

    if (!validatePlatformContent(idea.platform, platformContent)) {
      throw new Error(`Invalid content structure for ${idea.platform}`);
    }

    const metadata = extractMetadataFromContent(idea.platform, platformContent);
    const scriptContent = platformContent.script_content || platformContent.caption || '';

    return {
      scriptContent,
      platformContent,
      metadata,
    };
  }
}
