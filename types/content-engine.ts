export type ItemStatus = 'idea' | 'in_progress' | 'ready' | 'published';

export type ViewMode = 'board' | 'list';

export type Platform = 'youtube' | 'instagram' | 'tiktok' | 'twitter' | 'linkedin' | 'facebook';

export interface ItemContent {
  hook_suggestion?: string;
  script_content?: string;
  cta_suggestion?: string;
  hashtags?: string[];
  clip_suggestions?: string[];
  caption?: string;
}

export interface ContentItem {
  id: string;
  plan_id: string;
  user_id: string;
  title: string;
  description: string | null;
  platform: Platform;
  scheduled_date: string;
  status: ItemStatus;
  content: ItemContent;
  position: number;
  created_at: string;
  updated_at: string;
}

export interface ContentPlan {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  start_date: string;
  end_date: string;
  platforms: Platform[];
  is_active: boolean;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface PlanConfig {
  title?: string;
  startDate: Date;
  platforms: Platform[];
  frequency: string;
}

export interface ContentItemFormData {
  title: string;
  description?: string;
  platform: Platform;
  scheduled_date: Date;
  status: ItemStatus;
  content: ItemContent;
}

export interface GeneratePlanFormData {
  title?: string;
  start_date: Date;
  platforms: Platform[];
}

export interface PlanStats {
  total: number;
  idea: number;
  in_progress: number;
  ready: number;
  published: number;
  upcoming: number;
}
