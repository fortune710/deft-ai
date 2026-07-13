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

export interface ContentItem {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  platform: Platform;
  scheduled_date: string;
  status: ItemStatus;
  content: ItemContent;
  script_content: string | null;
  position: number;
  created_at: string;
  updated_at: string;
}

export interface ContentItemFormData {
  title: string;
  description?: string;
  platform: Platform;
  scheduled_date: Date;
  status: ItemStatus;
  content: ItemContent;
}

type TContentItem = Omit<ContentItem, 'id' | 'created_at' | 'updated_at'>;

export interface PublishPlanPayload {
  contentItems: TContentItem[];
  userId: string;
}
