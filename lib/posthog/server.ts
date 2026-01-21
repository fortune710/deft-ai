import { PostHog } from 'posthog-node';

/**
 * Initialize PostHog server instance for server-side tracking
 */
export function getPostHogServer(): PostHog | null {
  const posthogKey = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  const posthogHost = process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com';

  if (!posthogKey) {
    throw new Error("PostHog Keey Missing in environment variables");
  }


  const client = new PostHog(posthogKey,{
    host: posthogHost
  });


  return client;
}

/**
 * Track an event server-side by using the PostHog Node client
 */
export async function trackServerEvent(
  eventName: string,
  properties?: Record<string, any>,
  userId?: string
) {

  const client  = getPostHogServer();

  client?.capture({
    event: eventName,
    properties: {
      ...properties,
    },
    distinctId: userId || 'anonymous',

  })

  client?.shutdown();
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

export function trackServerError(error: Error, properties?: Record<string, any>, userId?: string) {
  const client  = getPostHogServer();
  client?.captureException(error, userId, properties);
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

