import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { fetchWithTimeout, TOKEN_TIMEOUT_MS, UPLOAD_TIMEOUT_MS } from '@/utils/fetch-utils';
import { checkRateLimit, getRateLimitKey, rateLimitResponse } from '@/utils/rate-limit';
import { logger } from '@/utils/logger';

export async function POST(request: NextRequest) {
  try {
    const rl = checkRateLimit(getRateLimitKey(request, 'commons-upload'), { limit: 30 });
    if (!rl.success) return rateLimitResponse(rl);

    const session = await getServerSession(authOptions);

    if (!session?.accessToken) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Parse form data
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const filename = formData.get('filename') as string;
    const text = formData.get('text') as string;
    const comment = formData.get('comment') as string;

    if (!file || !filename) {
      return NextResponse.json(
        { error: 'File and filename are required' },
        { status: 400 }
      );
    }

    logger.info('commons/upload', 'Uploading to Commons', {
      filename,
      size: file.size,
      type: file.type
    });

    // Get CSRF token
    const tokenResponse = await fetchWithTimeout(
      'https://commons.wikimedia.org/w/api.php?' +
      new URLSearchParams({
        action: 'query',
        meta: 'tokens',
        format: 'json'
      }),
      {
        headers: {
          'Authorization': `Bearer ${session.accessToken}`,
          'User-Agent': 'WikiPortraits/1.0 (https://github.com/flogvit/wikiportraits)'
        },
        timeoutMs: TOKEN_TIMEOUT_MS
      }
    );

    const tokenData = await tokenResponse.json();
    const csrfToken = tokenData.query?.tokens?.csrftoken;

    if (!csrfToken) {
      return NextResponse.json(
        { error: 'Failed to obtain CSRF token' },
        { status: 500 }
      );
    }

    // Prepare upload form data
    const uploadFormData = new FormData();
    uploadFormData.append('action', 'upload');
    uploadFormData.append('filename', filename);
    uploadFormData.append('file', file);
    uploadFormData.append('text', text || '');
    uploadFormData.append('comment', comment || 'Uploaded via WikiPortraits');
    uploadFormData.append('format', 'json');
    uploadFormData.append('token', csrfToken);

    // Upload to Commons
    const uploadResponse = await fetchWithTimeout(
      'https://commons.wikimedia.org/w/api.php',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.accessToken}`,
          'User-Agent': 'WikiPortraits/1.0 (https://github.com/flogvit/wikiportraits)'
        },
        body: uploadFormData,
        timeoutMs: UPLOAD_TIMEOUT_MS
      }
    );

    const uploadResult = await uploadResponse.json();

    if (uploadResult.error) {
      logger.error('commons/upload', 'Commons upload error', uploadResult.error);
      return NextResponse.json(
        { error: uploadResult.error.info || 'Upload failed' },
        { status: 500 }
      );
    }

    if (!uploadResult.upload) {
      return NextResponse.json(
        { error: 'Upload response missing upload data' },
        { status: 500 }
      );
    }

    // Check upload result
    if (uploadResult.upload.result === 'Success') {
      logger.info('commons/upload', 'Upload successful');

      const filename = uploadResult.upload.filename;

      // MediaWiki upload API doesn't return pageid directly, so we need to query for it
      const pageInfoResponse = await fetchWithTimeout(
        'https://commons.wikimedia.org/w/api.php?' +
        new URLSearchParams({
          action: 'query',
          titles: `File:${filename}`,
          format: 'json'
        }),
        {
          headers: {
            'Authorization': `Bearer ${session.accessToken}`,
            'User-Agent': 'WikiPortraits/1.0 (https://github.com/flogvit/wikiportraits)'
          }
        }
      );

      const pageInfoData = await pageInfoResponse.json();
      const pages = pageInfoData.query?.pages || {};
      const pageId = Object.keys(pages)[0]; // Get the first (and only) page ID

      logger.debug('commons/upload', 'Retrieved pageId', { pageId, filename });

      return NextResponse.json({
        success: true,
        filename: filename,
        url: uploadResult.upload.imageinfo?.url,
        descriptionUrl: uploadResult.upload.imageinfo?.descriptionurl,
        pageId: parseInt(pageId, 10)
      });
    } else if (uploadResult.upload.result === 'Warning') {
      // Handle warnings (duplicate file, etc.)
      const warnings = uploadResult.upload.warnings || {};
      return NextResponse.json({
        success: false,
        warnings,
        error: `Upload warning: ${Object.keys(warnings).join(', ')}`
      }, { status: 400 });
    } else {
      return NextResponse.json(
        { error: `Upload failed: ${uploadResult.upload.result}` },
        { status: 500 }
      );
    }
  } catch (error) {
    logger.error('commons/upload', 'Image upload failed', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to upload image' },
      { status: 500 }
    );
  }
}
