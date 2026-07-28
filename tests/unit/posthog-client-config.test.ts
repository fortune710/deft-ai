import { describe, expect, it, vi } from "vitest";

import { createPostHogClientConfig } from "@/lib/posthog/client-config";

describe("PostHog browser configuration", () => {
  it("injects remote feature scripts into head to preserve hydration", () => {
    const onLoaded = vi.fn();

    const config = createPostHogClientConfig({
      apiHost: "https://us.i.posthog.com",
      onLoaded,
      userId: "unit-test-user",
    });

    expect(config).toMatchObject({
      api_host: "https://us.i.posthog.com",
      defaults: "2026-05-30",
      external_scripts_inject_target: "head",
      capture_pageview: false,
      capture_pageleave: true,
      loaded: onLoaded,
    });
  });
});
