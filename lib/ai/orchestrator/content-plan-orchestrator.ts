import { IdeaGeneratorAgent } from '../agents/idea-generator';
import { ContentGeneratorAgent } from '../agents/content-generator';
import type { Platform, ItemStatus } from '@/types/content-engine';
import { logger } from '@/lib/logger.server';
import { AgentContext } from '@/types/ai-agents';
import { ConvexHttpClient } from 'convex/browser';
import { api } from '@/convex/_generated/api';

export interface OrchestratorConfig {
  userId: string;
  platforms: Platform[];
  thirdPartyRuntime?: boolean;
  onProgress?: (progress: number, stage: string, message: string) => Promise<void>;
}

export class ContentPlanOrchestrator {
  private ideaAgent: IdeaGeneratorAgent;
  private contentAgent: ContentGeneratorAgent;
  log = logger.child({ module: ContentPlanOrchestrator });

  constructor() {
    this.ideaAgent = new IdeaGeneratorAgent();
    this.contentAgent = new ContentGeneratorAgent();
  }

  private createConvexClient(userId: string) {
    const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
    if (!convexUrl) {
      this.log.error('Convex URL is not configured', {
        userId,
        action: 'create_convex_client',
      });
      throw new Error('NEXT_PUBLIC_CONVEX_URL is not configured');
    }
    const convex = new ConvexHttpClient(convexUrl);
    this.log.debug('Created authenticated Convex client', {
      userId,
      action: 'create_convex_client',
    });
    return convex;
  }


  async execute(config: OrchestratorConfig): Promise<{ message: string }> {
    const { userId, platforms, thirdPartyRuntime = false, onProgress } = config;
    const convex = this.createConvexClient(userId);
    const workerSecret = process.env.TRIGGER_CONVEX_SECRET;
    if (!workerSecret) throw new Error('TRIGGER_CONVEX_SECRET is not configured');

    logger.info(`Orchestrator started for user: ${userId}`, {
      userId,
      action: 'generate_content_plan',
      platforms,
    }, thirdPartyRuntime);

    // 1. Fetch user profile
    await onProgress?.(10, 'initialization', 'Loading your content profile');
    logger.phase('initialization', 'Fetching user content profile', thirdPartyRuntime);
    const profile = await convex.query(api.triggerWorkers.getProfile, { workerSecret, userId });

    if (!profile) {
      const msg = 'Failed to fetch profile: Not found';
      logger.error(msg, {}, thirdPartyRuntime);
      throw new Error(msg);
    }

    this.log.info(`Profile fetched successfully for user ${userId}`, { profile }, thirdPartyRuntime);

    // Map profile to AgentContext
    const context: AgentContext = {
      userId,
      niche: profile.question_1_niche,
      goal: profile.question_2_goal ?? null,
      platforms: platforms as string[],
      experience: profile.question_4_experience ?? null,
      frequency: profile.question_5_frequency ?? null,
      currentAffairsEnabled: profile.question_1_niche?.doesCurrentAffairs !== 'never',
      thirdPartyRuntime,
    };

    await onProgress?.(20, 'strategy', 'Preparing your content strategy');

    logger.info('Agent context prepared', {
      niche: context.niche.niche,
      currentAffairs: context.currentAffairsEnabled
    }, thirdPartyRuntime);

    // 2. Generate Ideas (4 in dev, 40 in prod)
    const totalIdeasCount = process.env.NODE_ENV === 'development' ? 4 : 40;
    await onProgress?.(30, 'idea_generation', 'Generating ideas tailored to your niche');
    logger.phase('idea_generation', `Generating ${totalIdeasCount} content ideas`, thirdPartyRuntime);
    const ideaResult = await this.ideaAgent.execute(context);
    const ideas = ideaResult.ideas;

    await onProgress?.(50, 'ideas_ready', `Generated ${ideas.length} ideas`);

    if (ideas.length === 0) {
      logger.warn('No ideas were generated', {}, thirdPartyRuntime);
      return { message: 'Zero ideas generated. Check logs.' };
    }

    // 3. Generate Content for each idea
    logger.phase('content_generation', `Generating content for ${ideas.length} ideas`, thirdPartyRuntime);
    await onProgress?.(60, 'content_generation', 'Drafting scripts, hooks, and captions');
    const contentItems = await this.contentAgent.execute(context, undefined, ideas);

    await onProgress?.(85, 'content_ready', 'Polishing generated content');

    // 4. Save to Database
    logger.phase('database', 'Saving generated content to database', thirdPartyRuntime);
    await onProgress?.(92, 'saving', 'Saving your content ideas');
    await this.saveToDatabase(userId, contentItems.generatedContent, thirdPartyRuntime);

    await onProgress?.(100, 'completed', 'Content ideas are ready');
    logger.info('Orchestration complete', {
      userId,
      action: 'generate_content_plan',
      generatedItemCount: contentItems.generatedContent.length,
    }, thirdPartyRuntime);
    return { message: `Successfully generated ${contentItems.generatedContent.length} content items.` };
  }

  private async saveToDatabase(userId: string, items: any[], thirdPartyRuntime: boolean) {
    const convex = this.createConvexClient(userId);
    const workerSecret = process.env.TRIGGER_CONVEX_SECRET;
    if (!workerSecret) throw new Error('TRIGGER_CONVEX_SECRET is not configured');

    logger.info(`Saving ${items.length} items to Convex content_items`, { userId, action: 'save_content_plan' }, thirdPartyRuntime);

    // Fetch existing logic to determine start date/positions if needed
    const existingItems = await convex.query(api.triggerWorkers.listContentItems, { workerSecret, userId });
    const lastPosition = existingItems.reduce((highest, item) => Math.max(highest, item.position), -1);

    const formattedItems = items.map((item, index) => {
      // Create a stable date based on the index if scheduledDate is missing
      const date = item.scheduledDate || new Date();
      const rawPlatform = String(item.platform || '').trim();
      const platformKey = rawPlatform.toLowerCase().replace(/[\s-]+/g, '_');
      const platformAliases: Record<string, Platform> = {
        youtube: 'youtube', youtube_shorts: 'youtube', shorts: 'youtube',
        instagram: 'instagram', instagram_reels: 'instagram', reels: 'instagram',
        tiktok: 'tiktok', twitter: 'twitter', x: 'twitter',
        linkedin: 'linkedin', facebook: 'facebook',
      };
      const platform = platformAliases[platformKey];
      if (!platform) {
        this.log.error('Generated content used an unsupported platform', {
          userId,
          action: 'normalize_content_plan_platform',
          platform: rawPlatform,
        }, thirdPartyRuntime);
        throw new Error(`Unsupported generated content platform: ${rawPlatform || 'empty'}`);
      }
      if (platform !== rawPlatform) {
        this.log.debug('Normalized generated content platform', {
          userId,
          action: 'normalize_content_plan_platform',
          inputPlatform: rawPlatform,
          platform,
        }, thirdPartyRuntime);
      }

      return {
        title: item.idea.title,
        description: item.idea.description,
        platform,
        status: 'idea' as ItemStatus,
        scheduled_date: date instanceof Date ? date.toISOString().split('T')[0] : date,
        position: lastPosition + index + 1,
        script_content: item.content, // New field
        content: {
          hook_suggestion: item.idea.hook,
          script_content: item.content, // Legacy field (keeping for compatibility)
          hashtags: item.hashtags,
          metadata: item.metadata,
        },
      };
    });

    await convex.mutation(api.triggerWorkers.createContentItems, { workerSecret, userId, items: formattedItems });

    logger.info('Database save successful', {}, thirdPartyRuntime);
  }
}
