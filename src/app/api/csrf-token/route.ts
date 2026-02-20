import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { fetchCSRFToken } from '@/utils/commons-api';
import { checkRateLimit, getRateLimitKey, rateLimitResponse } from '@/utils/rate-limit';
import { logger } from '@/utils/logger';

export async function GET(request: NextRequest) {
  try {
    const rl = checkRateLimit(getRateLimitKey(request, 'csrf-token'), { limit: 60 });
    if (!rl.success) return rateLimitResponse(rl);

    const session = await getServerSession();
    
    if (!session?.accessToken) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const csrfToken = await fetchCSRFToken(session.accessToken as string);

    return NextResponse.json({
      csrfToken,
    });

  } catch (error) {
    logger.error('csrf-token', 'CSRF token fetch error', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch CSRF token', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}

export async function POST() {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 }
  );
}