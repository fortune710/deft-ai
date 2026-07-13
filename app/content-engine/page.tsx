'use client';

import { useState, useEffect, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { Sparkles, LayoutGrid, List, Loader2, Search, Filter, X, ListFilter, Check } from 'lucide-react';
import { AppLayout } from '@/components/app-layout';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
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
import { cn } from '@/lib/utils';

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

  // Search and Filter state
  const [showSearch, setShowSearch] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [platformFilter, setPlatformFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'date' | 'title' | 'platform'>('date');

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
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Content Ideas</h1>
          <p className="text-muted-foreground">
            AI-generated ideas and scripts, ready to schedule
          </p>
        </div>

        <div className="flex items-center justify-between gap-4 py-2">
          <div className="flex items-center gap-4">
            {!isMobile && (
              <Tabs value={viewMode} onValueChange={(v) => handleViewChange(v as ViewMode)} className="w-auto">
                <TabsList className="bg-gray-100/50 dark:bg-gray-800/80 p-1 h-9 border border-gray-200 dark:border-gray-700">
                  <TabsTrigger value="board" className="h-7 text-xs px-3">
                    <LayoutGrid className="h-3.5 w-3.5 mr-1.5" />
                    Board
                  </TabsTrigger>
                  <TabsTrigger value="list" className="h-7 text-xs px-3">
                    <List className="h-3.5 w-3.5 mr-1.5" />
                    Table
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            )}
          </div>

          <div className="flex items-center gap-3">
            {viewMode === 'list' && (
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 pr-2 border-r border-gray-200 dark:border-gray-800 mr-1">
                  <div className="flex items-center gap-2">
                    <Button
                      variant={showSearch ? "secondary" : "ghost"}
                      size="icon"
                      className={cn("h-8 w-8 rounded-lg", showSearch && "bg-gray-100 dark:bg-gray-800")}
                      onClick={() => setShowSearch(!showSearch)}
                    >
                      <Search className="h-4 w-4" />
                    </Button>

                    <div className={cn(
                      "flex items-center transition-all duration-300 ease-in-out",
                      showSearch ? "w-[240px] opacity-100" : "w-0 opacity-0 overflow-hidden"
                    )}>
                      <div className="relative w-full">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                        <Input
                          placeholder="Search items..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="h-8 pl-8 text-xs bg-gray-50/50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700 rounded-lg focus-visible:ring-0"
                          autoFocus
                        />
                        {searchQuery && (
                          <button 
                            onClick={() => setSearchQuery('')}
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant={statusFilter !== 'all' || platformFilter !== 'all' ? "secondary" : "ghost"}
                        size="icon"
                        className={cn("h-8 w-8 rounded-lg", (statusFilter !== 'all' || platformFilter !== 'all') && "bg-gray-100 dark:bg-gray-800")}
                      >
                        <ListFilter className="h-4 w-4" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[200px] p-2 rounded-xl" align="end">
                      <div className="space-y-3">
                        <div className="px-2 pt-1">
                          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Status</p>
                          <div className="space-y-1">
                            {['all', 'idea', 'in_progress', 'ready', 'published'].map((s) => (
                              <button
                                key={s}
                                onClick={() => setStatusFilter(s)}
                                className="flex items-center justify-between w-full px-2 py-1.5 text-xs rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                              >
                                <div className="flex items-center gap-2">
                                  {statusFilter === s ? (
                                    <Check className="h-3 w-3 text-primary" />
                                  ) : (
                                    <div className="w-3" />
                                  )}
                                  <span className={cn(statusFilter === s && "font-semibold")}>
                                    {s === 'all' ? 'All Statuses' : s.replace('_', ' ')}
                                  </span>
                                </div>
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="px-2 pb-1 border-t border-gray-100 dark:border-gray-800 pt-2">
                          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Platform</p>
                          <div className="space-y-1">
                            {['all', 'youtube', 'instagram', 'tiktok', 'twitter', 'linkedin', 'facebook'].map((p) => (
                              <button
                                key={p}
                                onClick={() => setPlatformFilter(p)}
                                className="flex items-center justify-between w-full px-2 py-1.5 text-xs rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                              >
                                <div className="flex items-center gap-2">
                                  {platformFilter === p ? (
                                    <Check className="h-3 w-3 text-primary" />
                                  ) : (
                                    <div className="w-3" />
                                  )}
                                  <span className={cn(platformFilter === p && "font-semibold")}>
                                    {p === 'all' ? 'All Platforms' : p}
                                  </span>
                                </div>
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </PopoverContent>
                  </Popover>

                  {(searchQuery || statusFilter !== 'all' || platformFilter !== 'all') && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-[10px] text-gray-500 hover:text-gray-900"
                      onClick={() => {
                        setSearchQuery('');
                        setStatusFilter('all');
                        setPlatformFilter('all');
                        setShowSearch(false);
                      }}
                    >
                      <X className="h-3 w-3 mr-1" />
                      Clear
                    </Button>
                  )}
                </div>
              </div>
            )}
            <GeneratePlanButton onClick={() => setGenerateDialogOpen(true)} />
          </div>
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
            {/* The second row with tabs is removed because they were moved to the top row */}

            {itemsLoading ? (
              <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="w-8 h-8 animate-spin" />
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
                        platformFilter={platformFilter}
                      />
                    )}
                    {viewMode === 'list' && (
                      <ListView
                        items={items}
                        searchQuery={searchQuery}
                        setSearchQuery={setSearchQuery}
                        statusFilter={statusFilter as any}
                        setStatusFilter={setStatusFilter as any}
                        platformFilter={platformFilter as any}
                        setPlatformFilter={setPlatformFilter as any}
                        sortBy={sortBy}
                        setSortBy={setSortBy}
                      />
                    )}
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
