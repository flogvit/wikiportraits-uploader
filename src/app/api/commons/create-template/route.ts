import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { fetchWithTimeout, TOKEN_TIMEOUT_MS } from '@/utils/fetch-utils';
import { checkRateLimit, getRateLimitKey, rateLimitResponse } from '@/utils/rate-limit';
import { logger } from '@/utils/logger';
import { parseBody, createTemplateSchema } from '@/lib/api-validation';

export async function POST(request: NextRequest) {
  try {
    const rl = checkRateLimit(getRateLimitKey(request, 'commons-create-template'), { limit: 30 });
    if (!rl.success) return rateLimitResponse(rl);

    const session = await getServerSession(authOptions);
    
    if (!session?.accessToken) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const parsed = parseBody(createTemplateSchema, await request.json());
    if (!parsed.success) return parsed.response;
    const { templateName, content, summary, templateCode } = parsed.data;

    // Support both 'content' (new) and 'templateCode' (old) parameter names
    const templateContent = content || templateCode;

    if (!templateContent) {
      return NextResponse.json(
        { error: 'Template content is required (provide content or templateCode)' },
        { status: 400 }
      );
    }

    // Get CSRF token
    const csrfResponse = await fetchWithTimeout('https://commons.wikimedia.org/w/api.php?action=query&meta=tokens&format=json', {
      headers: {
        'Authorization': `Bearer ${session.accessToken}`,
        'User-Agent': 'WikiPortraits/1.0 (https://github.com/flogvit/wikiportraits)',
      },
      timeoutMs: TOKEN_TIMEOUT_MS,
    });

    if (!csrfResponse.ok) {
      throw new Error('Failed to get CSRF token');
    }

    const csrfData = await csrfResponse.json();
    const csrfToken = csrfData.query.tokens.csrftoken;

    // Create the template page
    const createResponse = await fetchWithTimeout('https://commons.wikimedia.org/w/api.php', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Bearer ${session.accessToken}`,
        'User-Agent': 'WikiPortraits/1.0 (https://github.com/flogvit/wikiportraits)',
      },
      body: new URLSearchParams({
        action: 'edit',
        title: `Template:${templateName}`,
        text: templateContent,
        summary: summary || `Created WikiPortraits template for ${templateName}`,
        createonly: '1', // Only create, don't overwrite existing
        format: 'json',
        token: csrfToken,
      }),
    });

    if (!createResponse.ok) {
      const errorData = await createResponse.json();
      throw new Error(`Failed to create template: ${errorData?.error?.info || 'Unknown error'}`);
    }

    const result = await createResponse.json();
    
    if (result.error) {
      // Template might already exist
      if (result.error.code === 'articleexists') {
        return NextResponse.json({
          success: true,
          message: 'Template already exists',
          templateUrl: `https://commons.wikimedia.org/wiki/Template:${encodeURIComponent(templateName)}`
        });
      }
      
      throw new Error(`API Error: ${result.error.info}`);
    }

    return NextResponse.json({
      success: true,
      message: 'Template created successfully',
      templateUrl: `https://commons.wikimedia.org/wiki/Template:${encodeURIComponent(templateName)}`,
      pageId: result.edit?.pageid
    });

  } catch (error) {
    logger.error('commons/create-template', 'Template creation failed', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create template' },
      { status: 500 }
    );
  }
}