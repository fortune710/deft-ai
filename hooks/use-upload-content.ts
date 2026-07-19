'use client';

import { useMutation } from '@tanstack/react-query';
import { useMutation as useConvexMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import type { ContentUploadRequest, ContentUploadResponse } from '@/types/content-analytics';
import { trackEvent } from '@/lib/posthog/track';
import { useAuth } from '@/hooks/use-clerk-auth';
import { logger } from '@/lib/logger';

const log = logger.child({ module: 'hooks/use-upload-content' });

export function useUploadContent() {
  const { userId } = useAuth();
  const generateUploadUrl = useConvexMutation(api.fileStorage.generateUploadUrl);

  log.debug('Prepared Convex content upload', {
    userId: userId || 'signed_out',
    action: 'prepare_content_upload',
  });

  return useMutation({
    mutationFn: async (data: ContentUploadRequest & { file?: File }): Promise<ContentUploadResponse> => {
      if (!userId) throw new Error('Unauthorized');
      trackEvent('content_upload_attempt', { userId });

      let videoStorageId: string | null = null;
      if (data.content_type === 'video' && data.file) {
        const uploadUrl = await generateUploadUrl({});
        const uploadResponse = await fetch(uploadUrl, {
          method: 'POST',
          headers: { 'Content-Type': data.file.type || 'application/octet-stream' },
          body: data.file,
        });
        if (!uploadResponse.ok) throw new Error('Failed to upload video to Convex');
        ({ storageId: videoStorageId } = await uploadResponse.json());
      }

      const response = await fetch('/api/content/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content_type: data.content_type,
          platform: data.platform,
          user_id: userId,
          video_url: data.video_url || null,
          video_storage_id: videoStorageId,
          content_text: data.content_text || null,
        }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to upload content');
      }
      return response.json();
    },
  });
}
