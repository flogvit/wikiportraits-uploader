import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { createClaim } from '@/utils/wikidata-api';
import { checkRateLimit, getRateLimitKey, rateLimitResponse } from '@/utils/rate-limit';
import { parseBody, createClaimSchema } from '@/lib/api-validation';

export async function POST(request: NextRequest) {
  const rl = checkRateLimit(getRateLimitKey(request, 'wikidata-create-claim'), { limit: 30 });
  if (!rl.success) return rateLimitResponse(rl);

  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });

  if (!token?.accessToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const parsed = parseBody(createClaimSchema, await request.json());
  if (!parsed.success) return parsed.response;
  const { entityId, propertyId, value } = parsed.data;

  try {
    const result = await createClaim(token.accessToken as string, entityId, propertyId, value);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
