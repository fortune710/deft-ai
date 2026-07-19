import { NextRequest, NextResponse } from 'next/server';
import { regenerateHook } from '@/lib/ai/instant-execution-generator';
import { ScriptGeneratorServerTracking } from '@/lib/posthog/server';
import { logger } from '@/lib/logger.server';
import { api } from '@/convex/_generated/api';
import { ConvexServerAuthError, getAuthenticatedConvexClient, toUserContentProfile } from '@/lib/convex/server';

const log = logger.child({ module: 'app/api/chat/regenerate-hook/route' });

export async function POST(req: NextRequest) {
  const startTime = Date.now();
  let userId: string | undefined;

  try {
    const { hookIndex, currentHooks, guidance } = await req.json();

    if (hookIndex === undefined || !currentHooks) {
      await ScriptGeneratorServerTracking.regenerateHook({
        status: 400,
        error: 'Hook index and current hooks are required',
        duration: Date.now() - startTime,
      });
      return NextResponse.json({ error: 'Hook index and current hooks are required' }, { status: 400 });
    }

    const authenticated = await getAuthenticatedConvexClient('regenerate_script_hook');
    userId = authenticated.userId;
    const profileDocument = await authenticated.convex.query(api.userContentProfiles.getCurrent, {});
    const profile = toUserContentProfile(profileDocument);

    const result = await regenerateHook(hookIndex, currentHooks, guidance || '', profile);

    await ScriptGeneratorServerTracking.regenerateHook({
      userId,
      status: 200,
      duration: Date.now() - startTime,
    });

    return NextResponse.json(result);
  } catch (error) {
    const status = error instanceof ConvexServerAuthError ? error.statusCode : 500;
    log.error('Failed to regenerate script hook', {
      userId: userId || 'unknown',
      action: 'regenerate_script_hook',
      statusCode: status,
      error,
      message: error instanceof Error ? error.message : String(error),
    });
    await ScriptGeneratorServerTracking.regenerateHook({
      userId,
      status,
      error: error instanceof Error ? error.message : 'Failed to regenerate hook',
      duration: Date.now() - startTime,
    });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to regenerate hook' },
      { status }
    );
  }
}
