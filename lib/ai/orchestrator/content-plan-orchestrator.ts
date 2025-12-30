import { AgentContext, AgentProgress } from '@/types/ai-agents';
import { IdeaGeneratorAgent } from '@/lib/ai/agents/idea-generator';
import { IdeaReviewerAgent } from '@/lib/ai/agents/idea-reviewer';
import { ContentGeneratorAgent } from '../agents/content-generator';
import { ItemStatus, Platform } from '@/types/content-engine';
import { createClient } from '@supabase/supabase-js';
import jwt from 'jsonwebtoken';

interface OrchestratorConfig {
  userId: string;
  planName: string;
  contentPillars: string[];
  platforms: string[];
  niche: string;
  subNiche?: string;
  targetAudience: string;
  tone?: string;
  goals?: string[];
}

interface OrchestratorProgress extends AgentProgress {
  agent?: string;
}

export class ContentPlanOrchestrator {
  private ideaGenerator: IdeaGeneratorAgent;
  private ideaReviewer: IdeaReviewerAgent;
  private contentGenerator: ContentGeneratorAgent;
  private onProgress?: (progress: OrchestratorProgress) => void;

  constructor(onProgress?: (progress: OrchestratorProgress) => void) {
    this.ideaGenerator = new IdeaGeneratorAgent();
    this.ideaReviewer = new IdeaReviewerAgent();
    this.contentGenerator = new ContentGeneratorAgent();
    this.onProgress = onProgress;
  }

  async execute(config: OrchestratorConfig): Promise<{ message: string, planId: string }> {
    this.reportProgress({
      phase: 'initialization',
      progress: 0,
      message: 'Initializing content generation',
      details: 'Analyzing your profile and preparing agents',
      agent: 'Orchestrator',
    });

    const context: AgentContext = {
      niche: config.niche,
      subNiche: config.subNiche,
      targetAudience: config.targetAudience,
      platforms: config.platforms,
      contentPillars: config.contentPillars,
      tone: config.tone,
      goals: config.goals,
    };

    this.reportProgress({
      phase: 'profile_analysis',
      progress: 5,
      message: 'Analyzing your niche and audience',
      details: `Niche: ${config.niche}, Audience: ${config.targetAudience}, Platforms: ${config.platforms.join(', ')}`,
      agent: 'Orchestrator',
    });

    this.reportProgress({
      phase: 'idea_generation',
      progress: 10,
      message: 'Starting Agent 1: Idea Generator',
      details: 'Generating 100 scroll-stopping content ideas',
      agent: 'Idea Generator',
    });

    const ideaResult = await this.ideaGenerator.execute(context, (progress) => {
      this.reportProgress({
        ...progress,
        agent: 'Idea Generator',
      });
    });

    this.reportProgress({
      phase: 'idea_generation_complete',
      progress: 45,
      message: `Generated ${ideaResult.totalGenerated} ideas`,
      details: Object.entries(ideaResult.platformDistribution)
        .map(([platform, count]) => `${platform}: ${count}`)
        .join(', '),
      agent: 'Idea Generator',
    });

    this.reportProgress({
      phase: 'idea_review',
      progress: 47,
      message: 'Starting Agent 2: Idea Reviewer',
      details: `Scoring and selecting best 30 from ${ideaResult.totalGenerated} ideas`,
      agent: 'Idea Reviewer',
    });

    const reviewResult = await this.ideaReviewer.execute(
      context,
      (progress) => {
        this.reportProgress({
          ...progress,
          agent: 'Idea Reviewer',
        });
      },
      ideaResult.ideas
    );

    this.reportProgress({
      phase: 'idea_review_complete',
      progress: 65,
      message: `Selected ${reviewResult.selectedIdeas.length} best ideas`,
      details: `Average score: ${reviewResult.averageScore.toFixed(1)}/50`,
      agent: 'Idea Reviewer',
    });

    this.reportProgress({
      phase: 'content_generation',
      progress: 67,
      message: 'Starting Agent 3: Content Generator',
      details: 'Creating platform-specific content',
      agent: 'Content Generator',
    });

    const contentResult = await this.contentGenerator.execute(
      context,
      (progress) => {
        this.reportProgress({
          ...progress,
          agent: 'Content Generator',
        });
      },
      reviewResult.selectedIdeas
    );

    this.reportProgress({
      phase: 'content_generation_complete',
      progress: 95,
      message: `Generated ${contentResult.successCount} pieces of content`,
      details: `Success: ${contentResult.successCount}, Failed: ${contentResult.failedCount}`,
      agent: 'Content Generator',
    });

    this.reportProgress({
      phase: 'saving',
      progress: 96,
      message: 'Saving to database',
      details: 'Creating content plan and items',
      agent: 'Orchestrator',
    });

    const contentPlan = await this.saveToDatabase(
      config.userId,
      config.planName,
      contentResult.generatedContent,
      config.platforms
    );

    this.reportProgress({
      phase: 'complete',
      progress: 100,
      message: 'Content plan created successfully',
      details: `${contentResult.successCount} items ready to schedule`,
      agent: 'Orchestrator',
    });

    return contentPlan;
  }

