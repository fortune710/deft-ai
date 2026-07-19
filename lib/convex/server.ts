import 'server-only';

import { auth } from '@clerk/nextjs/server';
import { ConvexHttpClient } from 'convex/browser';

import type { Doc } from '@/convex/_generated/dataModel';
import { logger } from '@/lib/logger.server';
import type { UserContentProfile } from '@/types/niche-mapping';

const log = logger.child({ module: 'lib/convex/server' });

export class ConvexServerAuthError extends Error {
  statusCode: number;

  constructor(message: string, statusCode: number) {
    super(message);
    this.name = 'ConvexServerAuthError';
    this.statusCode = statusCode;
  }
}

export async function getAuthenticatedConvexClient(action: string) {
  const { userId, getToken, sessionClaims } = await auth();
  if (!userId) {
    log.warn('Clerk authentication is required for Convex API access', {
      userId: 'signed_out',
      action,
      statusCode: 401,
    });
    throw new ConvexServerAuthError('Unauthorized', 401);
  }

  const convexUrl = process.env.CONVEX_URL || process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!convexUrl) {
    log.error('Convex URL is missing for API access', {
      userId,
      action,
      statusCode: 500,
    });
    throw new ConvexServerAuthError('Convex configuration is missing', 500);
  }

  const audience = sessionClaims?.aud;
  const usesConvexIntegration =
    audience === 'convex' || (Array.isArray(audience) && audience.includes('convex'));

  let token: string | null;
  try {
    token = usesConvexIntegration
      ? await getToken()
      : await getToken({ template: 'convex' });
  } catch (error) {
    const details = error instanceof Error && 'errors' in error ? JSON.stringify(error.errors) : '';
    const missingTemplate = details.includes('JWT template not found');
    log.error('Failed to create Clerk token for Convex API access', {
      userId,
      action,
      statusCode: missingTemplate ? 503 : 401,
      tokenStrategy: usesConvexIntegration ? 'session_token' : 'jwt_template',
      error,
    });
    throw new ConvexServerAuthError(
      missingTemplate
        ? 'Clerk Convex authentication is not configured'
        : 'Unable to authenticate with Convex',
      missingTemplate ? 503 : 401,
    );
  }

  if (!token) {
    log.error('Clerk returned no Convex token', {
      userId,
      action,
      statusCode: 401,
      tokenStrategy: usesConvexIntegration ? 'session_token' : 'jwt_template',
    });
    throw new ConvexServerAuthError('Unable to authenticate with Convex', 401);
  }

  const convex = new ConvexHttpClient(convexUrl);
  convex.setAuth(token);
  log.debug('Created authenticated Convex server client', {
    userId,
    action,
    statusCode: 200,
    tokenStrategy: usesConvexIntegration ? 'session_token' : 'jwt_template',
  });
  return { convex, userId };
}

export function toUserContentProfile(document: Doc<'user_content_profile'> | null): UserContentProfile | null {
  if (!document) {
    log.debug('No Convex user content profile to map', {
      userId: 'unknown',
      action: 'map_user_content_profile',
    });
    return null;
  }

  log.debug('Mapped Convex user content profile for API use', {
    userId: document.user_id,
    action: 'map_user_content_profile',
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
