'use client';

import { useState, useEffect, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { Sparkles, LayoutGrid, List, Loader2 } from 'lucide-react';
import { AppLayout } from '@/components/app-layout';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useContentProfile } from '@/hooks/use-content-profile';
import { useContentItems } from '@/hooks/use-content-items';
import { useContentEngineProgress } from '@/hooks/use-content-engine-progress';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { MobileListView } from '@/components/content-engine/mobile-list-view';
import { GeneratePlanDialog } from '@/components/content-engine/generate-plan-dialog';
import { GeneratePlanButton } from '@/components/content-engine/generate-plan-button';
import { BoardViewSkeleton } from '@/components/content-engine/board-view-skeleton';
import { ListViewSkeleton } from '@/components/content-engine/list-view-skeleton';
import type { ViewMode } from '@/types/content-engine';
import { Progress } from '@/components/ui/progress';

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
  const { data: items = [], isLoading: itemsLoading } = useContentItems();
  const { progress, isGenerating } = useContentEngineProgress();

  const [viewMode, setViewMode] = useState<ViewMode>('board');
  const [isMobile, setIsMobile] = useState(false);
  const [generateDialogOpen, setGenerateDialogOpen] = useState(false);

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

  const handlePlanGenerated = () => {
    setGenerateDialogOpen(false);
    queryClient.invalidateQueries({ queryKey: ['content-items'] });
  };

  useEffect(() => {
    if (!isGenerating && progress === null) {
      queryClient.invalidateQueries({ queryKey: ['content-items'] });
    }
  }, [isGenerating, progress, queryClient]);

  const currentProgress = progress?.progress || 0;
  const progressMessage = progress?.message || 'Generating your ideas…';

  const friendlyStatus = useMemo(() => {
    if (!isGenerating) return '';
    if (currentProgress < 20) return 'Getting things ready…';
    if (currentProgress < 45) return 'Generating ideas tailored to you…';
    if (currentProgress < 70) return 'Drafting scripts and hooks…';
    if (currentProgress < 90) return 'Polishing details and pacing…';
    return 'Saving your ideas…';
  }, [isGenerating, currentProgress]);

  useEffect(() => {
    const toastId = 'content-generation-progress';
    if (isGenerating) {
      toast.loading(
        <div className="space-y-2 w-full">
          <p className="font-semibold text-sm">{progressMessage}</p>
          {friendlyStatus && (
            <p className="text-xs text-muted-foreground">{friendlyStatus}</p>
          )}
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mt-2">
            <Progress
              value={currentProgress}
              className="h-2 rounded-full transition-all duration-500"
            />
          </div>
          <div className="flex items-center justify-between text-xs text-muted-foreground mt-1">
            <span>{Math.round(currentProgress)}%</span>
            <span className="text-[10px]">This may take a while</span>
          </div>
        </div>,
        { id: toastId, duration: Infinity }
      );
    } else {
      toast.dismiss(toastId);
    }
    return () => {
      if (!isGenerating) toast.dismiss(toastId);
    };
  }, [isGenerating, currentProgress, progressMessage, friendlyStatus]);

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

  const showEmptyState = items.length === 0 && !itemsLoading && !isGenerating;

  return (
    <AppLayout>
      <div className="space-y-6 pb-20">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className='max-sm:hidden'>
            <h1 className="text-3xl font-bold tracking-tight">Content Ideas</h1>
            <p className="text-muted-foreground">
              AI-generated ideas and scripts, ready to schedule
            </p>
          </div>
          <GeneratePlanButton onClick={() => setGenerateDialogOpen(true)} />
        </div>

        {showEmptyState ? (
          <div className="flex flex-col items-center justify-center min-h-[400px] space-y-6">
            <div className="text-center space-y-3">
              <div className="mx-auto w-16 h-16 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                <Sparkles className="h-8 w-8 text-blue-600 dark:text-blue-400" />
              </div>
              <h2 className="text-2xl font-bold">No Content Ideas Yet</h2>
              <p className="text-gray-600 dark:text-gray-400 max-w-md">
                Generate a fresh batch of content ideas and scripts tailored to your niche and goals.
              </p>
            </div>
            <Button onClick={() => setGenerateDialogOpen(true)} size="lg">
              <Sparkles className="h-4 w-4 mr-2" />
              Generate Your First Ideas
            </Button>
          </div>
        ) : (
          <>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div />
              {!isMobile && (
                <Tabs value={viewMode} onValueChange={(v) => handleViewChange(v as ViewMode)}>
                  <TabsList>
                    <TabsTrigger value="board">
                      <LayoutGrid className="h-4 w-4 mr-2" />
                      Kanban
                    </TabsTrigger>
                    <TabsTrigger value="list">
                      <List className="h-4 w-4 mr-2" />
                      Table
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              )}
            </div>

            {itemsLoading ? (
              <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="w-8 h-8 animate-spin" />
              </div>
            ) : (
              <div className="mt-6">
                {isMobile ? (
                  <MobileListView items={items} />
                ) : (
                  <>
                    {viewMode === 'board' && <BoardView items={items} />}
                    {viewMode === 'list' && <ListView items={items} />}
                  </>
                )}
              </div>
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

      <GeneratePlanDialog
        open={generateDialogOpen}
        onOpenChange={setGenerateDialogOpen}
        onSuccess={handlePlanGenerated}
      />
    </AppLayout>
  );
}
