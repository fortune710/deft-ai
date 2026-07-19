'use client';

import { createElement, useState, useEffect, useMemo } from 'react';
import type { ElementType } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { Sparkles, LayoutGrid, List, Loader2, Search, X, ChevronsUpDown, Globe2 } from 'lucide-react';
import { AppLayout } from '@/components/app-layout';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
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
import { storageKeys } from '@/utils/storage-keys';
import { logger } from '@/lib/logger';
import { useAuth } from '@/hooks/use-clerk-auth';
import type { ItemStatus, Platform } from '@/types/content-engine';
import { BaselineFacebook } from '@/components/icons/facebook';
import { Instagram } from '@/components/icons/instagram';
import { Linkedin } from '@/components/icons/linkedin';
import { BaselineTiktok } from '@/components/icons/tiktok';
import { Twitter } from '@/components/icons/twitter';
import { YoutubeLine } from '@/components/icons/youtube';

const log = logger.child({ module: 'app/content-engine/page' });

const statusFilterOptions: Array<{ value: ItemStatus | 'all'; label: string }> = [
  { value: 'all', label: 'All statuses' },
  { value: 'idea', label: 'Ideas' },
  { value: 'in_progress', label: 'In progress' },
  { value: 'ready', label: 'Ready' },
  { value: 'published', label: 'Published' },
];

const platformFilterOptions = [
  { value: 'all', label: 'All platforms', icon: Globe2 },
  { value: 'youtube', label: 'YouTube', icon: YoutubeLine },
  { value: 'instagram', label: 'Instagram', icon: Instagram },
  { value: 'tiktok', label: 'TikTok', icon: BaselineTiktok },
  { value: 'twitter', label: 'Twitter', icon: Twitter },
  { value: 'linkedin', label: 'LinkedIn', icon: Linkedin },
  { value: 'facebook', label: 'Facebook', icon: BaselineFacebook },
] satisfies Array<{ value: Platform | 'all'; label: string; icon: ElementType }>;

const BoardView = dynamic(() => import('@/components/content-engine/board-view').then(mod => ({ default: mod.BoardView })), {
  ssr: false,
  loading: () => <BoardViewSkeleton />,
});

const ListView = dynamic(() => import('@/components/content-engine/list-view').then(mod => ({ default: mod.ListView })), {
  ssr: false,
  loading: () => <ListViewSkeleton />,
});

