export interface Platform {
  name: string;
  isPrimary: boolean;
}

export interface AIContext {
  content_pillars: string[];
  mini_series_ideas: Array<{
    title: string;
    description: string;
    episode_count: number;
  }>;
  script_templates: {
    hooks: string[];
    structures: Array<{
      name: string;
      template: string;
    }>;
  };
  posting_cadence: {
    frequency: string;
    best_times: string[];
    consistency_tips: string[];
  };
  reference_creators: Array<{
    name: string;
    platform: string;
    why: string;
  }>;
  cta_strategies: Array<{
    type: string;
    examples: string[];
  }>;
  tone_guidance: {
    formality: 'casual' | 'professional' | 'mix';
    energy: 'high' | 'moderate' | 'calm';
    complexity: 'beginner-friendly' | 'intermediate' | 'advanced';
    voice_notes: string[];
  };
}

export interface OnboardingFormData {
  question_1_niche: string;
  question_2_goal: string;
  question_3_platforms: Platform[];
  question_4_experience: string;
  question_5_frequency: string;
}

export interface UserContentProfile {
  id: string;
  user_id: string;
  question_1_niche: string | null;
  question_2_goal: string | null;
  question_3_platforms: Platform[];
  question_4_experience: string | null;
  question_5_frequency: string | null;
  ai_context: AIContext | null;
  system_prompt: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export type GoalOption =
  | 'grow_audience'
  | 'get_engagement'
  | 'build_authority'
  | 'drive_traffic'
  | 'sell_product';

export type PlatformOption =
  | 'tiktok'
  | 'instagram'
  | 'youtube_shorts'
  | 'twitter'
  | 'linkedin';

export type ExperienceLevel =
  | 'complete_beginner'
  | 'some_experience'
  | 'experienced_creator';

export type PostingFrequency =
  | '1_2_per_week'
  | '3_4_per_week'
  | 'daily'
  | 'not_sure';
