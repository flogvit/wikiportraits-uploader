import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';
import { fetchWithTimeout, TOKEN_TIMEOUT_MS } from '@/utils/fetch-utils';
import { checkRateLimit, getRateLimitKey, rateLimitResponse } from '@/utils/rate-limit';
import { logger } from '@/utils/logger';

interface DepictsItem {
  qid: string;
  label: string;
}

/**
 * Update depicts (P180) statements on a Commons file
 * Only updates if the depicts list has changed from what's currently on Commons
 */
export async function POST(request: NextRequest) {
  try {
    const rl = checkRateLimit(getRateLimitKey(request, 'commons-update-depicts'), { limit: 30 });
    if (!rl.success) return rateLimitResponse(rl);

    const session = await getServerSession(authOptions);

    if (!session?.accessToken) {
      return NextResponse.json({
        success: false,
        error: 'Not authenticated'
      }, { status: 401 });
    }

    const body = await request.json();
    const { pageId, depicts } = body as { pageId: number; depicts: DepictsItem[] };

    if (!pageId || !depicts) {
      return NextResponse.json({
        success: false,
        error: 'pageId and depicts are required'
      }, { status: 400 });
    }

    // MediaInfo entity ID is M{pageId}
    const mediaInfoId = `M${pageId}`;

    // Step 1: Fetch existing depicts to check if update is needed
    const existingUrl = new URL('https://commons.wikimedia.org/w/api.php');
    existingUrl.searchParams.set('action', 'wbgetentities');
    existingUrl.searchParams.set('ids', mediaInfoId);
    existingUrl.searchParams.set('props', 'claims');
    existingUrl.searchParams.set('format', 'json');

    const existingResponse = await fetchWithTimeout(existingUrl.toString(), {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${session.accessToken}`,
        'User-Agent': 'WikiPortraits/1.0 (https://github.com/flogvit/wikiportraits-uploader)'
      }
    });

    if (!existingResponse.ok) {
      throw new Error(`Failed to fetch existing depicts: ${existingResponse.status}`);
    }

    const existingData = await existingResponse.json();
    const existingEntity = existingData.entities?.[mediaInfoId];
    const existingP180 = existingEntity?.claims?.P180 || [];

    // Extract existing Q-IDs
    const existingQids = new Set(
      existingP180.map((claim: any) => claim.mainsnak?.datavalue?.value?.id).filter(Boolean)
    );

    // Check if the new depicts list matches existing
    const newQids = new Set(depicts.map(d => d.qid));
    const needsUpdate =
      existingQids.size !== newQids.size ||
      ![...newQids].every(qid => existingQids.has(qid));

    if (!needsUpdate) {
      return NextResponse.json({
        success: true,
        message: 'Depicts already up to date - no changes needed'
      });
    }

    logger.info('commons/update-depicts', 'Depicts update needed', {
      existing: [...existingQids],
      new: [...newQids]
    });

    // Step 2: Get CSRF token
    const tokenUrl = new URL('https://commons.wikimedia.org/w/api.php');
    tokenUrl.searchParams.set('action', 'query');
    tokenUrl.searchParams.set('meta', 'tokens');
    tokenUrl.searchParams.set('format', 'json');

    const tokenResponse = await fetchWithTimeout(tokenUrl.toString(), {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${session.accessToken}`,
        'User-Agent': 'WikiPortraits/1.0 (https://github.com/flogvit/wikiportraits-uploader)'
      },
      timeoutMs: TOKEN_TIMEOUT_MS
    });

    if (!tokenResponse.ok) {
      throw new Error(`Failed to fetch CSRF token: ${tokenResponse.status}`);
    }

    const tokenData = await tokenResponse.json();
    const csrfToken = tokenData.query?.tokens?.csrftoken;

    if (!csrfToken) {
      throw new Error('CSRF token not found in response');
    }

    // Step 2: Build depicts statements
    const depictsStatements = depicts.map(item => {
      const numericId = parseInt(item.qid.replace('Q', ''));

      return {
        mainsnak: {
          snaktype: 'value',
          property: 'P180',
          datavalue: {
            type: 'wikibase-entityid',
            value: {
              'numeric-id': numericId,
              'id': item.qid
            }
          }
        },
        type: 'statement',
        rank: 'normal'
      };
    });

    // Step 3: Replace only P180 statements (preserves other structured data)
    const formData = new FormData();
    formData.append('action', 'wbeditentity');
    formData.append('format', 'json');
    formData.append('id', mediaInfoId);
    // DO NOT use 'clear': true - it deletes ALL structured data including copyright, license, etc.
    // Instead, we clear only P180 and set new values
    formData.append('data', JSON.stringify({
      claims: {
        P180: depictsStatements
      }
    }));
    formData.append('token', csrfToken);
    formData.append('summary', `Updated depicts statements via WikiPortraits (${depicts.length} entities)`);

    const editResponse = await fetchWithTimeout('https://commons.wikimedia.org/w/api.php', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.accessToken}`,
        'User-Agent': 'WikiPortraits/1.0 (https://github.com/flogvit/wikiportraits-uploader)'
      },
      body: formData
    });

    const editResult = await editResponse.json();

    if (editResult.error) {
      return NextResponse.json({
        success: false,
        error: editResult.error.info || 'Failed to update depicts'
      }, { status: 400 });
    }

    if (editResult.success) {
      return NextResponse.json({
        success: true,
        message: `Updated depicts statements: ${depicts.map(d => d.label).join(', ')}`
      });
    }

    return NextResponse.json({
      success: false,
      error: 'Unknown error updating depicts'
    }, { status: 500 });

  } catch (error) {
    logger.error('commons/update-depicts', 'Depicts update failed', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update depicts'
    }, { status: 500 });
  }
}
