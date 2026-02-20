import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';

interface Caption {
  language: string;
  text: string;
}

/**
 * Update captions (labels) on a Commons file's structured data
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.accessToken) {
      return NextResponse.json({
        success: false,
        error: 'Not authenticated'
      }, { status: 401 });
    }

    const body = await request.json();
    const { pageId, captions } = body as { pageId: number; captions: Caption[] };

    if (!pageId || !captions) {
      return NextResponse.json({
        success: false,
        error: 'pageId and captions are required'
      }, { status: 400 });
    }

    // MediaInfo entity ID is M{pageId}
    const mediaInfoId = `M${pageId}`;

    // Step 1: Get CSRF token
    const tokenUrl = new URL('https://commons.wikimedia.org/w/api.php');
    tokenUrl.searchParams.set('action', 'query');
    tokenUrl.searchParams.set('meta', 'tokens');
    tokenUrl.searchParams.set('format', 'json');

    const tokenResponse = await fetch(tokenUrl.toString(), {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${session.accessToken}`,
        'User-Agent': 'WikiPortraits/1.0'
      }
    });

    if (!tokenResponse.ok) {
      throw new Error(`Failed to fetch CSRF token: ${tokenResponse.status}`);
    }

    const tokenData = await tokenResponse.json();
    const csrfToken = tokenData.query?.tokens?.csrftoken;

    if (!csrfToken) {
      throw new Error('CSRF token not found in response');
    }

    // Step 2: Build labels object
    const labels: Record<string, { language: string; value: string }> = {};
    captions.forEach(caption => {
      labels[caption.language] = {
        language: caption.language,
        value: caption.text
      };
    });

    // Step 3: Update labels via wbeditentity
    const formData = new FormData();
    formData.append('action', 'wbeditentity');
    formData.append('format', 'json');
    formData.append('id', mediaInfoId);
    formData.append('data', JSON.stringify({ labels }));
    formData.append('token', csrfToken);
    formData.append('summary', `Updated captions via WikiPortraits (${captions.length} languages)`);

    const editResponse = await fetch('https://commons.wikimedia.org/w/api.php', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.accessToken}`,
        'User-Agent': 'WikiPortraits/1.0'
      },
      body: formData
    });

    const editResult = await editResponse.json();

    if (editResult.error) {
      return NextResponse.json({
        success: false,
        error: editResult.error.info || 'Failed to update captions'
      }, { status: 400 });
    }

    if (editResult.success) {
      return NextResponse.json({
        success: true,
        message: `Updated captions in ${captions.length} languages: ${captions.map(c => c.language).join(', ')}`
      });
    }

    return NextResponse.json({
      success: false,
      error: 'Unknown error updating captions'
    }, { status: 500 });

  } catch (error) {
    console.error('Commons captions update error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update captions'
    }, { status: 500 });
  }
}
