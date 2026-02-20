import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { updateInfoboxImage } from '@/utils/wikipedia-api';
import { checkRateLimit, getRateLimitKey, rateLimitResponse } from '@/utils/rate-limit';
import { parseBody, updateInfoboxSchema } from '@/lib/api-validation';

export async function POST(request: NextRequest) {
  const rl = checkRateLimit(getRateLimitKey(request, 'wikipedia-update-infobox'), { limit: 30 });
  if (!rl.success) return rateLimitResponse(rl);

  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });

  if (!token?.accessToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const parsed = parseBody(updateInfoboxSchema, await request.json());
  if (!parsed.success) return parsed.response;
  const { lang, title, image, summary } = parsed.data;

  try {
    const result = await updateInfoboxImage(token.accessToken as string, lang, title, image, summary);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
