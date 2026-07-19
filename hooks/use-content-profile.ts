'use client';

import { useConvexAuth, useQuery as useConvexQuery } from 'convex/react';

import { api } from '@/convex/_generated/api';
import type { Doc } from '@/convex/_generated/dataModel';
import { useAuth } from '@/hooks/use-clerk-auth';
import { logger } from '@/lib/logger';
import type { UserContentProfile } from '@/types/niche-mapping';

const log = logger.child({ module: 'hooks/use-content-profile' });

function toContentProfile(
  document: Doc<'user_content_profile'>,
): UserContentProfile {
  log.debug('Mapping Convex content profile', {
    userId: document.user_id,
    action: 'map_content_profile',
    profileId: document._id,
  });

  return {
    id: document._id,
    user_id: document.user_id,
    question_1_niche: document.question_1_niche,
    question_2_goal: document.question_2_goal ?? null,
    question_3_platforms: document.question_3_platforms,
    question_4_experience: document.question_4_experience ?? null,
    question_5_frequency: document.question_5_frequency ?? null,
    completed_at: document.completed_at ?? null,
    created_at: document.created_at ?? new Date(document._creationTime).toISOString(),
    updated_at: document.updated_at ?? new Date(document._creationTime).toISOString(),
  };
}

export function useContentProfile() {
  const { userId, isLoaded } = useAuth();
  const { isAuthenticated: isConvexAuthenticated, isLoading: isConvexAuthLoading } = useConvexAuth();
  const document = useConvexQuery(
    api.userContentProfiles.getCurrent,
    userId && isConvexAuthenticated ? {} : 'skip',
  );
  const profile = document ? toContentProfile(document) : null;
  const isLoading =
    !isLoaded ||
    isConvexAuthLoading ||
    (Boolean(userId) && isConvexAuthenticated && document === undefined);

  log.debug('Resolved Convex content profile query', {
    userId: userId || 'signed_out',
    action: 'fetch_content_profile',
    isLoading,
    hasProfile: Boolean(profile),
    isConvexAuthenticated,
  });

  const refreshProfile = () => {
    log.debug('Skipped manual content profile refresh because Convex is realtime', {
      userId: userId || 'signed_out',
      action: 'refresh_content_profile',
    });
  };

  return {
    profile,
    isLoading,
    error: null,
    refreshProfile,
  };
}
