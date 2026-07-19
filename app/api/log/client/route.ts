import { NextRequest, NextResponse } from 'next/server';

import { logger } from '@/lib/logger.server';

const log = logger.child({ module: 'app/api/log/client/route' });
const levels = new Set(['debug', 'info', 'warn', 'error']);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const level = levels.has(body.level) ? body.level as 'debug' | 'info' | 'warn' | 'error' : 'info';
    const message = typeof body.message === 'string' ? body.message : 'Client log';
    const { level: _level, message: _message, ...attributes } = body;
    const userId = typeof attributes.userId === 'string' ? attributes.userId : 'unknown';
    const action = typeof attributes.action === 'string' ? attributes.action : 'forward_client_log';

    log[level](message, {
      ...attributes,
      userId,
      action,
      source: 'browser',
      statusCode: 200,
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    log.error('Failed to forward browser log', {
      userId: 'unknown',
      action: 'forward_client_log',
      statusCode: 400,
      error,
    });
    return NextResponse.json({ error: 'Invalid log payload' }, { status: 400 });
  }
}
