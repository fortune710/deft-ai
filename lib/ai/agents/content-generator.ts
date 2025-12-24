import { Agent, AgentContext, ContentGeneratorResult, ScoredContentIdea, GeneratedContent, ProgressCallback } from '@/types/ai-agents';
import { AI_MODELS, AIModelConfig } from '@/types/ai-models';
import { generateWithModel } from '../models';
import { buildContentGenerationPrompt } from '../prompts/content-templates';
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
        const content = await this.generateContentForIdea(idea, context);
        const scheduledDate = addDays(startDate, i);

        generatedContent.push({
          idea,
          content: content.content,
          platform: idea.platform,
          scheduledDate,
          hashtags: content.metadata.hashtags,
          metadata: content.metadata,
        });

        successCount++;
      } catch (error) {
        console.error(`Error generating content for idea ${idea.id}:`, error);
        failedCount++;

        generatedContent.push({
          idea,
          content: this.generateFallbackContent(idea),
          platform: idea.platform,
          scheduledDate: addDays(startDate, i),
          hashtags: [],
        });
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
  ): Promise<{ content: string; metadata: any }> {
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

    const response = await generateWithModel(
      modelToUse,
      prompt,
      'You are an expert content creator. Return ONLY valid JSON with content and metadata. No markdown, no explanations.'
    );

    return this.parseContentFromResponse(response.content);
  }

  private parseContentFromResponse(content: string): { content: string; metadata: any } {
    try {
      let jsonContent = content.trim();

      if (jsonContent.startsWith('```json')) {
        jsonContent = jsonContent.replace(/```json\n?/g, '').replace(/```\n?/g, '');
      } else if (jsonContent.startsWith('```')) {
        jsonContent = jsonContent.replace(/```\n?/g, '');
      }

      const parsed = JSON.parse(jsonContent.trim());

      return {
        content: parsed.content || '',
        metadata: parsed.metadata || {
          hookType: 'standard',
          structure: 'standard',
          callToAction: 'engage',
          hashtags: [],
        },
      };
    } catch (error) {
      console.error('Error parsing content response:', error);
      console.error('Response content:', content.substring(0, 500));

      const cleanContent = content
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();

      return {
        content: cleanContent,
        metadata: {
          hookType: 'parsed_error',
          structure: 'standard',
          callToAction: 'engage',
          hashtags: [],
        },
      };
    }
  }

  private generateFallbackContent(idea: ScoredContentIdea): string {
    return `${idea.title}

${idea.description}

${idea.hook || ''}

#${idea.contentPillar.replace(/\s+/g, '')} #content #${idea.platform}`;
  }
}
