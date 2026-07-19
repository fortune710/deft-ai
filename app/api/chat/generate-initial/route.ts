import { NextRequest, NextResponse } from 'next/server';
import { generateInitialScript } from '@/lib/ai/instant-execution-generator';
import { ScriptGeneratorServerTracking } from '@/lib/posthog/server';
import { logger } from '@/lib/logger.server';
import { api } from '@/convex/_generated/api';
import { ConvexServerAuthError, getAuthenticatedConvexClient, toUserContentProfile } from '@/lib/convex/server';

const log = logger.child({ module: 'app/api/chat/generate-initial/route' });

export async function POST(req: NextRequest) {
  const startTime = Date.now();
  let userId: string | undefined;
  let platform: string | undefined;
  let promptLength: number | undefined;

  try {
    const body = await req.json();
    const { prompt, platform: platformParam, model } = body;
    platform = platformParam;
    promptLength = prompt?.length;

    if (!prompt) {
      await ScriptGeneratorServerTracking.generateInitial({
        status: 400,
        error: 'Prompt is required',
        duration: Date.now() - startTime,
      });
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
    }

    const authenticated = await getAuthenticatedConvexClient('generate_initial_script');
    userId = authenticated.userId;
    const profileDocument = await authenticated.convex.query(api.userContentProfiles.getCurrent, {});
    const profile = toUserContentProfile(profileDocument);

    const result = await generateInitialScript(prompt, profile, platform, model as any);

    await ScriptGeneratorServerTracking.generateInitial({
      platform,
      promptLength,
      userId,
      status: 200,
      duration: Date.now() - startTime,
    });

    return NextResponse.json(result);
  } catch (error) {
    const status = error instanceof ConvexServerAuthError ? error.statusCode : 500;
    log.error('Failed to generate initial script', {
      userId: userId || 'unknown',
      action: 'generate_initial_script',
      statusCode: status,
      error,
      message: error instanceof Error ? error.message : String(error),
    });
    await ScriptGeneratorServerTracking.generateInitial({
      platform,
      promptLength,
      userId,
      status,
      error: error instanceof Error ? error.message : 'Failed to generate script',
      duration: Date.now() - startTime,
    });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate script' },
      { status }
    );
  }
}
