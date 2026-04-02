import { NextRequest, NextResponse } from 'next/server';
import { generateEditProposal } from '@/lib/ai/instant-execution-generator';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';
import { ScriptGenerationError } from '@/lib/errors/content-generation/scripts';

export async function POST(req: NextRequest) {
  const startTime = Date.now();
  let log = logger.child({ endpoint: 'api/chat/edit' });

  try {
    const body = await req.json();
    const { editRequest = '', currentContent, sessionId = 'unknown', model = 'unknown' } = body;
    let userId = body.userId || 'unknown';

    log = log.child({ sessionId, model, userId });
    log.info('Processing edit request', { editRequestLength: editRequest?.length });

    if (!editRequest) {
      throw new ScriptGenerationError(
        'Edit request is required',
        model,
        editRequest,
        userId,
        sessionId
      );
    }

    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user && userId === 'unknown') {
      throw new ScriptGenerationError(
        'Unauthorized' + `Status Code: 401`,
        model,
        editRequest,
        userId,
        sessionId
      );
    }

    const { data: profile, error: profileError } = await supabase
      .from('user_content_profiles')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (profileError) {
      throw new ScriptGenerationError(
        `Failed to fetch user profile: ${profileError.message}`,
        model,
        editRequest,
        userId,
        sessionId
      );
    }

    let result;
    try {
      result = await generateEditProposal(editRequest, currentContent, profile, model);
    } catch (genError) {
      throw new ScriptGenerationError(
        genError instanceof Error ? genError.message : 'Failed to generate edit proposal',
        model,
        editRequest,
        userId,
        sessionId
      );
    }

    log.info('Generated edit proposal successfully', {
      content: result.content,
      proposedChangesCount: result.proposedChanges?.length || 0,
      proposedChanges: result.proposedChanges,
      duration: Date.now() - startTime
    });

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof ScriptGenerationError) {
      log.error('Script generation error encountered', {
        err: error,
        duration: Date.now() - startTime,
        model: error.model,
        userId: error.userId,
        sessionId: error.sessionId,
      });

      const status = error.message === 'Edit request is required' ? 400 :
        error.message === 'Unauthorized' ? 401 : 500;

      return NextResponse.json({ error: error.message }, { status });
    }

    log.error('Unexpected error generating edit proposal', {
      err: error instanceof Error ? error : new Error(String(error)),
      duration: Date.now() - startTime,
    });

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to process request' },
      { status: 500 }
    );
  }
}
