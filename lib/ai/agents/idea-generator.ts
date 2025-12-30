import { Agent, AgentContext, IdeaGeneratorResult, ContentIdea, ProgressCallback } from '@/types/ai-agents';
import { AI_MODELS, AIModelConfig } from '@/types/ai-models';
import { generateWithModel } from '../models';
import { buildIdeaGenerationPrompt } from '../prompts/idea-generation-advanced';

export class IdeaGeneratorAgent implements Agent {
  name = 'Idea Generator';
  description = 'Generates 100+ scroll-stopping content ideas using contrarian, results-focused, pain point, and transformation strategies';
  modelConfig: AIModelConfig = AI_MODELS.GOOGLE_FLASH;

  private getModelForPlatform(platform: string): AIModelConfig {
    const platformLower = platform.toLowerCase();
    if (platformLower === 'twitter' || platformLower === 'linkedin') {
      return AI_MODELS.GROK_REASONING;
    }
    return this.modelConfig;
  }

  async execute(context: AgentContext, onProgress?: ProgressCallback): Promise<IdeaGeneratorResult> {
    const { niche, subNiche, targetAudience, platforms, contentPillars } = context;

    const strategies: Array<'contrarian' | 'results' | 'pain_point' | 'transformation'> = [
      'contrarian',
      'results',
      'pain_point',
      'transformation',
    ];

    const allIdeas: ContentIdea[] = [];
    const ideasPerStrategy = 25;
    let totalProgress = 0;

    onProgress?.({
      phase: 'idea_generation',
      progress: 0,
      message: 'Starting idea generation',
      details: 'Preparing to generate 100 content ideas',
    });

    for (let strategyIndex = 0; strategyIndex < strategies.length; strategyIndex++) {
      const strategy = strategies[strategyIndex];

      onProgress?.({
        phase: 'idea_generation',
        progress: (strategyIndex / strategies.length) * 45,
        message: `Generating ${strategy.replace('_', ' ')} ideas`,
        details: `Strategy ${strategyIndex + 1}/4: Creating ${ideasPerStrategy} ideas`,
      });

      for (const platform of platforms) {
        const ideasForPlatform = Math.ceil(ideasPerStrategy / platforms.length);

        try {
          const prompt = buildIdeaGenerationPrompt({
            niche,
            subNiche,
            targetAudience,
            platform,
            count: ideasForPlatform,
            strategy,
            contentPillars,
          });

          const modelToUse = this.getModelForPlatform(platform);

          const response = await generateWithModel(
            modelToUse,
            prompt,
            'You are an expert content strategist. Return ONLY valid JSON arrays of content ideas. No markdown, no explanations.'
          );

          const ideas = this.parseIdeasFromResponse(response.content, platform);
          allIdeas.push(...ideas);

          totalProgress = ((strategyIndex * platforms.length + platforms.indexOf(platform) + 1) / (strategies.length * platforms.length)) * 45;

          onProgress?.({
            phase: 'idea_generation',
            progress: totalProgress,
            message: `Generated ${allIdeas.length} ideas so far`,
            details: `${strategy} strategy for ${platform}`,
          });
        } catch (error) {
          console.error(`Error generating ideas for ${platform} with ${strategy} strategy:`, error);
        }
      }
    }

    const platformDistribution = this.calculatePlatformDistribution(allIdeas);

    onProgress?.({
      phase: 'idea_generation',
      progress: 45,
      message: `Generated ${allIdeas.length} total ideas`,
      details: Object.entries(platformDistribution).map(([p, c]) => `${p}: ${c}`).join(', '),
    });

    return {
      ideas: allIdeas,
      totalGenerated: allIdeas.length,
      platformDistribution,
    };
  }

  private parseIdeasFromResponse(content: string, platform: string): ContentIdea[] {
    try {
      let jsonContent = content.trim();

      if (jsonContent.startsWith('```json')) {
        jsonContent = jsonContent.replace(/```json\n?/g, '').replace(/```\n?/g, '');
      } else if (jsonContent.startsWith('```')) {
        jsonContent = jsonContent.replace(/```\n?/g, '');
      }

      jsonContent = jsonContent.trim();

      const parsed = JSON.parse(jsonContent);
      const ideasArray = Array.isArray(parsed) ? parsed : [parsed];

      return ideasArray.map((idea, index) => ({
        id: `${platform}-${Date.now()}-${index}`,
        platform: idea.platform || platform,
        title: idea.title || '',
        description: idea.description || '',
        contentPillar: idea.contentPillar || 'General',
        hook: idea.hook,
      }));
    } catch (error) {
      console.error('Error parsing ideas from response:', error);
      console.error('Response content:', content.substring(0, 500));
      return [];
    }
  }

  private calculatePlatformDistribution(ideas: ContentIdea[]): Record<string, number> {
    const distribution: Record<string, number> = {};

    ideas.forEach(idea => {
      distribution[idea.platform] = (distribution[idea.platform] || 0) + 1;
    });

    return distribution;
  }
}
