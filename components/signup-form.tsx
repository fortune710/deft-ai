'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Loader2 } from 'lucide-react';
import Link from 'next/link';
import { trackEvent, identifyUser } from '@/lib/posthog/track';
import { usePasswordSignUp } from '@/hooks/use-clerk-auth';
import { logger } from '@/lib/logger';

const log = logger.child({ module: 'components/signup-form' });

export function SignupForm({
  className,
  ...props
}: React.ComponentProps<'div'>) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [requiresVerification, setRequiresVerification] = useState(false);
  const { isLoaded, signUpWithPassword, verifyEmailCode } = usePasswordSignUp();

  log.debug('Rendering custom sign-up form', {
    userId: 'signed_out',
    action: 'render_sign_up_form',
    requiresVerification,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      setIsLoading(false);
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters long');
      setIsLoading(false);
      return;
    }

    try {
      const result = await signUpWithPassword(email, password);
      if (result.requiresVerification) {
        setRequiresVerification(true);
        return;
      }

      const userId = result.userId || email;
      identifyUser(userId, { email });
      trackEvent('user_signed_up', { userId, email });
      router.push('/onboarding');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to create account';
      log.error('Clerk password sign-up failed', {
        userId: 'signed_out',
        action: 'password_sign_up',
        error: err,
        message,
      });
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const result = await verifyEmailCode(verificationCode);
      const userId = result.userId || email;
      identifyUser(userId, { email });
      trackEvent('user_signed_up', { userId, email });
      router.push('/onboarding');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to verify email';
      log.error('Clerk email verification failed', {
        userId: 'signed_out',
        action: 'verify_email_code',
        error: err,
        message,
      });
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={cn('flex flex-col gap-6', className)} {...props}>
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-xl">Create your account</CardTitle>
          <CardDescription>
            Enter your email below to create your account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={requiresVerification ? handleVerification : handleSubmit}>
            <FieldGroup>
              {requiresVerification ? (
                <Field>
                  <FieldLabel htmlFor="verification-code">Verification code</FieldLabel>
                  <Input
                    id="verification-code"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    placeholder="Enter the code sent to your email"
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value)}
                    required
                    disabled={isLoading}
                  />
                  <FieldDescription>Check {email} for your verification code.</FieldDescription>
                </Field>
              ) : (
                <>
              <Field>
                <FieldLabel htmlFor="email">Email</FieldLabel>
                <Input
                  id="email"
                  type="email"
                  placeholder="m@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={isLoading}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="password">Password</FieldLabel>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={isLoading}
                />
                <FieldDescription>
                  Must be at least 8 characters long.
                </FieldDescription>
              </Field>
              <Field>
                <FieldLabel htmlFor="confirm-password">
                  Confirm Password
                </FieldLabel>
                <Input
                  id="confirm-password"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  disabled={isLoading}
                />
              </Field>
                </>
              )}
              {error && (
                <div className="text-red-500 text-sm text-center">{error}</div>
              )}
              <Field>
                <Button type="submit" disabled={isLoading || !isLoaded} className="w-full">
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Creating account...
                    </>
                  ) : (
                    requiresVerification ? 'Verify Email' : 'Create Account'
                  )}
                </Button>
                <FieldDescription className="text-center">
                  Already have an account?{' '}
                  <Link href="/login" className="underline">
                    Sign in
                  </Link>
                </FieldDescription>
              </Field>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
