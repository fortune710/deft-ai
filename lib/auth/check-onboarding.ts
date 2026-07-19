import 'server-only';

import { api } from '@/convex/_generated/api';
import { ConvexServerAuthError, getAuthenticatedConvexClient } from '@/lib/convex/server';
import { logger } from '@/lib/logger.server';

const log = logger.child({ module: 'lib/auth/check-onboarding' });

export async function checkOnboardingStatus(): Promise<{
  isCompleted: boolean;
  isAuthenticated: boolean;
}> {
  let userId = 'unknown';
  try {
    const authenticated = await getAuthenticatedConvexClient('check_onboarding_status');
    userId = authenticated.userId;
    const profile = await authenticated.convex.query(api.userContentProfiles.getCurrent, {});
    const isCompleted = Boolean(profile?.completed_at);
    log.debug('Checked onboarding status in Convex', {
      userId,
      action: 'check_onboarding_status',
      statusCode: 200,
      isCompleted,
    });
    return { isCompleted, isAuthenticated: true };
  } catch (error) {
    const isUnauthenticated = error instanceof ConvexServerAuthError && error.statusCode === 401;
    log.error('Failed to check onboarding status in Convex', {
      userId: isUnauthenticated ? 'signed_out' : userId,
      action: 'check_onboarding_status',
      statusCode: error instanceof ConvexServerAuthError ? error.statusCode : 500,
      error,
    });
    return { isCompleted: false, isAuthenticated: !isUnauthenticated };
  }
}
