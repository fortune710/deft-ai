'use client';

import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { AppLayout } from '@/components/app-layout';
import { Button } from '@/components/ui/button';
import { useContentProfile } from '@/hooks/use-content-profile';
import { useContentItems } from '@/hooks/use-content-items';
import { CalendarView } from '@/components/content-engine/calendar-view';

export default function CalendarPage() {
  const router = useRouter();
  const { profile, isLoading: profileLoading } = useContentProfile();
  const { data: items = [], isLoading: itemsLoading } = useContentItems();

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
      <div className="space-y-6 pb-20">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Calendar View</h1>
          <p className="text-muted-foreground">
            View your content ideas in calendar format
          </p>
        </div>

        {showEmptyState ? (
          <div className="flex flex-col items-center justify-center min-h-[400px] space-y-6">
            <div className="text-center space-y-3">
              <h2 className="text-2xl font-bold">No Content Ideas Yet</h2>
              <p className="text-gray-600 dark:text-gray-400 max-w-md">
                Generate a fresh batch of ideas and scripts tailored to your niche and goals.
              </p>
            </div>
            <Button
              onClick={() => router.push('/content-engine')}
              size="lg"
            >
              Go to Content Ideas
            </Button>
          </div>
        ) : (
          <>
            {itemsLoading ? (
              <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="w-8 h-8 animate-spin" />
              </div>
            ) : (
              <CalendarView items={items} planStartDate={items[0].scheduled_date} />
            )}

            {items.length === 0 && !itemsLoading && (
              <div className="text-center py-12 text-gray-500">
                <p>No ideas yet.</p>
                <p className="text-sm mt-1">Generate ideas to get started.</p>
              </div>
            )}
          </>
        )}
      </div>
    </AppLayout>
  );
}

