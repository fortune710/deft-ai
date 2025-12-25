# PostHog Setup Guide

This project uses PostHog for analytics and event tracking.

## Environment Variables

Add the following environment variables to your `.env.local` file:

```env
NEXT_PUBLIC_POSTHOG_KEY=your_posthog_project_api_key
NEXT_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com
```

If you're using PostHog Cloud EU, use:
```env
NEXT_PUBLIC_POSTHOG_HOST=https://eu.i.posthog.com
```

## Features

### 1. Automatic Page View Tracking
Page views are automatically tracked when users navigate between pages. The `PostHogPageView` component handles this in the root layout.

### 2. Script Generator Tracking
The following events are tracked for the script generator:
- `script_generator_generate_initial` - When a user generates an initial script
- `script_generator_ask` - When a user asks a question
- `script_generator_edit` - When a user requests an edit
- `script_generator_regenerate_hook` - When a user regenerates a hook

Each event includes:
- User ID
- Request duration
- Status code
- Error messages (if any)
- Relevant metadata (platform, prompt length, etc.)

### 3. Content Engine Tracking
The following events are tracked for the content engine:
- `content_engine_generate_plan` - When a user starts generating a content plan
- `content_engine_plan_generated` - When a plan is successfully generated
- `content_engine_plan_generation_failed` - When plan generation fails

Each event includes:
- User ID
- Plan name
- Platforms selected
- Item count
- Duration
- Error messages (if any)

### 4. API Request Tracking
All API requests are tracked with:
- Endpoint path
- HTTP method
- Status code
- Duration
- User ID
- Error messages (if any)

## Usage

### Client-Side Tracking

```typescript
import { trackEvent, ScriptGeneratorTracking } from '@/lib/posthog/track';

// Track a custom event
trackEvent('custom_event', { property: 'value' });

// Track script generator events
ScriptGeneratorTracking.generateInitial({ platform: 'youtube', promptLength: 100 });
```

### Server-Side Tracking

```typescript
import { trackServerEvent, ScriptGeneratorServerTracking } from '@/lib/posthog/server';

// Track a custom server event
await trackServerEvent('server_event', { property: 'value' }, userId);

// Track script generator events
await ScriptGeneratorServerTracking.generateInitial({
  platform: 'youtube',
  promptLength: 100,
  userId: 'user-123',
  status: 200,
  duration: 1500,
});
```

## Scalability

The tracking system is designed to be scalable:

1. **Modular Structure**: Tracking functions are organized by feature area (ScriptGenerator, ContentEngine)
2. **Consistent API**: All tracking functions follow the same pattern
3. **Type Safety**: TypeScript ensures type safety for all tracking calls
4. **Error Handling**: All tracking calls are wrapped in try-catch to prevent failures from affecting the app
5. **Performance**: Server-side tracking is non-blocking and won't slow down API responses

## Adding New Tracking

To add tracking for a new feature:

1. Add tracking functions to `lib/posthog/track.ts` (client-side) or `lib/posthog/server.ts` (server-side)
2. Call the tracking function at the appropriate point in your code
3. Include relevant metadata (user ID, duration, status, etc.)

Example:
```typescript
// In lib/posthog/track.ts
export const NewFeatureTracking = {
  action: (properties?: { ... }) => {
    trackEvent('new_feature_action', properties);
  },
};
```

