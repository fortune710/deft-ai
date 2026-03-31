import { Agent, AgentContext, ContentGeneratorResult, ContentIdea, GeneratedContent, ProgressCallback } from '@/types/ai-agents';
import { AI_MODELS, AIModelConfig } from '@/types/ai-models';
import { getModel } from '../models/get-model';
import { buildContentGenerationPrompt } from '../prompts/content-templates';
import {
  generateFallbackContent,
  validatePlatformContent,
  extractMetadataFromContent,
} from '../utils/content-generator-utils';
import { getContentSchema } from '../schemas/content-schemas';
import { addDays, startOfDay } from 'date-fns';
import { buildCurrentAffairsClassifierPrompt } from '../prompts/current-affairs-classifier';
import { tavilyResearch } from '@/lib/integrations/tavily';
import { z } from "zod";
import { logger } from '@/lib/logger';

const CurrentAffairsClassificationSchema = z.object({
  isCurrentAffairs: z.boolean().describe('Whether this is a current affairs/trending topic'),
  reason: z.string().describe('Reasoning for the classification'),
  researchQuery: z.string().describe('Recommended research query if current affairs is true'),
});

export class ContentGeneratorAgent implements Agent {
  name = 'Content Generator';
  description = 'Generates platform-specific content for each selected idea based on niche strategy';
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
    selectedIdeas?: ContentIdea[]
  ): Promise<ContentGeneratorResult> {
    if (!selectedIdeas || selectedIdeas.length === 0) {
      throw new Error('No ideas provided for content generation');
    }

    const { thirdPartyRuntime } = context;

    logger.info(`Starting content generation for ${selectedIdeas.length} ideas`, {
      userId: context.userId,
      goal: context.goal,
      experience: context.experience
    }, thirdPartyRuntime);

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
        logger.phase('content_generation', `Generating: ${idea.title} [${idea.platform}]`, thirdPartyRuntime);
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
        logger.info(`Successfully generated content for: ${idea.title}`, {}, thirdPartyRuntime);
      } catch (error) {
        logger.error(`Error generating content for idea: ${idea.title}`, error, thirdPartyRuntime);
        failedCount++;

        // Fallback logic
        try {
          const fallbackContent = await generateFallbackContent(idea, this.modelConfig);
          generatedContent.push({
            idea,
            content: fallbackContent,
            platform: idea.platform,
            scheduledDate: addDays(startDate, i),
            hashtags: [],
            metadata: { hookType: 'fallback' },
          });
        } catch (fallbackError) {
          generatedContent.push({
            idea,
            content: `${idea.title}\n\n${idea.description}`,
            platform: idea.platform,
            scheduledDate: addDays(startDate, i),
            hashtags: [],
            metadata: { hookType: 'error' },
          });
        }
      }
    }

    logger.info('Content generation complete', { successCount, failedCount }, thirdPartyRuntime);

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
    idea: ContentIdea,
    context: AgentContext
  ): Promise<{ scriptContent: string; platformContent: any; metadata: any }> {
    const { niche: strategy, thirdPartyRuntime } = context;

    const classification = await this.classifyCurrentAffairs(idea, context);
    const researchResult = classification.isCurrentAffairs
      ? await this.runResearch(classification.researchQuery || idea.title, thirdPartyRuntime)
      : undefined;

    const prompt = buildContentGenerationPrompt(
      idea.platform,
      {
        title: idea.title,
        description: idea.description,
        contentPillar: idea.contentPillar,
        hook: idea.hook,
      },
      strategy.niche,
      strategy.targetAudience,
      researchResult
        ? {
          summary: typeof researchResult.content === 'string' ? researchResult.content : JSON.stringify(researchResult.content),
          sources: researchResult.sources?.map((source: any) => ({
            title: source.title,
            url: source.url,
          })),
        }
        : undefined
    );

    const modelToUse = this.getModelForPlatform(idea.platform);
    const model = getModel(modelToUse);
    const schema = getContentSchema(idea.platform);
    const structuredModel = model.withStructuredOutput(schema);

    logger.info(`Invoking model for ${idea.platform} content`, { model: modelToUse }, thirdPartyRuntime);

    const platformContent = await structuredModel.invoke([
      {
        role: 'system',
        content: `You are an expert ${idea.platform} content creator. 
Tone: ${strategy.tone}. 
Target Audience: ${strategy.targetAudience}.
Goal: ${context.goal}.

<expertise>
- Master of platform-specific formatting and psychology
- Expert in native ${idea.platform} features and conventions
</expertise>`
      },
      { role: 'user', content: prompt }
    ]) as any;

    if (!validatePlatformContent(idea.platform, platformContent)) {
      throw new Error(`Invalid content structure for ${idea.platform}`);
    }

    const metadata = extractMetadataFromContent(idea.platform, platformContent);
    const scriptContent = platformContent.script_content || '';

    return {
      scriptContent,
      platformContent,
      metadata,
    };
  }

  private async classifyCurrentAffairs(
    idea: ContentIdea,
    context: AgentContext
  ): Promise<{ isCurrentAffairs: boolean; reason: string; researchQuery: string }> {
    const { thirdPartyRuntime } = context;
    if (!context.currentAffairsEnabled) {
      return { isCurrentAffairs: false, reason: 'Disabled', researchQuery: '' };
    }

    const prompt = buildCurrentAffairsClassifierPrompt(idea, context);
    const model = getModel(this.modelConfig);
    const structuredModel = model.withStructuredOutput(CurrentAffairsClassificationSchema);

    try {
      const result = await structuredModel.invoke([
        { role: 'system', content: 'Classify content trend potential.' },
        { role: 'user', content: prompt }
      ]);

      return {
        isCurrentAffairs: result.isCurrentAffairs === true,
        reason: result.reason || 'No reason',
        researchQuery: result.researchQuery || '',
      };
    } catch (error) {
      logger.warn('Current affairs classification failed', error, thirdPartyRuntime);
      return { isCurrentAffairs: true, reason: 'Failed but trending', researchQuery: idea.title };
    }
  }

  private async runResearch(input: string, thirdPartyRuntime?: boolean) {
    try {
      logger.info(`Running research for: ${input}`, {}, thirdPartyRuntime);
      return await tavilyResearch(input, { model: 'mini', citationFormat: 'numbered' });
    } catch (error) {
      logger.error('Research failed', error, thirdPartyRuntime);
      return undefined;
    }
  }
}
