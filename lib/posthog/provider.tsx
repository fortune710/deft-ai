'use client';

import { useEffect } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import posthog from 'posthog-js';

let posthogInitialized = false;

export function PHProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (typeof window !== 'undefined' && !posthogInitialized) {
      const posthogKey = process.env.NEXT_PUBLIC_POSTHOG_KEY;
      const posthogHost = process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com';

      if (posthogKey) {
        posthog.init(posthogKey, {
          api_host: posthogHost,
          loaded: (posthog) => {
            if (process.env.NODE_ENV === 'development') {
              posthog.debug();
            }
          },
          capture_pageview: false, // We'll handle pageviews manually
          capture_pageleave: true,
        });
        posthogInitialized = true;
      }
    }
  }, []);

  return <>{children}</>;
}

export function PostHogPageView(): null {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Wait a bit for PostHog to initialize
      const checkAndTrack = () => {
        if (posthog.__loaded || posthogInitialized) {
          let url = window.origin + pathname;
          if (searchParams && searchParams.toString()) {
            url = url + `?${searchParams.toString()}`;
          }
          posthog.capture('$pageview', {
            $current_url: url,
          });
        } else {
          // Retry after a short delay if PostHog isn't loaded yet
          setTimeout(checkAndTrack, 100);
        }
      };
      checkAndTrack();
    }
  }, [pathname, searchParams]);

  return null;
}

