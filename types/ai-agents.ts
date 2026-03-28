import { AIModelConfig } from './ai-models';
import { DetailedNiche } from './niche-agent';

export interface AgentContext {
  userId: string;
  niche: DetailedNiche;
  goal: string | null;
  platforms: string[];
  experience: string | null;
  frequency: string | null;
  currentAffairsEnabled?: boolean;
  thirdPartyRuntime?: boolean; // True when running in Trigger.dev context
}

export interface ContentIdea {
  id: string;
  platform: string;
  title: string;
  description: string;
  contentPillar: string;
  hook?: string;
  isCurrentAffairs?: boolean;
  currentAffairsReason?: string;
  searchQueries?: string[];
  sourceHints?: string[];
  sourceUrls?: string[];
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
    researchSummary?: string;
    researchSources?: Array<{
      title: string;
      url: string;
      favicon?: string;
    }>;
    isCurrentAffairs?: boolean;
    currentAffairsReason?: string;
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
