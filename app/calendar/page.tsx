'use client';

import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { AppLayout } from '@/components/app-layout';
import { Button } from '@/components/ui/button';
import { useContentProfile } from '@/hooks/use-content-profile';
import { useContentItems } from '@/hooks/use-content-items';
import { CalendarView } from '@/components/content-engine/calendar-view';
import { logger } from '@/lib/logger';
import { useAuth } from '@/hooks/use-clerk-auth';

const log = logger.child({ file: 'app/calendar/page.tsx' });

export default function CalendarPage() {
  const { userId } = useAuth();
  const router = useRouter();
  const { profile, isLoading: profileLoading } = useContentProfile();
  const { data: items = [], isLoading: itemsLoading } = useContentItems();

  log.debug('Rendering calendar page', {
    action: 'render_calendar_page',
    userId: userId || 'signed_out',
    itemCount: items.length,
    isLoading: profileLoading || itemsLoading,
  });

  if (profileLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[500px]">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
      </AppLayout>
    );
  }

  if (!profile) {
    return (
      <AppLayout>
        <div className="flex flex-col items-center justify-center min-h-[500px] space-y-4">
          <p className="text-gray-600">Please complete onboarding first</p>
          <Button onClick={() => router.push('/onboarding')}>
            Go to Onboarding
          </Button>
        </div>
      </AppLayout>
    );
  }

  const showEmptyState = !items.length;

  return (
    <AppLayout>
      <div className="-m-6 flex min-h-screen flex-col overflow-hidden border-x border-border/70 bg-background">
        <header className="flex min-h-16 items-center justify-between gap-3 border-b border-border/70 px-5 py-3">
          <h1 className="font-inter text-sm font-medium tracking-wide leading-6 text-foreground">
            Calendar View
          </h1>
        </header>

        <div className="flex-1 overflow-auto pb-20">
          {showEmptyState ? (
            <div className="flex min-h-[400px] flex-col items-center justify-center space-y-6">
              <div className="space-y-3 text-center">
                <h2 className="text-2xl font-bold">No Content Ideas Yet</h2>
                <p className="max-w-md text-gray-600 dark:text-gray-400">
                  Generate a fresh batch of ideas and scripts tailored to your niche and goals.
                </p>
              </div>
              <Button onClick={() => router.push('/content-engine')} size="lg">
                Go to Content Ideas
              </Button>
            </div>
          ) : (
            <>
              {itemsLoading ? (
                <div className="flex min-h-[400px] items-center justify-center">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </div>
              ) : (
                <CalendarView items={items} planStartDate={items[0].scheduled_date} />
              )}

              {items.length === 0 && !itemsLoading && (
                <div className="py-12 text-center text-gray-500">
                  <p>No ideas yet.</p>
                  <p className="mt-1 text-sm">Generate ideas to get started.</p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
