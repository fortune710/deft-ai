import { SpeechClient } from '@google-cloud/speech';
import { createClient } from '@supabase/supabase-js';
import type { TranscriptionResult, TranscriptSegment } from '@/types/video-analytics';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

let speechClient: SpeechClient | null = null;

function initializeSpeechClient(): SpeechClient {
  if (speechClient) {
    return speechClient;
  }

  const credentials = process.env.GOOGLE_APPLICATION_CREDENTIALS;

  if (!credentials) {
    throw new Error('GOOGLE_APPLICATION_CREDENTIALS environment variable is not set');
  }

  try {
    speechClient = new SpeechClient({
      keyFilename: credentials,
    });
    return speechClient;
  } catch (err) {
    throw new Error(`Failed to initialize Speech client: ${err instanceof Error ? err.message : 'Unknown error'}`);
  }
}

export async function transcribeAudioFile(videoId: string, audioStoragePath: string): Promise<TranscriptionResult> {
  try {
    const client = initializeSpeechClient();

    const { data: audioData, error: downloadError } = await supabase.storage
      .from('temp-videos')
      .download(audioStoragePath);

    if (downloadError || !audioData) {
      return { success: false, error: `Failed to download audio: ${downloadError?.message}` };
    }

    const audioBytes = Buffer.from(await audioData.arrayBuffer());

    const config = {
      encoding: 'MP3' as const,
      sampleRateHertz: 16000,
      languageCode: 'en-US',
      enableAutomaticPunctuation: true,
      enableWordTimeOffsets: true,
      model: 'video',
      useEnhanced: true,
    };

    const audio = {
      content: audioBytes.toString('base64'),
    };

    const request = {
      config,
      audio,
    };

    const [response] = await client.recognize(request);

    if (!response.results || response.results.length === 0) {
      return { success: false, error: 'No transcription results returned' };
    }

    const segments: TranscriptSegment[] = [];
    let fullTranscript = '';

    for (const result of response.results) {
      if (!result.alternatives || result.alternatives.length === 0) continue;

      const alternative = result.alternatives[0];
      if (!alternative.transcript) continue;

      fullTranscript += alternative.transcript + ' ';

      if (alternative.words && alternative.words.length > 0) {
        const firstWord = alternative.words[0];
        const lastWord = alternative.words[alternative.words.length - 1];

        if (firstWord.startTime && lastWord.endTime) {
          const startSeconds = Number(firstWord.startTime.seconds || 0) +
                              Number(firstWord.startTime.nanos || 0) / 1e9;
          const endSeconds = Number(lastWord.endTime.seconds || 0) +
                            Number(lastWord.endTime.nanos || 0) / 1e9;

          segments.push({
            text: alternative.transcript,
            start_time: startSeconds,
            end_time: endSeconds,
            confidence: alternative.confidence || undefined,
          });
        }
      }
    }

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
