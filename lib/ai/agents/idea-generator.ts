import { Agent, AgentContext, IdeaGeneratorResult, ContentIdea, ProgressCallback } from '@/types/ai-agents';
import { AI_MODELS, AIModelConfig } from '@/types/ai-models';
import { getModel } from '../models/get-model';
import { buildIdeaGenerationPrompt } from '../prompts/idea-generation-advanced';
import { tavilySearch } from '@/lib/integrations/tavily';
import { z } from "zod";
import { logger } from '@/lib/logger';

// Define the schema for structured idea generation
const IdeasOutputSchema = z.object({
  ideas: z.array(z.object({
    title: z.string().describe('Catchy title for the content'),
    description: z.string().describe('Brief explanation of the content concept'),
    platform: z.string().describe('Target platform'),
    contentPillar: z.string().describe('Which content pillar this relates to'),
    hook: z.string().nullable().describe('Initial hook/attention grabber'),
    isCurrentAffairs: z.boolean().nullable().describe('Whether this is a current affairs/trending topic'),
    currentAffairsReason: z.string().nullable().describe('Why this was chosen based on trending signals'),
    searchQueries: z.array(z.string()).nullable().describe('Recommended search queries for further research'),
    sourceHints: z.array(z.string()).nullable().describe('Hints on where to find source material'),
    sourceUrls: z.array(z.string()).nullable().describe('Relevant URLs identified during generation'),
  }))
});

export class IdeaGeneratorAgent implements Agent {
  name = 'Idea Generator';
  description = 'Generates scroll-stopping content ideas using contrarian, results-focused, pain point, and transformation strategies';
  modelConfig: AIModelConfig = AI_MODELS.GOOGLE_FLASH;

  private getModelForPlatform(platform: string): AIModelConfig {
    const platformLower = platform.toLowerCase();
    if (platformLower === 'twitter' || platformLower === 'linkedin') {
      return AI_MODELS.GROK_REASONING;
    }
    return this.modelConfig;
  }

