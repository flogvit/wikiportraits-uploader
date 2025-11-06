import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';

/**
 * Edit a Commons file page with new wikitext
 * Requires authentication via session
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
    const { filename, wikitext, summary } = body;

    if (!filename || !wikitext) {
      return NextResponse.json({
        success: false,
        error: 'Filename and wikitext are required'
      }, { status: 400 });
    }

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

    // Step 2: Edit the page
    const editFormData = new FormData();
    editFormData.append('action', 'edit');
    editFormData.append('format', 'json');
    editFormData.append('title', filename.startsWith('File:') ? filename : `File:${filename}`);
    editFormData.append('text', wikitext);
    editFormData.append('summary', summary || 'Updated categories and metadata via WikiPortraits');
    editFormData.append('token', csrfToken);

    const editResponse = await fetch('https://commons.wikimedia.org/w/api.php', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.accessToken}`,
        'User-Agent': 'WikiPortraits/1.0'
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
    console.error('Commons page edit error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to edit page'
    }, { status: 500 });
  }
}
