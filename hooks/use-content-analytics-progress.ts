'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase/client';
import type { ContentAnalyticsProgress } from '@/types/content-analytics';

export function useContentAnalyticsProgress() {
  const [progress, setProgress] = useState<ContentAnalyticsProgress | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const userIdRef = useRef<string | null>(null);
  const restartTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let mounted = true;

    const clearRestartTimer = () => {
      if (restartTimerRef.current) {
        clearTimeout(restartTimerRef.current);
        restartTimerRef.current = null;
      }
    };

    const cleanupChannel = () => {
      clearRestartTimer();
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };

    const fetchLatest = async (userId: string) => {
      const { data, error } = await supabase
        .from('content_analytics_progress')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error('Error fetching progress:', error);
        return;
      }

      if (!mounted) return;
      setProgress(data);
    };

    const scheduleRestart = (userId: string, reason: string) => {
      if (!mounted) return;
      if (userIdRef.current !== userId) return;
      if (restartTimerRef.current) return;

      console.warn('Realtime channel needs restart:', reason);

      restartTimerRef.current = setTimeout(() => {
        restartTimerRef.current = null;
        if (!mounted) return;
        if (userIdRef.current !== userId) return;
        void start(userId);
      }, 750);
    };

    const start = async (userId: string) => {
      userIdRef.current = userId;
      cleanupChannel();
      setIsLoading(true);

      try {
        const channel = supabase.channel(`content-analytics-progress-${userId}`);

        channel.on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'content_analytics_progress',
            filter: `user_id=eq.${userId}`,
          },
          (payload) => {
            if (!mounted) return;
            if (userIdRef.current !== userId) return;

            if (payload.eventType === 'DELETE') {
              setProgress(null);
            } else if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
              setProgress(payload.new as ContentAnalyticsProgress);
            }
          }
        );

        channel.subscribe(async (status, err) => {
          if (!mounted) return;
          if (userIdRef.current !== userId) return;

          if (status === 'SUBSCRIBED') {
            await fetchLatest(userId);
            if (mounted) setIsLoading(false);
            return;
          }

          if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            console.warn('Realtime subscribe status:', status, err);
            scheduleRestart(userId, status);
          }
        });

        channelRef.current = channel;
      } catch (error) {
        console.error('Error setting up progress subscription:', error);
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    const stop = () => {
      userIdRef.current = null;
      cleanupChannel();
      if (mounted) {
        setProgress(null);
        setIsLoading(false);
      }
    };

    const setupAuth = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        await start(user.id);
      } else {
        if (mounted) setIsLoading(false);
      }

      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange((event, session) => {
        if (event === 'SIGNED_IN' && session?.user) {
          void start(session.user.id);
        } else if (event === 'SIGNED_OUT') {
          stop();
        }
      });

      return () => {
        subscription.unsubscribe();
        stop();
      };
    };

    const cleanup = setupAuth();

    return () => {
      mounted = false;
      cleanup.then((cleanupFn) => cleanupFn?.());
      cleanupChannel();
    };
  }, []);

  const isGenerating = progress !== null && progress.status !== 'completed' && progress.status !== 'failed';

  return {
    progress,
    isGenerating,
    isLoading,
  };
}
