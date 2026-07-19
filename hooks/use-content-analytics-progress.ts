'use client';

import { useQuery } from 'convex/react';

import { api } from '@/convex/_generated/api';
import { useAuth } from '@/hooks/use-clerk-auth';
import { logger } from '@/lib/logger';
import type { ContentAnalyticsProgress } from '@/types/content-analytics';

const log = logger.child({ module: 'hooks/use-content-analytics-progress' });

export function useContentAnalyticsProgress() {
  const { userId } = useAuth();
  const document = useQuery(
    api.contentProgress.getCurrentContentAnalytics,
    userId ? {} : 'skip',
  );
  const progress: ContentAnalyticsProgress | null = document ? {
    id: document._id,
    analytics_id: document.analytics_id,
    user_id: document.user_id,
    status: document.status,
    current_step: document.current_step,
    progress_percentage: document.progress_percentage,
    message: document.message ?? null,
    retry_count: document.retry_count,
    max_retries: document.max_retries,
    priority: document.priority ?? undefined,
    started_at: document.started_at ?? null,
    completed_at: document.completed_at ?? null,
    created_at: document.created_at ?? new Date(document._creationTime).toISOString(),
  } : null;
  const isGenerating = progress !== null && progress.status !== 'completed' && progress.status !== 'failed';

  log.debug('Resolved Convex content analytics progress', {
    userId: userId || 'signed_out',
    action: 'fetch_content_analytics_progress',
    analyticsId: progress?.analytics_id,
    status: progress?.status,
    progress: progress?.progress_percentage,
  });
  return {
    progress,
    isGenerating,
    isLoading: Boolean(userId) && document === undefined,
  };
}
