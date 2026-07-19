'use client';

import { useQuery } from 'convex/react';

import { api } from '@/convex/_generated/api';
import { useAuth } from '@/hooks/use-clerk-auth';
import { logger } from '@/lib/logger';
import type { ContentEngineProgress } from '@/types/content-engine';

const log = logger.child({ module: 'hooks/use-content-engine-progress' });

export function useContentEngineProgress() {
  const { userId } = useAuth();
  const document = useQuery(
    api.contentProgress.getCurrentContentEngine,
    userId ? {} : 'skip',
  );
  const progress: ContentEngineProgress | null = document ? {
    id: document._id,
    user_id: document.user_id,
    progress: document.progress,
    stage: document.stage,
    message: document.message ?? null,
    created_at: document.created_at ?? new Date(document._creationTime).toISOString(),
    updated_at: document.updated_at ?? new Date(document._creationTime).toISOString(),
  } : null;

  log.debug('Resolved Convex content engine progress', {
    userId: userId || 'signed_out',
    action: 'fetch_content_engine_progress',
    progress: progress?.progress,
    stage: progress?.stage,
  });
  return {
    progress,
    isGenerating: progress !== null,
    isLoading: Boolean(userId) && document === undefined,
  };
}
