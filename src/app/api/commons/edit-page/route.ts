import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';
import { fetchWithTimeout, TOKEN_TIMEOUT_MS } from '@/utils/fetch-utils';
import { checkRateLimit, getRateLimitKey, rateLimitResponse } from '@/utils/rate-limit';
import { logger } from '@/utils/logger';
import { parseBody, editPageSchema } from '@/lib/api-validation';

/**
 * Edit a Commons file page with new wikitext
 * Requires authentication via session
 */
export async function POST(request: NextRequest) {
  try {
    const rl = checkRateLimit(getRateLimitKey(request, 'commons-edit-page'), { limit: 30 });
    if (!rl.success) return rateLimitResponse(rl);

    const session = await getServerSession(authOptions);

    if (!session?.accessToken) {
      return NextResponse.json({
        success: false,
        error: 'Not authenticated'
      }, { status: 401 });
    }

    const parsed = parseBody(editPageSchema, await request.json());
    if (!parsed.success) return parsed.response;
    const { filename, wikitext, summary } = parsed.data;

    // Step 1: Get CSRF token
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

    // Step 2: Edit the page
    const editFormData = new FormData();
    editFormData.append('action', 'edit');
    editFormData.append('format', 'json');
    editFormData.append('title', filename.startsWith('File:') ? filename : `File:${filename}`);
    editFormData.append('text', wikitext);
    editFormData.append('summary', summary || 'Updated categories and metadata via WikiPortraits');
    editFormData.append('token', csrfToken);

    const editResponse = await fetchWithTimeout('https://commons.wikimedia.org/w/api.php', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.accessToken}`,
        'User-Agent': 'WikiPortraits/1.0 (https://github.com/flogvit/wikiportraits-uploader)'
      },
      body: editFormData
    });

    if (!editResponse.ok) {
      throw new Error(`Edit request failed: ${editResponse.status}`);
    }

    const editResult = await editResponse.json();

    if (editResult.error) {
      return NextResponse.json({
        success: false,
        error: editResult.error.info || 'Edit failed'
      }, { status: 400 });
    }

    if (editResult.edit?.result === 'Success') {
      return NextResponse.json({
        success: true,
        message: 'Page updated successfully',
        newRevisionId: editResult.edit.newrevid
      });
    }

    return NextResponse.json({
      success: false,
      error: 'Unknown error during edit'
    }, { status: 500 });

  } catch (error) {
    logger.error('commons/edit-page', 'Page edit failed', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to edit page'
    }, { status: 500 });
  }
}
