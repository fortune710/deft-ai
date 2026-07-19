'use client';

import { useQuery } from 'convex/react';
import type { Id } from '@/convex/_generated/dataModel';
import { api } from '@/convex/_generated/api';
import { useAuth } from '@/hooks/use-clerk-auth';
import { logger } from '@/lib/logger';

const log = logger.child({ module: 'hooks/use-file-url' });

export function useFileUrl(storageId: string | null | undefined) {
  const { userId } = useAuth();
  const isConvexStorageId = Boolean(storageId && !storageId.includes('/'));
  const url = useQuery(
    api.fileStorage.getUrl,
    userId && isConvexStorageId ? { storageId: storageId as Id<'_storage'> } : 'skip',
  );
  log.debug('Resolved Convex file URL', {
    userId: userId || 'signed_out',
    action: 'resolve_file_url',
    hasStorageId: Boolean(storageId),
  });
  return url ?? null;
}
