'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowRight, LayoutDashboard } from 'lucide-react';
import { Show } from '@clerk/nextjs';
import { logger } from '@/lib/logger';

const log = logger.child({ module: 'components/auth-nav-buttons' });

export function AuthNavButtons() {
  log.debug('Rendering authentication navigation', {
    userId: 'resolved_by_clerk_client',
    action: 'render_auth_navigation',
  });

  return (
    <>
      <Show when="signed-in">
        <Button asChild>
          <Link href="/content-engine">
            <LayoutDashboard className="mr-2 h-4 w-4" />
            Dashboard
          </Link>
        </Button>
      </Show>
      <Show when="signed-out">
        <div className='font-alan-sans bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 grid grid-cols-2 gap-2 border rounded-xl p-2'>
          <Link className='px-5 py-1.5 text-center' href="/login">Login</Link>
          <Link className='text-black px-5 py-1.5 bg-primary/90 rounded-lg flex items-center justify-center gap-1.5 font-medium' href="/sign-up">
            Sign Up
            <ArrowRight className='w-5 h-5' />
          </Link>
        </div>
      </Show>
    </>
  );
}
