import posthog from 'posthog-js';

/**
 * Track a custom event with PostHog
 * @param eventName - The name of the event
 * @param properties - Optional properties to attach to the event
 */
export function trackEvent(eventName: string, properties?: Record<string, any>) {
  if (typeof window !== 'undefined' && posthog.__loaded) {
    posthog.capture(eventName, properties);
  }
}

/**
 * Track API request events
 * @param endpoint - The API endpoint being called
 * @param method - HTTP method
 * @param properties - Additional properties (status, error, duration, etc.)
 */
export function trackAPIRequest(
  endpoint: string,
  method: string,
  properties?: {
    status?: number;
    error?: string;
    duration?: number;
    userId?: string;
    [key: string]: any;
  }
) {
  trackEvent('api_request', {
    endpoint,
    method,
    ...properties,
  });
}

/**
 * Track script generator events
 */
export const ScriptGeneratorTracking = {
  generateInitial: (properties?: { platform?: string; promptLength?: number }) => {
    trackEvent('script_generator_generate_initial', properties);
  },
  ask: (properties?: { questionLength?: number }) => {
    trackEvent('script_generator_ask', properties);
  },
  edit: (properties?: { editRequestLength?: number }) => {
    trackEvent('script_generator_edit', properties);
  },
  regenerateHook: (properties?: Record<string, any>) => {
    trackEvent('script_generator_regenerate_hook', properties);
  },
};

/**
 * Identify a user in PostHog
 * @param userId - The user's unique ID
 * @param properties - Optional user properties (email, name, etc.)
 */
export function identifyUser(userId: string, properties?: Record<string, any>) {
  if (typeof window === 'undefined') {
    return;
  }

  // Wait for PostHog to be loaded
  const identify = () => {
    if (posthog.__loaded) {
      posthog.identify(userId, properties);
    } else {
      // Retry after a short delay if PostHog isn't loaded yet
      setTimeout(identify, 100);
    }
  };

  identify();
}

/**
 * Track content engine events
 */
export const ContentEngineTracking = {
  generatePlan: (properties?: {
    planName?: string;
    platforms?: string[];
    platformCount?: number;
  }) => {
    trackEvent('content_engine_generate_plan', properties);
  },
  planGenerated: (properties?: {
    planId?: string;
    itemCount?: number;
    duration?: number;
  }) => {
    trackEvent('content_engine_plan_generated', properties);
  },
  planGenerationFailed: (properties?: { error?: string }) => {
    trackEvent('content_engine_plan_generation_failed', properties);
  },
  contentItemCreated: (properties?: {
    itemId?: string;
    platform?: string;
    status?: string;
    planId?: string | null;
  }) => {
    trackEvent('content_engine_item_created', properties);
  },
};

