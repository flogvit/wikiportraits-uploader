import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { createClaim } from '@/utils/wikidata-api';
import { checkRateLimit, getRateLimitKey, rateLimitResponse } from '@/utils/rate-limit';

export async function POST(request: NextRequest) {
  const rl = checkRateLimit(getRateLimitKey(request, 'wikidata-create-claim'), { limit: 30 });
  if (!rl.success) return rateLimitResponse(rl);

  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });

  if (!token?.accessToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { entityId, propertyId, value } = await request.json();

  if (!entityId || !propertyId || !value) {
    return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
  }

  try {
    const result = await createClaim(token.accessToken as string, entityId, propertyId, value);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
