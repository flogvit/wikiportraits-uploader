import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.accessToken) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { templateName, content, summary, templateCode } = await request.json();

    // Support both 'content' (new) and 'templateCode' (old) parameter names
    const templateContent = content || templateCode;

    if (!templateName || !templateContent) {
      return NextResponse.json(
        { error: 'Template name and content are required' },
        { status: 400 }
      );
    }

    // Get CSRF token
    const csrfResponse = await fetch('https://commons.wikimedia.org/w/api.php?action=query&meta=tokens&format=json', {
      headers: {
        'Authorization': `Bearer ${session.accessToken}`,
        'User-Agent': 'WikiPortraits/1.0 (https://github.com/flogvit/wikiportraits)',
      },
    });

    if (!csrfResponse.ok) {
      throw new Error('Failed to get CSRF token');
    }

    const csrfData = await csrfResponse.json();
    const csrfToken = csrfData.query.tokens.csrftoken;

    // Create the template page
    const createResponse = await fetch('https://commons.wikimedia.org/w/api.php', {
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
    console.error('Template creation error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create template' },
      { status: 500 }
    );
  }
}