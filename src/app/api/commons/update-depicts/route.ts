import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';

interface DepictsItem {
  qid: string;
  label: string;
}

/**
 * Replace all depicts (P180) statements on a Commons file
 * Clears existing depicts and adds new ones
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
    const { pageId, depicts } = body as { pageId: number; depicts: DepictsItem[] };

    if (!pageId || !depicts) {
      return NextResponse.json({
        success: false,
        error: 'pageId and depicts are required'
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

    // Step 3: Replace all P180 statements (clear and set)
    const formData = new FormData();
    formData.append('action', 'wbeditentity');
    formData.append('format', 'json');
    formData.append('id', mediaInfoId);
    formData.append('clear', 'true'); // This clears all existing statements
    formData.append('data', JSON.stringify({
      claims: {
        P180: depictsStatements
      }
    }));
    formData.append('token', csrfToken);
    formData.append('summary', `Updated depicts statements via WikiPortraits (${depicts.length} entities)`);

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
    console.error('Commons depicts update error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update depicts'
    }, { status: 500 });
  }
}
