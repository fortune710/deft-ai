import { IdeaGeneratorAgent } from '../agents/idea-generator';
import { ContentGeneratorAgent } from '../agents/content-generator';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { TABLES } from '@/lib/supabase/constants';
import type { Platform, ItemStatus } from '@/types/content-engine';
import { logger } from '@/lib/logger';
import { AgentContext } from '@/types/ai-agents';

export interface OrchestratorConfig {
  userId: string;
  platforms: Platform[];
  thirdPartyRuntime?: boolean;
}

export class ContentPlanOrchestrator {
  private ideaAgent: IdeaGeneratorAgent;
  private contentAgent: ContentGeneratorAgent;

  constructor() {
    this.ideaAgent = new IdeaGeneratorAgent();
    this.contentAgent = new ContentGeneratorAgent();
  }

  async execute(config: OrchestratorConfig): Promise<{ message: string }> {
    const { userId, platforms, thirdPartyRuntime = false } = config;
    const supabase = await createServerSupabaseClient();

    logger.info(`Orchestrator started for user: ${userId}`, { platforms }, thirdPartyRuntime);

    // 1. Fetch user profile
    logger.phase('initialization', 'Fetching user content profile', thirdPartyRuntime);
    const { data: profile, error: profileError } = await supabase
      .from(TABLES.USER_CONTENT_PROFILE)
      .select('*')
      .eq('user_id', userId)
      .single();

    if (profileError || !profile) {
      const msg = `Failed to fetch profile: ${profileError?.message || 'Not found'}`;
      logger.error(msg, {}, thirdPartyRuntime);
      throw new Error(msg);
    }

    // Map profile to AgentContext
    const context: AgentContext = {
      userId,
      niche: profile.question_1_niche,
      goal: profile.question_2_goal,
      platforms: platforms as string[],
      experience: profile.question_4_experience,
      frequency: profile.question_5_frequency,
      currentAffairsEnabled: profile.question_1_niche?.doesCurrentAffairs !== 'never',
      thirdPartyRuntime,
    };

    logger.info('Agent context prepared', {
      niche: context.niche.niche,
      currentAffairs: context.currentAffairsEnabled
    }, thirdPartyRuntime);

    // 2. Generate Ideas (exactly 40)
    logger.phase('idea_generation', 'Generating 40 content ideas', thirdPartyRuntime);
    const ideaResult = await this.ideaAgent.execute(context);
    const ideas = ideaResult.ideas;

    if (ideas.length === 0) {
      logger.warn('No ideas were generated', {}, thirdPartyRuntime);
      return { message: 'Zero ideas generated. Check logs.' };
    }

    // 3. Generate Content for each idea
    logger.phase('content_generation', `Generating content for ${ideas.length} ideas`, thirdPartyRuntime);
    const contentItems = await this.contentAgent.execute(context, undefined, ideas);

    // 4. Save to Database
    logger.phase('database', 'Saving generated content to database', thirdPartyRuntime);
    await this.saveToDatabase(userId, contentItems.generatedContent, thirdPartyRuntime);

    logger.info('Orchestration complete', {}, thirdPartyRuntime);
    return { message: `Successfully generated ${contentItems.generatedContent.length} content items.` };
  }

  private async saveToDatabase(userId: string, items: any[], thirdPartyRuntime: boolean) {
    const supabase = await createServerSupabaseClient();

    logger.info(`Saving ${items.length} items to ${TABLES.CONTENT_ITEMS}`, {}, thirdPartyRuntime);

    // Fetch existing logic to determine start date/positions if needed
    const { data: existingItems } = await supabase
      .from(TABLES.CONTENT_ITEMS)
      .select('scheduled_date, position')
      .eq('user_id', userId)
      .order('scheduled_date', { ascending: false })
      .limit(1);

    const lastPosition = existingItems?.[0]?.position ?? -1;

    const formattedItems = items.map((item, index) => {
      // Create a stable date based on the index if scheduledDate is missing
      const date = item.scheduledDate || new Date();

      return {
        user_id: userId,
        title: item.idea.title,
        description: item.idea.description,
        platform: item.platform,
        status: 'idea' as ItemStatus,
        scheduled_date: date instanceof Date ? date.toISOString().split('T')[0] : date,
        position: lastPosition + index + 1,
        content: {
          hook_suggestion: item.idea.hook,
          script_content: item.content,
          hashtags: item.hashtags,
          metadata: item.metadata,
        },
      };
    });

    const { error } = await supabase
      .from(TABLES.CONTENT_ITEMS)
      .insert(formattedItems);

    if (error) {
      logger.error('Failed to save content items', error, thirdPartyRuntime);
      throw new Error(`Failed to save content items: ${error.message}`);
    }

    logger.info('Database save successful', {}, thirdPartyRuntime);
  }
}
