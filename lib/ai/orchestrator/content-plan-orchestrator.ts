import { AgentContext, AgentProgress } from '@/types/ai-agents';
import { IdeaGeneratorAgent } from '../agents/idea-generator';
import { IdeaReviewerAgent } from '../agents/idea-reviewer';
import { ContentGeneratorAgent } from '../agents/content-generator';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { ContentPlan, ContentItem } from '@/types/content-engine';

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

  async execute(config: OrchestratorConfig): Promise<ContentPlan> {
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
      details: 'Generating 200+ scroll-stopping content ideas',
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
      contentResult.generatedContent
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

  private async saveToDatabase(
    userId: string,
    planName: string,
    generatedContent: any[]
  ): Promise<ContentPlan> {
    const supabase = await createServerSupabaseClient();

    const { data: plan, error: planError } = await supabase
      .from('content_plans')
      .insert({
        user_id: userId,
        name: planName,
        status: 'active',
        start_date: generatedContent[0]?.scheduledDate || new Date(),
        end_date: generatedContent[generatedContent.length - 1]?.scheduledDate || new Date(),
      })
      .select()
      .single();

    if (planError || !plan) {
      throw new Error(`Failed to create content plan: ${planError?.message}`);
    }

    const items = generatedContent.map((content) => ({
      plan_id: plan.id,
      title: content.idea.title,
      content: content.content,
      platform: content.platform,
      content_pillar: content.idea.contentPillar,
      status: 'draft' as const,
      scheduled_date: content.scheduledDate.toISOString(),
      hashtags: content.hashtags || [],
    }));

    const { data: contentItems, error: itemsError } = await supabase
      .from('content_items')
      .insert(items)
      .select();

    if (itemsError) {
      console.error('Error creating content items:', itemsError);
      throw new Error(`Failed to create content items: ${itemsError.message}`);
    }

    return {
      ...plan,
      items: contentItems as ContentItem[],
    };
  }
}
