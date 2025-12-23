import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { deleteVideoFiles } from '@/lib/services/video-processor';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: expiredVideos, error: fetchError } = await supabase
      .from('video_analytics')
      .select('id, video_file_path, audio_file_path')
      .lt('expires_at', new Date().toISOString())
      .not('video_file_path', 'is', null);

    if (fetchError) {
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }

    if (!expiredVideos || expiredVideos.length === 0) {
      return NextResponse.json({ message: 'No expired videos to clean up', deleted_count: 0 });
    }

    let deletedCount = 0;

    for (const video of expiredVideos) {
      await deleteVideoFiles(video.video_file_path, video.audio_file_path);

      const { error: updateError } = await supabase
        .from('video_analytics')
        .update({
          video_file_path: null,
          audio_file_path: null,
        })
        .eq('id', video.id);

      if (!updateError) {
        deletedCount++;
      }
    }

    return NextResponse.json({
      message: `Cleaned up ${deletedCount} expired videos`,
      deleted_count: deletedCount,
    });
  } catch (err) {
    console.error('Error in cleanup cron:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
