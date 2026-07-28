import type { PostHog, PostHogConfig } from "posthog-js";

import { logger } from "@/lib/logger";

const log = logger.child({ file: "lib/posthog/client-config.ts" });

type CreatePostHogClientConfigOptions = {
  apiHost: string;
  onLoaded: (posthog: PostHog) => void;
  userId: string;
};

export function createPostHogClientConfig({
  apiHost,
  onLoaded,
  userId,
}: CreatePostHogClientConfigOptions): Partial<PostHogConfig> {
  log.debug("Created SSR-safe PostHog browser configuration", {
    userId,
    action: "create_posthog_client_config",
    apiHost,
    externalScriptsInjectTarget: "head",
  });
  return {
    api_host: apiHost,
    defaults: "2026-05-30",
    external_scripts_inject_target: "head",
    loaded: onLoaded,
    capture_pageview: false,
    capture_pageleave: true,
  };
}
