import { PostHog } from 'posthog-js';

let posthogServer: PostHog | null = null;

/**
 * Initialize PostHog server instance for server-side tracking
 */
function getPostHogServer(): PostHog | null {
  if (posthogServer) {
    return posthogServer;
  }

  const posthogKey = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  const posthogHost = process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com';

  if (!posthogKey) {
    return null;
  }

  try {
    // For server-side, we'll use the Node.js SDK approach
    // Since posthog-js is browser-only, we'll track via API calls
    posthogServer = null; // We'll use fetch API instead
    return null;
  } catch (error) {
    console.error('Failed to initialize PostHog server:', error);
    return null;
  }
}

/**
 * Track an event server-side by making a direct API call to PostHog
 */
export async function trackServerEvent(
  eventName: string,
  properties?: Record<string, any>,
  userId?: string
) {
  const posthogKey = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  const posthogHost = process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com';

  if (!posthogKey) {
    return;
  }

  try {
    const response = await fetch(`${posthogHost}/batch/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        api_key: posthogKey,
        batch: [
          {
            event: eventName,
            properties: {
              ...properties,
              $lib: 'posthog-node',
              $lib_version: '1.0.0',
            },
            distinct_id: userId || 'anonymous',
            timestamp: new Date().toISOString(),
          },
        ],
      }),
    });

    if (!response.ok) {
      console.error('PostHog tracking failed:', response.statusText);
    }
  } catch (error) {
    console.error('Error tracking event to PostHog:', error);
  }
}

/**
 * Track API request events server-side
 */
export async function trackAPIRequest(
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
  await trackServerEvent('api_request', {
    endpoint,
    method,
    ...properties,
  }, properties?.userId);
}

/**
 * Track script generator events server-side
 */
export const ScriptGeneratorServerTracking = {
  generateInitial: async (properties?: {
    platform?: string;
    promptLength?: number;
    userId?: string;
    status?: number;
    error?: string;
    duration?: number;
  }) => {
    await trackServerEvent('script_generator_generate_initial', properties, properties?.userId);
  },
  ask: async (properties?: {
    questionLength?: number;
    userId?: string;
    status?: number;
    error?: string;
    duration?: number;
  }) => {
    await trackServerEvent('script_generator_ask', properties, properties?.userId);
  },
  edit: async (properties?: {
    editRequestLength?: number;
    userId?: string;
    status?: number;
    error?: string;
    duration?: number;
  }) => {
    await trackServerEvent('script_generator_edit', properties, properties?.userId);
  },
  regenerateHook: async (properties?: {
    userId?: string;
    status?: number;
    error?: string;
    duration?: number;
    [key: string]: any;
  }) => {
    await trackServerEvent('script_generator_regenerate_hook', properties, properties?.userId);
  },
};

/**
 * Track content engine events server-side
 */
export const ContentEngineServerTracking = {
  generatePlan: async (properties?: {
    planName?: string;
    platforms?: string[];
    platformCount?: number;
    userId?: string;
  }) => {
    await trackServerEvent('content_engine_generate_plan', properties, properties?.userId);
  },
  planGenerated: async (properties?: {
    planId?: string;
    itemCount?: number;
    duration?: number;
    userId?: string;
  }) => {
    await trackServerEvent('content_engine_plan_generated', properties, properties?.userId);
  },
  planGenerationFailed: async (properties?: {
    error?: string;
    userId?: string;
    duration?: number;
  }) => {
    await trackServerEvent('content_engine_plan_generation_failed', properties, properties?.userId);
  },
};

