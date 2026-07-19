'use server';

import { auth } from '@clerk/nextjs/server';
import { ConvexHttpClient } from 'convex/browser';

import { api } from '@/convex/_generated/api';
import { logger } from '@/lib/logger.server';
import { completeOnboardingSchema } from '@/lib/validations/onboarding/questions';
import type { OnboardingFormData } from '@/types/niche-mapping';

const log = logger.child({ module: 'app/actions/onboarding' });

async function getAuthenticatedConvexClient(action: string) {
  const { userId, getToken, sessionClaims } = await auth();
  if (!userId) {
    log.warn('Clerk authentication is required for onboarding', {
      userId: 'signed_out',
      action,
      statusCode: 401,
    });
    throw new Error('Not authenticated. Please sign in again.');
  }

  const convexUrl = process.env.CONVEX_URL || process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!convexUrl) {
    log.error('Convex URL is missing for onboarding', {
      userId,
      action,
      statusCode: 500,
    });
    throw new Error('Convex configuration is missing');
  }

  const audience = sessionClaims?.aud;
  const usesConvexIntegration = audience === 'convex' || (Array.isArray(audience) && audience.includes('convex'));
  let token: string | null;

  try {
    token = usesConvexIntegration
      ? await getToken()
      : await getToken({ template: 'convex' });
  } catch (error) {
    const isMissingTemplate =
      error instanceof Error &&
      ('errors' in error
        ? JSON.stringify(error.errors).includes('JWT template not found')
        : error.message.includes('JWT template'));

    log.error('Unable to create Clerk token for Convex', {
      userId,
      action,
      statusCode: isMissingTemplate ? 503 : 401,
      tokenStrategy: usesConvexIntegration ? 'session_token' : 'jwt_template',
      error,
    });

    if (isMissingTemplate) {
      throw new Error(
        'Clerk Convex authentication is not configured. Activate the Convex integration in the Clerk Dashboard.',
      );
    }
    throw error;
  }

  if (!token) {
    log.error('Clerk Convex token is unavailable', {
      userId,
      action,
      statusCode: 401,
    });
    throw new Error('Unable to authenticate with Convex');
  }

  const convex = new ConvexHttpClient(convexUrl);
  convex.setAuth(token);
  log.debug('Created authenticated Convex onboarding client', {
    userId,
    action,
    statusCode: 200,
    tokenStrategy: usesConvexIntegration ? 'session_token' : 'jwt_template',
  });
  return { convex, userId };
}

export async function saveContentProfile(data: OnboardingFormData) {
  const action = 'upsert_onboarding_profile';
  let userId = 'unknown';

  try {
    const validatedData = completeOnboardingSchema.parse(data);
    const authenticated = await getAuthenticatedConvexClient(action);
    userId = authenticated.userId;

    const profile = await authenticated.convex.mutation(api.userContentProfiles.upsertCurrent, {
      question_1_niche: validatedData.question_1_niche,
      question_2_goal: validatedData.question_2_goal,
      question_3_platforms: validatedData.question_3_platforms,
      question_4_experience: validatedData.question_4_experience,
      question_5_frequency: validatedData.question_5_frequency,
    });

    log.info('Saved onboarding profile to Convex', {
      userId,
      action,
      statusCode: 200,
      profileId: profile?._id,
    });
    return { success: true, profile };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    log.error('Failed to save onboarding profile to Convex', {
      userId,
      action,
      statusCode: message.includes('authenticated') ? 401 : 500,
      error,
      message,
    });
    return { success: false, error: message, profile: null };
  }
}

export async function getContentProfile() {
  const action = 'get_onboarding_profile';
  let userId = 'unknown';

  try {
    const authenticated = await getAuthenticatedConvexClient(action);
    userId = authenticated.userId;
    const profile = await authenticated.convex.query(api.userContentProfiles.getCurrent, {});

    log.info('Fetched onboarding profile from Convex', {
      userId,
      action,
      statusCode: 200,
      hasProfile: Boolean(profile),
    });
    return { success: true, profile };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    log.error('Failed to fetch onboarding profile from Convex', {
      userId,
      action,
      statusCode: message.includes('authenticated') ? 401 : 500,
      error,
      message,
    });
    return { success: false, profile: null, error: message };
  }
}

export async function updateAIContext(aiStrategy: unknown) {
  const action = 'update_onboarding_niche';
  let userId = 'unknown';

  try {
    const authenticated = await getAuthenticatedConvexClient(action);
    userId = authenticated.userId;
    await authenticated.convex.mutation(api.userContentProfiles.updateCurrentNiche, {
      question_1_niche: aiStrategy,
    });

    log.info('Updated onboarding niche in Convex', {
      userId,
      action,
      statusCode: 200,
    });
    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    log.error('Failed to update onboarding niche in Convex', {
      userId,
      action,
      statusCode: message.includes('authenticated') ? 401 : 500,
      error,
      message,
    });
    return { success: false, error: message };
  }
}
