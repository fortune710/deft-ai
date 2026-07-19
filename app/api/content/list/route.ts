import { NextRequest, NextResponse } from 'next/server';

import { api } from '@/convex/_generated/api';
import { ConvexServerAuthError, getAuthenticatedConvexClient } from '@/lib/convex/server';
import { logger } from '@/lib/logger.server';
import type { Platform } from '@/types/content-engine';

const log = logger.child({ module: 'app/api/content/list/route' });
const platforms = new Set<Platform>([
  'youtube', 'instagram', 'tiktok', 'twitter', 'linkedin', 'facebook',
]);

export async function GET(request: NextRequest) {
  let userId = 'unknown';
  const action = 'list_content_analytics';

  try {
    const authenticated = await getAuthenticatedConvexClient(action);
    userId = authenticated.userId;
    const { searchParams } = new URL(request.url);
    const platformParam = searchParams.get('platform');
    const status = searchParams.get('status') || undefined;

    if (platformParam && !platforms.has(platformParam as Platform)) {
      log.warn('Rejected unsupported content analytics platform filter', {
        userId,
        action,
        statusCode: 400,
        platform: platformParam,
      });
      return NextResponse.json({ error: 'Unsupported platform filter' }, { status: 400 });
    }

    const filters: { platform?: Platform; status?: string } = {};
    if (platformParam) filters.platform = platformParam as Platform;
    if (status) filters.status = status;
    const records = await authenticated.convex.query(api.contentAnalytics.list, filters);
    const content = records.map(({ _id, _creationTime, ...record }) => ({
      ...record,
      id: _id,
      creation_time: _creationTime,
    }));

    log.info('Listed content analytics from Convex', {
      userId,
      action,
      statusCode: 200,
      platform: platformParam,
      status,
      resultCount: content.length,
    });
    return NextResponse.json({ content });
  } catch (error) {
    const statusCode = error instanceof ConvexServerAuthError ? error.statusCode : 500;
    log.error('Failed to list content analytics from Convex', {
      userId,
      action,
      statusCode,
      error,
      message: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: statusCode },
    );
  }
}
