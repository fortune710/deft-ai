export type Platform = 'youtube' | 'instagram' | 'tiktok' | 'twitter' | 'linkedin' | 'facebook';

export type ContentType = 'video' | 'text';

export type ProcessingStatus =
  | 'pending'
  | 'downloading'
  | 'extracting_audio'
  | 'transcribing'
  | 'analyzing'
  | 'extracting_thumbnail'
  | 'completed'
  | 'failed';

export type QueueStatus = 'pending' | 'processing' | 'completed' | 'failed';

export type ProcessingStep =
  | 'queued'
  | 'download'
  | 'extract_audio'
  | 'transcribe'
  | 'analyze'
  | 'extract_thumbnail'
  | 'completed';

export const SupabaseStoragePaths = {
  Video: 'tmp_videos',
  Thumbnails: 'thumbnails',
} as const;

export interface VideoMetrics {
  views: number;
  likes: number;
  comments: number;
  shares: number;
  engagement_rate: number;
  watch_time?: number;
  retention_rate?: number;
}

export interface HookAnalysis {
  score: number;
  strengths: string[];
  improvements: string[];
  transcript_excerpt?: string;
  text_excerpt?: string;
}

export interface CTAAnalysis {
  score: number;
  strengths: string[];
  improvements: string[];
  cta_text?: string;
  effectiveness_notes?: string;
}

export interface ContentQuality {
  score: number;
  highlights: string[];
  issues: string[];
  pacing_notes?: string;
  structure_notes?: string;
}

export interface RetentionTips {
  suggestions: string[];
  critical_moments?: string[];
  drop_off_predictions?: string[];
}

export interface ComparisonInsights {
  vs_user_average: {
    views_diff_percentage: number;
    engagement_diff_percentage: number;
    performance_trend: 'better' | 'average' | 'worse';
  };
  best_performing_comparison?: {
    video_id: string;
    title: string;
    what_worked: string[];
  };
}

export interface AIFeedback {
  overall_score: number;
  hook_analysis: HookAnalysis;
  cta_analysis: CTAAnalysis;
  content_quality: ContentQuality;
  retention_tips: RetentionTips;
  comparison_insights?: ComparisonInsights;
  next_video_recommendations: string[];
  generated_at: string;
}

export interface ContentAnalytics {
  id: string;
  user_id: string;
  video_url: string | null;
  platform: Platform;
  title: string;
  description: string;
  transcript: string | null;
  metrics: VideoMetrics | null;
  metrics_scraped: boolean;
  ai_feedback: AIFeedback | null;
  analysis_results: AIFeedback | null;
  content_type: ContentType;
  content_text: string | null;
  thumbnail_url: string | null;
  video_file_path: string | null;
  audio_file_path: string | null;
  model_file_reference: string | null;
  processing_status: ProcessingStatus;
  processing_error: string | null;
  created_at: string;
  expires_at: string;
  updated_at: string;
}

export interface ContentAnalyticsProgress {
  id: string;
  analytics_id: string;
  user_id: string;
  status: QueueStatus;
  current_step: ProcessingStep;
  progress_percentage: number;
  message: string | null;
  retry_count: number;
  max_retries: number;
  priority?: number;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
}

export interface VideoFeedbackHistory {
  id: string;
  user_id: string;
  video_id: string;
  feedback_generated_at: string;
  overall_score: number;
  hook_score?: number;
  content_score?: number;
  engagement_rate?: number;
  created_at: string;
}

export interface ContentUploadRequest {
  video_url?: string;
  content_text?: string;
  platform: Platform;
  content_type: ContentType;
  file?: File;
}

export interface ContentUploadResponse {
  analytics_id: string;
  job_id: string;
  message: string;
  requires_manual_metrics: boolean;
}

export interface MetricsScrapingResult {
  success: boolean;
  data?: VideoMetrics & {
    title?: string;
    description?: string;
  };
  error?: string;
  requires_manual_input: boolean;
}

export interface ProcessingJobStatus {
  job_id: string;
  analytics_id: string;
  status: QueueStatus;
  current_step: ProcessingStep;
  progress_percentage: number;
  message: string | null;
  content_data?: ContentAnalytics;
}

export interface TranscriptSegment {
  text: string;
  start_time: number;
  end_time: number;
  confidence?: number;
}

export interface VideoDownloadResult {
  success: boolean;
  file_path?: string;
  storage_path?: string;
  error?: string;
}

export interface AudioExtractionResult {
  success: boolean;
  storage_path?: string;
  error?: string;
}

export interface TranscriptionResult {
  success: boolean;
  transcript?: string;
  segments?: TranscriptSegment[];
  error?: string;
}

export interface FeedbackGenerationResult {
  success: boolean;
  feedback?: AIFeedback;
  error?: string;
}

export interface ThumbnailExtractionResult {
  success: boolean;
  thumbnail_url?: string;
  storage_path?: string;
  error?: string;
}

// Legacy type aliases for backward compatibility during migration
export type VideoAnalytics = ContentAnalytics;
export type VideoProcessingQueue = ContentAnalyticsProgress;
export type VideoUploadRequest = ContentUploadRequest;
export type VideoUploadResponse = ContentUploadResponse;