export default function ContentEnginePage() {
  const { userId } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { profile, isLoading: profileLoading } = useContentProfile();
  const { data: items = [], isLoading: itemsLoading } = useContentItems();
  const { progress, isGenerating } = useContentEngineProgress();

  const [viewMode, setViewMode] = useState<ViewMode>('board');
  const [isMobile, setIsMobile] = useState(false);
  const [generateDialogOpen, setGenerateDialogOpen] = useState(false);
  const [statusPopoverOpen, setStatusPopoverOpen] = useState(false);
  const [platformPopoverOpen, setPlatformPopoverOpen] = useState(false);

  // Search and Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<ItemStatus | 'all'>('all');
  const [platformFilter, setPlatformFilter] = useState<Platform | 'all'>('all');
  const [sortBy, setSortBy] = useState<'date' | 'title' | 'platform'>('date');

  log.debug('Rendering content workspace', {
    userId: userId || 'signed_out',
    action: 'render_content_workspace',
    viewMode,
    itemCount: items.length,
  });

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem(storageKeys.localStorage.contentEngineView);
    if (saved && ['board', 'list'].includes(saved)) {
      setViewMode(saved as ViewMode);
    }
  }, []);

  const handleViewChange = (mode: ViewMode) => {
    log.info('Changing content workspace view', {
      userId: userId || 'signed_out',
      action: 'change_content_workspace_view',
      viewMode: mode,
    });
    setViewMode(mode);
    localStorage.setItem(storageKeys.localStorage.contentEngineView, mode);
  };

  const handlePlanGenerated = () => {
    log.info('Refreshing content items after generation', {
      userId: userId || 'signed_out',
      action: 'refresh_generated_content_items',
    });
    setGenerateDialogOpen(false);
    queryClient.invalidateQueries({ queryKey: storageKeys.reactQuery.contentItems });
  };

  const handleClearFilters = () => {
    log.info('Clearing content workspace filters', {
      userId: userId || 'signed_out',
      action: 'clear_content_workspace_filters',
    });
    setSearchQuery('');
    setStatusFilter('all');
    setPlatformFilter('all');
  };

  const handleStatusFilterChange = (status: string) => {
    const nextStatus = status as ItemStatus | 'all';
    log.info('Changing content status filter', {
      userId: userId || 'signed_out',
      action: 'change_content_status_filter',
      status: nextStatus,
    });
    setStatusFilter(nextStatus);
    setStatusPopoverOpen(false);
  };

  const handlePlatformFilterChange = (platform: string) => {
    const nextPlatform = platform as Platform | 'all';
    log.info('Changing content platform filter', {
      userId: userId || 'signed_out',
      action: 'change_content_platform_filter',
      platform: nextPlatform,
    });
    setPlatformFilter(nextPlatform);
    setPlatformPopoverOpen(false);
  };

  useEffect(() => {
    if (!isGenerating && progress === null) {
      queryClient.invalidateQueries({ queryKey: storageKeys.reactQuery.contentItems });
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
              className="h-2 rounded-full [&>div]:transition-transform [&>div]:duration-200 [&>div]:ease-linear motion-reduce:[&>div]:transition-none"
            />
          </div>
          <div className="flex items-center justify-between text-xs text-muted-foreground mt-1">
            <span>{Math.round(currentProgress)}%</span>
            <span className="text-[11px]">This may take a while</span>
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
          <Loader2 className="h-8 w-8 animate-spin motion-reduce:animate-none" />
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
  const showGenerationState = items.length === 0 && !itemsLoading && isGenerating;
  const selectedStatusOption = statusFilterOptions.find((option) => option.value === statusFilter) || statusFilterOptions[0];
  const selectedPlatformOption = platformFilterOptions.find((option) => option.value === platformFilter) || platformFilterOptions[0];

  return (
    <AppLayout>
      <div className="space-y-6 pb-20">
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <h1 className="bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text font-alan-sans text-4xl font-bold tracking-tight text-transparent">
              Content Ideas
            </h1>
            <p className="font-inter text-lg text-muted-foreground">
              AI-generated ideas and scripts, ready to schedule
            </p>
          </div>
          <GeneratePlanButton onClick={() => setGenerateDialogOpen(true)} />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search items..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-9 rounded-lg border-border/60 bg-muted/40 pl-8 pr-8 text-xs transition-colors focus-visible:border-primary/70 focus-visible:ring-0 focus-visible:ring-offset-0"
                aria-label="Search content items"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-sm text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  aria-label="Clear search"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>

            {!isMobile && viewMode === 'list' && (
              <>
                <Popover open={statusPopoverOpen} onOpenChange={setStatusPopoverOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="group h-9 min-w-[128px] justify-between rounded-md px-2.5 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
                      aria-label="Filter by status"
                    >
                      {selectedStatusOption.label}
                      <ChevronsUpDown className="ml-2 h-3 w-3 shrink-0 opacity-50 group-hover:opacity-100" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent align="start" className="z-[100] w-40 rounded-xl p-1">
                    <div className="flex flex-col gap-1 text-sm">
                      {statusFilterOptions.map((option) => (
                        <Button
                          key={option.value}
                          variant="ghost"
                          size="sm"
                          onClick={() => handleStatusFilterChange(option.value)}
                          aria-pressed={statusFilter === option.value}
                          className={`h-6 justify-start rounded-[7px] px-2 text-xs transition-colors duration-150 hover:bg-primary hover:text-primary-foreground dark:hover:bg-primary dark:hover:text-primary-foreground ${statusFilter === option.value ? 'bg-secondary text-foreground' : 'text-muted-foreground'}`}
                        >
                          {option.label}
                        </Button>
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>

                <Popover open={platformPopoverOpen} onOpenChange={setPlatformPopoverOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="group h-9 min-w-[142px] justify-between rounded-md px-2.5 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
                      aria-label="Filter by platform"
                    >
                      <span className="flex min-w-0 items-center">
                        {createElement(selectedPlatformOption.icon, {
                          'aria-hidden': true,
                          className: 'mr-1.5 h-3.5 w-3.5 shrink-0',
                        })}
                        {selectedPlatformOption.label}
                      </span>
                      <ChevronsUpDown className="ml-2 h-3 w-3 shrink-0 opacity-50 group-hover:opacity-100" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent align="start" className="z-[100] w-44 rounded-xl p-1">
                    <div className="flex flex-col gap-1 text-sm">
                      {platformFilterOptions.map((option) => (
                        <Button
                          key={option.value}
                          variant="ghost"
                          size="sm"
                          onClick={() => handlePlatformFilterChange(option.value)}
                          aria-pressed={platformFilter === option.value}
                          className={`h-6 justify-start rounded-[7px] px-2 text-xs transition-colors duration-150 hover:bg-primary hover:text-primary-foreground dark:hover:bg-primary dark:hover:text-primary-foreground ${platformFilter === option.value ? 'bg-secondary text-foreground' : 'text-muted-foreground'}`}
                        >
                          {createElement(option.icon, {
                            'aria-hidden': true,
                            className: 'mr-1.5 h-3.5 w-3.5 shrink-0',
                          })}
                          {option.label}
                        </Button>
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>
              </>
            )}

            {(searchQuery || (viewMode === 'list' && (statusFilter !== 'all' || platformFilter !== 'all'))) && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-[11px] text-muted-foreground hover:text-foreground"
                onClick={handleClearFilters}
              >
                <X className="h-3 w-3 mr-1" />
                Clear
              </Button>
            )}
          </div>

          {!isMobile && (
            <Tabs value={viewMode} onValueChange={(v) => handleViewChange(v as ViewMode)} className="w-auto">
              <TabsList className="h-9 rounded-xl bg-muted/60 p-1">
                <TabsTrigger value="board" className="h-7 w-8 rounded-lg px-0" aria-label="Board view" title="Board view">
                  <LayoutGrid className="h-3.5 w-3.5" />
                </TabsTrigger>
                <TabsTrigger value="list" className="h-7 w-8 rounded-lg px-0" aria-label="Table view" title="Table view">
                  <List className="h-3.5 w-3.5" />
                </TabsTrigger>
              </TabsList>
            </Tabs>
          )}
        </div>

        {showEmptyState ? (
          <div className="flex flex-col items-center justify-center min-h-[400px] space-y-6">
            <div className="text-center space-y-3">
              <div className="mx-auto w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
                <Sparkles className="h-8 w-8 text-gray-600 dark:text-gray-400" />
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
            {itemsLoading ? (
              isMobile ? <ListViewSkeleton /> : viewMode === 'board' ? <BoardViewSkeleton /> : <ListViewSkeleton />
            ) : showGenerationState ? (
              <div className="rounded-2xl border border-border/60 bg-muted/30 px-6 py-12 text-center">
                <Sparkles className="mx-auto mb-4 h-7 w-7 text-primary" />
                <p className="font-semibold">{friendlyStatus || progressMessage}</p>
                <p className="mt-1 text-sm text-muted-foreground">{Math.round(currentProgress)}% complete</p>
                <Progress
                  value={currentProgress}
                  className="mx-auto mt-4 h-2 max-w-md [&>div]:transition-transform [&>div]:duration-200 [&>div]:ease-linear motion-reduce:[&>div]:transition-none"
                />
              </div>
            ) : (
              <div className="mt-2">
                {isMobile ? (
                  <MobileListView items={items} />
                ) : (
                  <>
                    {viewMode === 'board' && (
                      <BoardView
                        items={items}
                        searchQuery={searchQuery}
                        platformFilter="all"
                        statusFilter="all"
                      />
                    )}
                    {viewMode === 'list' && (
                      <ListView
                        items={items}
                        searchQuery={searchQuery}
                        setSearchQuery={setSearchQuery}
                        statusFilter={statusFilter}
                        setStatusFilter={setStatusFilter}
                        platformFilter={platformFilter}
                        setPlatformFilter={setPlatformFilter}
                        sortBy={sortBy}
                        setSortBy={setSortBy}
                      />
                    )}
                  </>
                )}
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
