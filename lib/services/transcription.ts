import { SpeechClient } from '@google-cloud/speech';
import { AssemblyAI } from 'assemblyai';
import type { TranscriptionResult, TranscriptSegment } from '@/types/video-analytics';

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

export async function transcribeAudioFile(audioUrl: string): Promise<TranscriptionResult> {
  try {
    const client = initializeSpeechClient();

    const params = {
      audio_url: audioUrl,
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
