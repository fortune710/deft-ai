export type Platform = 'youtube' | 'instagram' | 'tiktok';

export type ProcessingStatus =
  | 'pending'
  | 'downloading'
  | 'extracting_audio'
  | 'transcribing'
  | 'analyzing'
  | 'completed'
  | 'failed';

export type QueueStatus = 'pending' | 'processing' | 'completed' | 'failed';

export type ProcessingStep =
  | 'queued'
  | 'download'
  | 'extract_audio'
  | 'transcribe'
  | 'analyze'
  | 'completed';

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
  transcript_excerpt: string;
}

export interface ContentQuality {
  score: number;
  highlights: string[];
  issues: string[];
  pacing_notes: string;
}

export interface RetentionTips {
  suggestions: string[];
  critical_moments: string[];
  drop_off_predictions: string[];
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
  content_quality: ContentQuality;
  retention_tips: RetentionTips;
  comparison_insights?: ComparisonInsights;
  next_video_recommendations: string[];
  generated_at: string;
}

export interface VideoAnalytics {
  id: string;
  user_id: string;
  video_url: string;
  platform: Platform;
  title: string;
  description: string;
  transcript: string;
  metrics: VideoMetrics;
  metrics_scraped: boolean;
  ai_feedback: AIFeedback | null;
  video_file_path: string | null;
  audio_file_path: string | null;
  processing_status: ProcessingStatus;
  processing_error: string | null;
  created_at: string;
  expires_at: string;
  updated_at: string;
}

export interface VideoProcessingQueue {
  id: string;
  video_id: string;
  user_id: string;
  status: QueueStatus;
  current_step: ProcessingStep;
  progress_percentage: number;
  error_message: string | null;
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

export interface VideoUploadRequest {
  video_url: string;
  platform?: Platform;
}

export interface VideoUploadResponse {
  video_id: string;
  job_id: string;
  message: string;
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
  video_id: string;
  status: QueueStatus;
  current_step: ProcessingStep;
  progress_percentage: number;
  error_message: string | null;
  video_data?: VideoAnalytics;
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
  audio_path?: string;
  storage_path?: string;
  duration_seconds?: number;
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
