'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { Sparkles, LayoutGrid, List, Smartphone, Loader2 } from 'lucide-react';
import { AppLayout } from '@/components/app-layout';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useContentProfile } from '@/hooks/use-content-profile';
import { useActivePlan } from '@/hooks/use-content-plans';
import { useContentItems } from '@/hooks/use-content-items';
import { useQueryClient } from '@tanstack/react-query';
import { MobileListView } from '@/components/content-engine/mobile-list-view';
import { GeneratePlanDialog } from '@/components/content-engine/generate-plan-dialog';
import { PlanSelector } from '@/components/content-engine/plan-selector';
import { ArchivedPlansDialog } from '@/components/content-engine/archived-plans-dialog';
import { BoardViewSkeleton } from '@/components/content-engine/board-view-skeleton';
import { ListViewSkeleton } from '@/components/content-engine/list-view-skeleton';
import type { ViewMode } from '@/types/content-engine';

const BoardView = dynamic(() => import('@/components/content-engine/board-view').then(mod => ({ default: mod.BoardView })), {
  ssr: false,
  loading: () => <BoardViewSkeleton />,
});

const ListView = dynamic(() => import('@/components/content-engine/list-view').then(mod => ({ default: mod.ListView })), {
  ssr: false,
  loading: () => <ListViewSkeleton />,
});

export default function ContentEnginePage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { profile, isLoading: profileLoading } = useContentProfile();
  const { data: activePlan, isLoading: planLoading } = useActivePlan();
  const { data: items = [], isLoading: itemsLoading } = useContentItems(activePlan?.id || null);

  const [viewMode, setViewMode] = useState<ViewMode>('board');
  const [isMobile, setIsMobile] = useState(false);
  const [generateDialogOpen, setGenerateDialogOpen] = useState(false);
  const [archivedDialogOpen, setArchivedDialogOpen] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem('content-engine-view');
    if (saved && ['board', 'list'].includes(saved)) {
      setViewMode(saved as ViewMode);
    }
  }, []);

  const handleViewChange = (mode: ViewMode) => {
    setViewMode(mode);
    localStorage.setItem('content-engine-view', mode);
  };

  const handlePlanGenerated = (planId: string) => {
    setGenerateDialogOpen(false);
    // Immediately refresh plan + items so the UI reflects the new active plan.
    queryClient.invalidateQueries({ queryKey: ['content-plans'] });
    queryClient.invalidateQueries({ queryKey: ['content-plans', 'active'] });
    queryClient.invalidateQueries({ queryKey: ['content-items'] });
  };

  if (profileLoading || planLoading) {
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

  const showEmptyState = !activePlan;

  return (
    <AppLayout>
      <div className="space-y-6 pb-20">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Content Engine</h1>
            <p className="text-muted-foreground">
              AI-powered 30-day content planning and management
            </p>
          </div>

          <Button
            onClick={() => setGenerateDialogOpen(true)}
            size="lg"
            className="w-full sm:w-auto"
          >
            <Sparkles className="h-4 w-4 mr-2" />
            Generate 30-Day Plan
          </Button>
        </div>

        {showEmptyState ? (
          <div className="flex flex-col items-center justify-center min-h-[400px] space-y-6">
            <div className="text-center space-y-3">
              <div className="mx-auto w-16 h-16 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                <Sparkles className="h-8 w-8 text-blue-600 dark:text-blue-400" />
              </div>
              <h2 className="text-2xl font-bold">No Active Content Plan</h2>
              <p className="text-gray-600 dark:text-gray-400 max-w-md">
                Get started by generating a 30-day content plan. AI will create a complete
                calendar with content ideas tailored to your niche and goals.
              </p>
            </div>
            <Button
              onClick={() => setGenerateDialogOpen(true)}
              size="lg"
            >
              <Sparkles className="h-4 w-4 mr-2" />
              Generate Your First Plan
            </Button>
          </div>
        ) : (
          <>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <PlanSelector
                activePlan={activePlan}
                onViewArchived={() => setArchivedDialogOpen(true)}
              />

              {!isMobile && (
                <Tabs value={viewMode} onValueChange={(v) => handleViewChange(v as ViewMode)}>
                  <TabsList>
                    <TabsTrigger value="board">
                      <LayoutGrid className="h-4 w-4 mr-2" />
                      Board
                    </TabsTrigger>
                    <TabsTrigger value="list">
                      <List className="h-4 w-4 mr-2" />
                      List
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              )}

              {isMobile && (
                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <Smartphone className="h-4 w-4" />
                  <span>Mobile View</span>
                </div>
              )}
            </div>

            {itemsLoading ? (
              <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="w-8 h-8 animate-spin" />
              </div>
            ) : (
              <div className="mt-6">
                {isMobile ? (
                  <MobileListView items={items} planId={activePlan.id} />
                ) : (
                  <>
                    {viewMode === 'board' && <BoardView items={items} planId={activePlan.id} />}
                    {viewMode === 'list' && <ListView items={items} planId={activePlan.id} />}
                  </>
                )}
              </div>
            )}

            {items.length === 0 && !itemsLoading && (
              <div className="text-center py-12 text-gray-500">
                <p>No content items in this plan yet.</p>
                <p className="text-sm mt-1">Generate a new plan to get started.</p>
              </div>
            )}
          </>
        )}
      </div>

      <GeneratePlanDialog
        open={generateDialogOpen}
        onOpenChange={setGenerateDialogOpen}
        onSuccess={handlePlanGenerated}
      />

      <ArchivedPlansDialog
        open={archivedDialogOpen}
        onOpenChange={setArchivedDialogOpen}
      />
    </AppLayout>
  );
}
