'use client';

import { useUser as useClerkUser } from '@clerk/nextjs';
import { logger } from '@/lib/logger';

const log = logger.child({ module: 'hooks/use-user' });

export interface User {
  name: string;
  email: string;
  avatar: string;
}

export function useUser() {
  const { user, isLoaded } = useClerkUser();
  const data: User | null = user
    ? {
        name: user.fullName || user.primaryEmailAddress?.emailAddress.split('@')[0] || 'User',
        email: user.primaryEmailAddress?.emailAddress || '',
        avatar: user.imageUrl,
      }
    : null;

  log.debug('Resolved current Clerk user', {
    userId: user?.id || 'signed_out',
    action: 'resolve_current_user',
    isLoaded,
  });

  return { data, isLoading: !isLoaded };
}
