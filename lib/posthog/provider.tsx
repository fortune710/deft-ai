"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import posthog from "posthog-js";

import { logger } from "@/lib/logger";
import { createPostHogClientConfig } from "@/lib/posthog/client-config";

let posthogInitialized = false;
const log = logger.child({ file: "lib/posthog/provider.tsx" });

export function PHProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const userId = "anonymous";
    const posthogKey = process.env.NEXT_PUBLIC_POSTHOG_KEY;
    const posthogHost =
      process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com";

    if (!posthogKey) {
      log.warn("Skipped PostHog initialization because the key is missing", {
        userId,
        action: "initialize_posthog_client",
      });
      return;
    }
    if (posthogInitialized) {
      log.debug("Reused the initialized PostHog browser client", {
        userId,
        action: "initialize_posthog_client",
      });
      return;
    }

    try {
      posthog.init(
        posthogKey,
        createPostHogClientConfig({
          apiHost: posthogHost,
          userId,
          onLoaded: (loadedPostHog) => {
            log.info("Loaded the SSR-safe PostHog browser client", {
              userId,
              action: "load_posthog_client",
              externalScriptsInjectTarget: "head",
            });
            if (process.env.NODE_ENV === "development") {
              loadedPostHog.debug();
            }
          },
        }),
      );
      posthogInitialized = true;
      log.info("Initialized PostHog with head-injected external scripts", {
        userId,
        action: "initialize_posthog_client",
        posthogHost,
        externalScriptsInjectTarget: "head",
      });
    } catch (error) {
      log.error("Failed to initialize the PostHog browser client", {
        userId,
        action: "initialize_posthog_client",
        posthogHost,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }, []);

  return <>{children}</>;
}

export function PostHogPageView(): null {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    const userId = "anonymous";
    if (!process.env.NEXT_PUBLIC_POSTHOG_KEY) {
      log.debug("Skipped pageview tracking because PostHog is disabled", {
        userId,
        action: "capture_posthog_pageview",
        pathname,
      });
      return;
    }

    let retryTimeout: ReturnType<typeof setTimeout> | undefined;
    const checkAndTrack = () => {
      if (posthog.__loaded || posthogInitialized) {
        let url = window.origin + pathname;
        if (searchParams && searchParams.toString()) {
          url = `${url}?${searchParams.toString()}`;
        }
        posthog.capture("$pageview", {
          $current_url: url,
        });
        log.info("Captured a PostHog pageview", {
          userId,
          action: "capture_posthog_pageview",
          pathname,
          url,
        });
        return;
      }
      retryTimeout = setTimeout(checkAndTrack, 100);
      log.debug("Deferred pageview until PostHog finishes loading", {
        userId,
        action: "capture_posthog_pageview",
        pathname,
      });
    };
    checkAndTrack();

    return () => {
      if (retryTimeout) {
        clearTimeout(retryTimeout);
      }
      log.debug("Cleaned up pending PostHog pageview tracking", {
        userId,
        action: "cleanup_posthog_pageview",
        pathname,
      });
    };
  }, [pathname, searchParams]);

  return null;
}
