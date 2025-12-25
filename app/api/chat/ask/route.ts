import { NextRequest } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { generateAskResponse } from '@/lib/ai/instant-execution-generator';
import { ScriptGeneratorServerTracking } from '@/lib/posthog/server';

export async function POST(req: NextRequest) {
  const startTime = Date.now();
  let userId: string | undefined;
  let questionLength: number | undefined;

  try {
    const { question, currentContent } = await req.json();
    questionLength = question?.length;

    if (!question) {
      await ScriptGeneratorServerTracking.ask({
        status: 400,
        error: 'Question is required',
        duration: Date.now() - startTime,
      });
      return new Response(JSON.stringify({ error: 'Question is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      await ScriptGeneratorServerTracking.ask({
        status: 401,
        error: 'Unauthorized',
        duration: Date.now() - startTime,
      });
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    userId = user.id;

    const { data: profile } = await supabase
      .from('user_content_profiles')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    const response = await generateAskResponse(question, currentContent, profile);

    await ScriptGeneratorServerTracking.ask({
      questionLength,
      userId,
      status: 200,
      duration: Date.now() - startTime,
    });

    return new Response(JSON.stringify({ response }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error generating ask response:', error);
    await ScriptGeneratorServerTracking.ask({
      questionLength,
      userId,
      status: 500,
      error: error instanceof Error ? error.message : 'Failed to generate response',
      duration: Date.now() - startTime,
    });
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Failed to generate response' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}
