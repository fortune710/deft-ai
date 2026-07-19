import { logger } from '@/lib/logger.server';

const log = logger.child({ module: 'app/api/test-audio/route' });

export async function GET() {
  log.warn('Rejected obsolete direct audio extraction test', {
    userId: 'unknown',
    action: 'test_audio_extraction',
    statusCode: 410,
  });
  return Response.json(
    { error: 'Direct extraction is disabled; use the authenticated content analysis pipeline.' },
    { status: 410 },
  );
}
