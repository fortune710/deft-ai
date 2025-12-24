import { AIModelConfig } from './ai-models';

export interface AgentContext {
  niche: string;
  subNiche?: string;
  targetAudience: string;
  platforms: string[];
  contentPillars: string[];
  tone?: string;
  goals?: string[];
}

export interface ContentIdea {
  id: string;
  platform: string;
  title: string;
  description: string;
  contentPillar: string;
  engagementScore?: number;
  specificityScore?: number;
  contrarianScore?: number;
  resultsScore?: number;
  platformFitScore?: number;
  totalScore?: number;
  reasoning?: string;
}

export interface ScoredContentIdea extends ContentIdea {
  engagementScore: number;
  specificityScore: number;
  contrarianScore: number;
  resultsScore: number;
  platformFitScore: number;
  totalScore: number;
  reasoning: string;
}

export interface GeneratedContent {
  idea: ContentIdea;
  content: string;
  platform: string;
  scheduledDate: Date;
  hashtags?: string[];
  metadata?: {
    hookType?: string;
    structure?: string;
    callToAction?: string;
    visualCues?: string[];
    audioSuggestion?: string;
  };
}

export interface IdeaGeneratorResult {
  ideas: ContentIdea[];
  totalGenerated: number;
  platformDistribution: Record<string, number>;
}

export interface IdeaReviewerResult {
  selectedIdeas: ScoredContentIdea[];
  rejectedCount: number;
  averageScore: number;
  selectionReasoning: string;
}

export interface ContentGeneratorResult {
  generatedContent: GeneratedContent[];
  successCount: number;
  failedCount: number;
}

export interface AgentProgress {
  phase: string;
  progress: number;
  message: string;
  details?: string;
}

export type ProgressCallback = (progress: AgentProgress) => void;

export interface Agent {
  name: string;
  description: string;
  modelConfig: AIModelConfig;
  execute(context: AgentContext, onProgress?: ProgressCallback): Promise<unknown>;
}