  private reportProgress(progress: OrchestratorProgress): void {
    if (this.onProgress) {
      this.onProgress(progress);
    }
  }

  private getToken(userId: string): string {
    if (!userId) {
      throw new Error("User ID is required");
    }

    const jwtSecret = process.env.SUPABASE_JWT_SECRET!;
    if (!jwtSecret) {
      throw new Error("JWT secret is required");
    }
    
    // Important: Supabase Auth (GoTrue) validates the JWT `aud` claim.
    // If `aud` doesn't match (usually "authenticated"), you'll get:
    // "Token audience doesn't match request audience".
    const token = jwt.sign(
      {
        sub: userId,
        role: "authenticated",
      },
      jwtSecret,
      {
        expiresIn: "1h",
        audience: "authenticated",
        issuer: "supabase",
      }
    );
    return token;
  }

  private async saveToDatabase(
    userId: string,
    planName: string,
    generatedContent: any[],
    allowedPlatforms: string[]
  ): Promise<{ message: string, planId: string }> {
    // Filter content to only include specified platforms (safety check)
    const filteredContent = generatedContent.filter((content) =>
      allowedPlatforms.includes(content.platform?.toLowerCase())
    );

    if (filteredContent.length === 0) {
      throw new Error('No content generated for the specified platforms');
    }

    const plan = {
      user_id: userId,
      title: planName,
      is_active: true,
      start_date: filteredContent[0]?.scheduledDate || new Date(),
      end_date: filteredContent[filteredContent.length - 1]?.scheduledDate || new Date(),
      platforms: allowedPlatforms as Platform[],
      description: null,
      archived_at: null,
    }


    console.log('generatedContent', filteredContent);

    const items = filteredContent.map((content) => ({
      user_id: userId,
      title: content.idea.title,
      content: {
        script_content: content.content,
        hashtags: content.hashtags || [],
        metadata: content.metadata || {},
      },
      platform: content.platform,
      description: content.idea.description,
      status: 'idea' as ItemStatus,
      scheduled_date: content.scheduledDate.toISOString().split('T')[0],
      position: content?.position || 0,
    }));



    // Generate token for authenticated Supabase client
    const token = this.getToken(userId);

    // Create authenticated Supabase client
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error("Supabase configuration missing");
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
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

    // Verify the user
    const { 
      data: { user }, 
      error: authError 
    } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error("Error getting user from Supabase:", authError);
      throw new Error(`Unauthorized: ${authError?.message || 'User not found'}`);
    }

    // Archive existing active content plans for this user
    await supabase
      .from('content_plans')
      .update({
        is_active: false,
        archived_at: new Date().toISOString(),
      })
      .eq('user_id', userId)
      .eq('is_active', true);

    // Insert the new content plan
    const { data: contentPlanData, error: contentPlanError } = await supabase
      .from('content_plans')
      .insert({
        ...plan,
        user_id: userId,
      })
      .select()
      .single();

    if (contentPlanError || !contentPlanData) {
      throw new Error(`Failed to create content plan: ${contentPlanError?.message || 'Unknown error'}`);
    }

    // Insert all content items
    const { data: contentItemsData, error: contentItemsError } = await supabase
      .from('content_items')
      .insert(
        items.map((item) => ({
          ...item,
          plan_id: contentPlanData.id,
          user_id: userId,
        }))
      )
      .select();

    if (contentItemsError || !contentItemsData) {
      throw new Error(`Failed to create content items: ${contentItemsError?.message || 'Unknown error'}`);
    }

    return {
      message: 'Content plan and items created successfully',
      planId: contentPlanData.id,
    };
  }
}