  async execute(context: AgentContext, onProgress?: ProgressCallback): Promise<IdeaGeneratorResult> {
    const { niche: strategy, platforms, currentAffairsEnabled, thirdPartyRuntime } = context;
    const { niche, subNiche, targetAudience, contentPillars, tone } = strategy;

    logger.info(`Starting idea generation for niche: ${niche}`, {
      subNiche,
      platforms,
      pillars: contentPillars
    }, thirdPartyRuntime);

    const strategies: Array<'contrarian' | 'results' | 'pain_point' | 'transformation'> = [
      'contrarian',
      'results',
      'pain_point',
      'transformation',
    ];

    const allIdeas: ContentIdea[] = [];
    const ideasPerStrategy = 10; // 10 per strategy = 40 total

    onProgress?.({
      phase: 'idea_generation',
      progress: 0,
      message: 'Starting idea generation',
      details: 'Preparing to generate 40 content ideas',
    });

    const currentAffairsBriefing = currentAffairsEnabled
      ? await this.buildCurrentAffairsBriefing(niche, contentPillars, thirdPartyRuntime, onProgress)
      : undefined;

    for (let strategyIndex = 0; strategyIndex < strategies.length; strategyIndex++) {
      const strategyName = strategies[strategyIndex];

      onProgress?.({
        phase: 'idea_generation',
        progress: (strategyIndex / strategies.length) * 45,
        message: `Generating ${strategyName.replace('_', ' ')} ideas`,
        details: `Strategy ${strategyIndex + 1}/4: Creating ${ideasPerStrategy} ideas`,
      });

      for (const platform of platforms) {
        const ideasForPlatform = Math.ceil(ideasPerStrategy / platforms.length);

        try {
          logger.phase('idea_generation', `Generating ${strategyName} ideas for ${platform}`, thirdPartyRuntime);

          const prompt = buildIdeaGenerationPrompt({
            niche,
            subNiche,
            targetAudience,
            platform,
            count: ideasForPlatform,
            strategy: strategyName,
            contentPillars,
            currentAffairsBriefing,
          });

          const modelToUse = this.getModelForPlatform(platform);
          const model = getModel(modelToUse);
          const structuredModel = model.withStructuredOutput(IdeasOutputSchema);

          const result = await structuredModel.invoke([
            {
              role: 'system',
              content: `You are an expert content strategist and viral growth expert. 
Your goal is to generate scroll-stopping content ideas for a creator with the following tone: ${tone}.

<expertise>
- Master of psychological triggers (curiosity, fear of missing out, desire for status)
- Expert in platform-specific algorithms (TikTok, Instagram, YouTube, LinkedIn)
- Specialist in "Hook-Story-Offer" framework
- Advanced understanding of niche-specific pain points and transformations
</expertise>

<constraints>
- Ideas must be highly specific, not generic
- Titles must be attention-grabbing but not clickbait (deliver on the promise)
- Keep descriptions concise but actionable
- Ensure a mix of formats (educational, entertaining, promotional)
</constraints>`
            },
            { role: 'user', content: prompt }
          ]);

          const ideas = result.ideas.map((idea: any, index: number) => ({
            id: `${platform}-${Date.now()}-${index}`,
            ...idea,
            platform: idea.platform || platform,
          })) as ContentIdea[];

          allIdeas.push(...ideas);

          logger.info(`Generated ${ideas.length} ideas for ${platform} (${strategyName})`, {}, thirdPartyRuntime);

          onProgress?.({
            phase: 'idea_generation',
            progress: ((strategyIndex * platforms.length + platforms.indexOf(platform) + 1) / (strategies.length * platforms.length)) * 45,
            message: `Generated ${allIdeas.length} ideas so far`,
            details: `${strategyName} strategy for ${platform}`,
          });
        } catch (error) {
          logger.error(`Error generating ideas for ${platform} with ${strategyName} strategy`, error, thirdPartyRuntime);
        }
      }
    }

    const platformDistribution = this.calculatePlatformDistribution(allIdeas);

    logger.info('Idea generation complete', {
      totalGenerated: allIdeas.length,
      distribution: platformDistribution
    }, thirdPartyRuntime);

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

  private calculatePlatformDistribution(ideas: ContentIdea[]): Record<string, number> {
    const distribution: Record<string, number> = {};
    ideas.forEach(idea => {
      distribution[idea.platform] = (distribution[idea.platform] || 0) + 1;
    });
    return distribution;
  }

  private async buildCurrentAffairsBriefing(
    niche: string,
    contentPillars: string[],
    thirdPartyRuntime?: boolean,
    onProgress?: ProgressCallback
  ): Promise<string> {
    onProgress?.({
      phase: 'idea_generation',
      progress: 2,
      message: 'Scanning recent news for current affairs',
      details: 'Gathering topical signals for idea generation',
    });

    logger.phase('research', `Scanning news for niche: ${niche}`, thirdPartyRuntime);

    const queries = this.buildCurrentAffairsQueries(niche, contentPillars);

    const results = await Promise.all(
      queries.map(async (query) => {
        try {
          const response = await tavilySearch(query, {
            searchDepth: 'advanced',
            topic: 'news',
            timeRange: 'week',
            maxResults: 5,
            includeAnswer: false,
            includeRawContent: false,
          });
          return {
            query,
            results: response.results || [],
          };
        } catch (error) {
          logger.warn(`Tavily search failed for query: ${query}`, error, thirdPartyRuntime);
          return { query, results: [] as any[] };
        }
      })
    );

    const lines: string[] = [];
    for (const entry of results) {
      if (entry.results.length === 0) continue;
      lines.push(`Query: ${entry.query}`);
      entry.results.slice(0, 4).forEach((result) => {
        lines.push(
          `- ${result.title} (${result.url})${result.publishedDate ? ` [${result.publishedDate}]` : ''}`
        );
      });
    }

    return lines.join('\n');
  }

  private buildCurrentAffairsQueries(niche: string, contentPillars: string[]): string[] {
    const queries: string[] = [];
    queries.push(`latest news in ${niche}`);
    const pillarQueries = contentPillars.slice(0, 2).map((pillar) => `${pillar} ${niche} news`);
    queries.push(...pillarQueries);
    return queries;
  }
}
