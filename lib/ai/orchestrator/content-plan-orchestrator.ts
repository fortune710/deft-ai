import { IdeaGeneratorAgent } from '../agents/idea-generator';
import { ContentGeneratorAgent } from '../agents/content-generator';
import { TABLES } from '@/lib/supabase/constants';
import type { Platform, ItemStatus } from '@/types/content-engine';
import { logger } from '@/lib/logger';
import { AgentContext } from '@/types/ai-agents';
import { createClient } from '@supabase/supabase-js';
import jwt from "jsonwebtoken";
import { createProgress, upsertProgress } from '@/lib/api/content-engine-progress';

export interface OrchestratorConfig {
  userId: string;
  platforms: Platform[];
  thirdPartyRuntime?: boolean;
}

function getToken(userId: string) {
  if (!userId) {
    throw new Error("User ID is required");
  }

  const jwtSecret = process.env.SUPABASE_JWT_SECRET!;
  if (!jwtSecret) {
    throw new Error("JWT secret is required");
  }
  const token = jwt.sign(
    { sub: userId, role: "authenticated" },
    jwtSecret,
    { expiresIn: "1h", audience: "authenticated", issuer: "supabase" }
  );
  return token;
}

export class ContentPlanOrchestrator {
  private ideaAgent: IdeaGeneratorAgent;
  private contentAgent: ContentGeneratorAgent;
  log = logger.child({ module: ContentPlanOrchestrator });

  constructor() {
    this.ideaAgent = new IdeaGeneratorAgent();
    this.contentAgent = new ContentGeneratorAgent();
  }

  private createSupabaseClient(userId: string) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    let token = getToken(userId);
    return createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
      global: {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    });
  }


  async execute(config: OrchestratorConfig): Promise<{ message: string }> {
    const { userId, platforms, thirdPartyRuntime = false } = config;
    const supabase = this.createSupabaseClient(userId);

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

    this.log.info(`Profile fetched successfully for user ${userId}`, { profile }, thirdPartyRuntime);

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

    // 2. Generate Ideas (4 in dev, 40 in prod)
    const totalIdeasCount = process.env.NODE_ENV === 'development' ? 4 : 40;
    logger.phase('idea_generation', `Generating ${totalIdeasCount} content ideas`, thirdPartyRuntime);
    const ideaResult = await this.ideaAgent.execute(context, (progress) => {
      upsertProgress(
        supabase,
        userId,
        progress.progress,
        progress.phase,
        progress.message
      )
    });
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
    const supabase = this.createSupabaseClient(userId);

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
        script_content: item.content, // New field
        content: {
          hook_suggestion: item.idea.hook,
          script_content: item.content, // Legacy field (keeping for compatibility)
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
