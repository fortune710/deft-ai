import { SpeechClient } from '@google-cloud/speech';
import { AssemblyAI } from 'assemblyai';
import { createClient } from '@supabase/supabase-js';
import type { TranscriptionResult, TranscriptSegment } from '@/types/video-analytics';
import { getAudioStoragePath, SUPABASE_STORAGE_BUCKETS } from '@/lib/utils';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

let assembly: AssemblyAI | null = null;

function initializeSpeechClient(): AssemblyAI {
  if (assembly) {
    return assembly;
  }

  const apiKey = process.env.ASSEMBLY_AI_API_KEY;

  if (!apiKey) {
    throw new Error('ASSEMBLY_AI_API_KEY environment variable is not set');
  }

  try {
    assembly = new AssemblyAI({ apiKey });
    return assembly;
  } catch (err) {
    throw new Error(`Failed to initialize Speech client: ${err instanceof Error ? err.message : 'Unknown error'}`);
  }
}

export async function transcribeAudioFile(videoId: string): Promise<TranscriptionResult> {
  try {
    const client = initializeSpeechClient();
    const audioStoragePath = getAudioStoragePath(videoId);

    const { data: audio } = await supabase.storage
      .from(SUPABASE_STORAGE_BUCKETS.VIDEOS)
      .getPublicUrl(audioStoragePath);

    if (!audio || !audio.publicUrl) {
      return { success: false, error: `Failed to get audio URL` };
    }

    const params = {
      audio_url: audio.publicUrl,
      speech_models: ['universal'],
    };

    const response = await client.transcripts.transcribe(params);

    let fullTranscript = response.text || '';
    
    const paragraphTranscript = await client.transcripts.paragraphs(response.id);
    const segments: TranscriptSegment[] = paragraphTranscript.paragraphs.map(paragraph => ({
      text: paragraph.text,
      start_time: paragraph.start,
      end_time: paragraph.end,
      confidence: paragraph.confidence,
    }));
    
    return {
      success: true,
      transcript: fullTranscript.trim(),
      segments,
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error during transcription',
    };
  }
}

export function formatTranscriptWithTimestamps(segments: TranscriptSegment[]): string {
  let formatted = '';
  let currentTimestamp = 0;

  for (const segment of segments) {
    while (currentTimestamp < segment.start_time) {
      currentTimestamp += 10;
      formatted += `\n[${formatTimestamp(currentTimestamp)}]\n`;
    }

    formatted += segment.text + ' ';
  }

  return formatted.trim();
}

function formatTimestamp(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

export function extractHookTranscript(transcript: string, segments?: TranscriptSegment[]): string {
  if (segments && segments.length > 0) {
    const hookSegments = segments.filter(seg => seg.start_time < 5);
    return hookSegments.map(seg => seg.text).join(' ');
  }

  const words = transcript.split(' ');
  return words.slice(0, 30).join(' ');
}
