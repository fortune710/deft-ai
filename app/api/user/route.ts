import { auth, currentUser } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { logger } from '@/lib/logger.server';

const log = logger.child({ module: 'app/api/user/route' });

export async function GET() {
  try {
    const { userId } = await auth();

    if (!userId) {
      log.warn('Rejected unauthenticated user request', {
        userId: 'signed_out',
        action: 'get_current_user',
        statusCode: 401,
      });
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await currentUser();
    if (!user) {
      log.warn('Clerk user was not found', {
        userId,
        action: 'get_current_user',
        statusCode: 404,
      });
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const email = user.primaryEmailAddress?.emailAddress ?? null;
    log.info('Returned current Clerk user', {
      userId,
      action: 'get_current_user',
      statusCode: 200,
    });

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email,
        firstName: user.firstName,
        lastName: user.lastName,
        imageUrl: user.imageUrl,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
    });
  } catch (error) {
    log.error('Failed to return current Clerk user', {
      userId: 'unknown',
      action: 'get_current_user',
      statusCode: 500,
      error,
      message: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
