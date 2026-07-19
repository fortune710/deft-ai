import { Agent, AgentContext, ContentGeneratorResult, ContentIdea, GeneratedContent, ProgressCallback } from '@/types/ai-agents';
import { AI_MODELS, AIModelConfig } from '@/types/ai-models';
import { getModel } from '../models/get-model';
import { buildSkillContentPrompt } from '../prompts/content-generation-skill';
import {
  validatePlatformContent,
  extractMetadataFromContent,
  getModelForPlatform,
} from '../utils/content-generator-utils';
import { getSocialContentExpertPersona, getPlatformQuickReference } from '@/lib/ai/skills/social-content';
import { addDays, startOfDay } from 'date-fns';
import { buildCurrentAffairsClassifierPrompt } from '../prompts/current-affairs-classifier';
import { tavilyResearch } from '@/lib/integrations/tavily';
import { z } from "zod";
import { logger } from '@/lib/logger.server';
import { BaseMessageLike } from '@langchain/core/messages';

const CurrentAffairsClassificationSchema = z.object({
  isCurrentAffairs: z.boolean().describe('Whether this is a current affairs/trending topic'),
  reason: z.string().describe('Reasoning for the classification'),
  researchQuery: z.string().describe('Recommended research query if current affairs is true'),
});

export class ContentGeneratorAgent implements Agent {
  name = 'Content Generator';
  description = 'Generates platform-specific content for each selected idea based on niche strategy';
  modelConfig: AIModelConfig = AI_MODELS.GOOGLE_FLASH;
  log = logger.child({ module: ContentGeneratorAgent });

  async execute(
    context: AgentContext,
    onProgress?: ProgressCallback,
    selectedIdeas?: ContentIdea[]
  ): Promise<ContentGeneratorResult> {
    if (!selectedIdeas || selectedIdeas.length === 0) {
      throw new Error('No ideas provided for content generation');
    }

    const { thirdPartyRuntime } = context;

    this.log.info(`Starting content generation for ${selectedIdeas.length} ideas`, {
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
        this.log.phase('content_generation', `Generating: ${idea.title} [${idea.platform}]`, thirdPartyRuntime);
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
        this.log.info(`Successfully generated content for: ${idea.title}`, { platform: idea.platform }, thirdPartyRuntime);
      } catch (error) {
        this.log.error(`Error generating content for idea: ${idea.title}`, error, thirdPartyRuntime);
        failedCount++;

        // Fallback logic
        try {
          this.log.info(`Attempting fallback generation for: ${idea.title}`, {}, thirdPartyRuntime);
          const fallbackContent = await this.generateFallbackContent(idea, this.modelConfig);
          generatedContent.push({
            idea,
            content: fallbackContent,
            platform: idea.platform,
            scheduledDate: addDays(startDate, i),
            hashtags: [],
            metadata: { hookType: 'fallback' },
          });
        } catch (fallbackError) {
          this.log.error(`Fallback generation failed for: ${idea.title}`, fallbackError, thirdPartyRuntime);
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

    this.log.info('Content generation complete', { successCount, failedCount }, thirdPartyRuntime);

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

    let researchResult;
    if (classification.isCurrentAffairs) {
      try {
        researchResult = await this.runResearch(classification.researchQuery || idea.title, thirdPartyRuntime);
      } catch (researchError) {
        this.log.warn(`Research failed for "${idea.title}", proceeding without research data`, researchError, thirdPartyRuntime);
      }
    }

    const prompt = buildSkillContentPrompt(
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

    const modelToUse = getModelForPlatform(idea.platform, this.modelConfig);
    const model = getModel(modelToUse);

    this.log.info(`Invoking model for ${idea.platform} content`, {
      model: modelToUse,
      hasResearch: !!researchResult,
      isCurrentAffairs: classification.isCurrentAffairs
    }, thirdPartyRuntime);

    const result = await model.invoke([
      {
        role: 'system',
        content: `
${getSocialContentExpertPersona()}

${getPlatformQuickReference()}

You are an expert ${idea.platform} content creator worknig with the following context:
Tone: ${strategy.tone}
Target Audience: ${strategy.targetAudience}
Goal: ${context.goal}

IMPORTANT: YOU MUST RETURN THE ENTIRE OUTPUT AS A SINGLE UNIFIED MARKDOWN STRING. DO NOT USE JSON. Do not wrap in backticks like \`\`\`markdown. Provide the text plainly formatted with Markdown headers, bullet points, etc.
`.trim()
      },
      { role: 'user', content: prompt }
    ]);

    let markdownContent = '';
    if (typeof result.content === 'string') {
      markdownContent = result.content;
    } else if (Array.isArray(result.content)) {
      markdownContent = result.content.map(c => typeof c === 'string' ? c : ('text' in c ? c.text : '')).join('');
    }

    const platformContent = { script_content: markdownContent, hashtags: [] } as any;

    const metadata = { hookType: 'generated' };
    const scriptContent = markdownContent || '';

    return {
      scriptContent,
      platformContent,
      metadata,
    };
  }

  private async generateFallbackContent(idea: ContentIdea, modelConfig: AIModelConfig): Promise<string> {
    const fallbackPrompt = `
  Create a simple, short social media post based on this idea:
  Title: ${idea.title}
  Description: ${idea.description}
  Platform: ${idea.platform}
  
  Keep it concise and engaging. Just return the post text, no JSON.
    `.trim();

    const systemPrompt = 'You are a content creator. Return only the post text, no explanations.';
    const model = getModel(modelConfig);
    const baseMessages: BaseMessageLike[][] = [
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: fallbackPrompt }
      ]
    ];
    const result = await model.generate(baseMessages);
    const text = result.generations.flatMap((gen) => gen.map((g) => g.text)).join('');
    return text;
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
      this.log.info(`Classifying current affairs for: ${idea.title}`, {}, thirdPartyRuntime);
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
      this.log.warn('Current affairs classification failed, defaulting to false', error, thirdPartyRuntime);
      return { isCurrentAffairs: false, reason: 'Classification failed', researchQuery: '' };
    }
  }

  private async runResearch(input: string, thirdPartyRuntime?: boolean) {
    try {
      this.log.info(`Running research for query: ${input}`, {}, thirdPartyRuntime);
      const research = await tavilyResearch(input, { model: 'mini', citationFormat: 'numbered' });
      this.log.info(`Research completed for query: ${input}`, {
        status: research.status,
        hasContent: !!research.content
      }, thirdPartyRuntime);
      return research;
    } catch (error) {
      this.log.error(`Research execution failed for query: ${input}`, error, thirdPartyRuntime);
      return undefined;
    }
  }
}
