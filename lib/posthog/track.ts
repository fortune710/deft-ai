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
};

