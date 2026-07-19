'use client';

import {
  useSignIn,
  useSignUp,
} from '@clerk/nextjs/legacy';
import { useAuth as useClerkAuthHook, useClerk } from '@clerk/nextjs';
import { logger } from '@/lib/logger';

const log = logger.child({ module: 'hooks/use-clerk-auth' });

export function useAuth() {
  const auth = useClerkAuthHook();

  log.debug('Resolved Clerk authentication state', {
    userId: auth.userId || 'signed_out',
    action: 'resolve_auth_state',
    isLoaded: auth.isLoaded,
  });

  return auth;
}

export function useSessionActions() {
  const clerk = useClerk();

  log.debug('Resolved Clerk session actions', {
    userId: clerk.user?.id || 'signed_out',
    action: 'resolve_session_actions',
  });

  return clerk;
}

export function usePasswordSignIn() {
  const { isLoaded, signIn, setActive } = useSignIn();

  const signInWithPassword = async (email: string, password: string) => {
    if (!isLoaded || !signIn) {
      throw new Error('Authentication is still loading');
    }

    log.info('Attempting Clerk password sign-in', {
      userId: 'signed_out',
      action: 'password_sign_in',
      email,
    });

    const result = await signIn.create({ identifier: email, password });
    if (result.status !== 'complete' || !result.createdSessionId) {
      throw new Error('Additional sign-in verification is required');
    }

    await setActive({ session: result.createdSessionId });
    log.info('Completed Clerk password sign-in', {
      userId: 'resolved_after_session_activation',
      action: 'password_sign_in',
    });

    return { userId: null, status: result.status };
  };

  return { isLoaded, signInWithPassword };
}

export function usePasswordSignUp() {
  const { isLoaded, signUp, setActive } = useSignUp();

  const signUpWithPassword = async (email: string, password: string) => {
    if (!isLoaded || !signUp) {
      throw new Error('Authentication is still loading');
    }

    log.info('Attempting Clerk password sign-up', {
      userId: 'signed_out',
      action: 'password_sign_up',
      email,
    });

    const result = await signUp.create({ emailAddress: email, password });
    if (result.status === 'complete' && result.createdSessionId) {
      await setActive({ session: result.createdSessionId });
      return { requiresVerification: false, userId: result.createdUserId };
    }

    await signUp.prepareEmailAddressVerification({ strategy: 'email_code' });
    return { requiresVerification: true, userId: result.createdUserId };
  };

  const verifyEmailCode = async (code: string) => {
    if (!isLoaded || !signUp) {
      throw new Error('Authentication is still loading');
    }

    const result = await signUp.attemptEmailAddressVerification({ code });
    if (result.status !== 'complete' || !result.createdSessionId) {
      throw new Error('Email verification is incomplete');
    }

    await setActive({ session: result.createdSessionId });
    log.info('Completed Clerk password sign-up', {
      userId: result.createdUserId || 'unknown',
      action: 'password_sign_up',
    });

    return { userId: result.createdUserId };
  };

  return { isLoaded, signUpWithPassword, verifyEmailCode };
}
