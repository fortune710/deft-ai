'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase/client';
import type { ContentEngineProgress } from '@/lib/api/content-engine-progress';

export function useContentEngineProgress() {
  const [progress, setProgress] = useState<ContentEngineProgress | null>(null);
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
        .from('content_engine_progress')
        .select('*')
        .eq('user_id', userId)
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
      if (restartTimerRef.current) return; // already scheduled

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
        // Subscribe first, then fetch after SUBSCRIBED to avoid missing updates
        const channel = supabase.channel(`content-engine-progress-${userId}`);

        channel.on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'content_engine_progress',
            filter: `user_id=eq.${userId}`,
          },
          (payload) => {
            if (!mounted) return;
            if (userIdRef.current !== userId) return;

            if (payload.eventType === 'DELETE') {
              setProgress(null);
            } else if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
              setProgress(payload.new as ContentEngineProgress);
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
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!mounted) return;

        if (user?.id) {
          void start(user.id);
        } else {
          // Important: don't permanently "give up" here; auth may resolve after mount
          setIsLoading(false);
        }
      } catch (e) {
        console.error('Error reading auth user:', e);
        if (mounted) setIsLoading(false);
      }
    };

    // Auth can become available after mount; react to it.
    const {
      data: { subscription: authSub },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const userId = session?.user?.id ?? null;
      if (!mounted) return;

      if (userId) {
        void start(userId);
      } else {
        stop();
      }
    });

    // Refetch on focus/online to heal occasional missed realtime updates (tab sleeping, network blips).
    const onVisibleOrOnline = () => {
      const userId = userIdRef.current;
      if (!userId) return;
      void fetchLatest(userId);
    };

    window.addEventListener('visibilitychange', onVisibleOrOnline);
    window.addEventListener('online', onVisibleOrOnline);

    setupAuth();

    return () => {
      mounted = false;
      window.removeEventListener('visibilitychange', onVisibleOrOnline);
      window.removeEventListener('online', onVisibleOrOnline);
      authSub.unsubscribe();
      cleanupChannel();
    };
  }, []);

  const isGenerating = progress !== null;

  return {
    progress,
    isGenerating,
    isLoading,
  };
}

