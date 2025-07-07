import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.accessToken) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { categoryName, parentCategory, description, teamName } = await request.json();

    if (!categoryName) {
      return NextResponse.json({ error: 'Category name is required' }, { status: 400 });
    }

    // First, check if category already exists
    const checkUrl = new URL('https://commons.wikimedia.org/w/api.php');
    checkUrl.searchParams.set('action', 'query');
    checkUrl.searchParams.set('titles', `Category:${categoryName}`);
    checkUrl.searchParams.set('format', 'json');

    const checkResponse = await fetch(checkUrl.toString(), {
      headers: {
        'Authorization': `Bearer ${session.accessToken}`,
        'User-Agent': 'WikiPortraits-Uploader/1.0'
      }
    });

    const checkData = await checkResponse.json();
    const pageId = Object.keys(checkData.query?.pages || {})[0];
    const pageExists = checkData.query?.pages?.[pageId]?.missing === undefined;

    if (pageExists) {
      return NextResponse.json({ 
        exists: true, 
        message: 'Category already exists',
        categoryName 
      });
    }

    // Get CSRF token
    const tokenUrl = new URL('https://commons.wikimedia.org/w/api.php');
    tokenUrl.searchParams.set('action', 'query');
    tokenUrl.searchParams.set('meta', 'tokens');
    tokenUrl.searchParams.set('format', 'json');

    const tokenResponse = await fetch(tokenUrl.toString(), {
      headers: {
        'Authorization': `Bearer ${session.accessToken}`,
        'User-Agent': 'WikiPortraits-Uploader/1.0'
      }
    });

    const tokenData = await tokenResponse.json();
    const csrfToken = tokenData.query?.tokens?.csrftoken;

    if (!csrfToken) {
      throw new Error('Failed to get CSRF token');
    }

    // Create category page content
    let categoryContent = '';
    
    if (description) {
      categoryContent += `${description}\n\n`;
    } else if (teamName) {
      categoryContent += `Players of [[${teamName}]].\n\n`;
    }

    // Add parent category if specified
    if (parentCategory) {
      categoryContent += `[[Category:${parentCategory}]]\n`;
    }

    // Add general categories
    categoryContent += '[[Category:Association football players by club]]\n';
    if (teamName) {
      categoryContent += `[[Category:${teamName}]]\n`;
    }

    // Create the category page
    const editUrl = 'https://commons.wikimedia.org/w/api.php';
    const editParams = new URLSearchParams({
      action: 'edit',
      title: `Category:${categoryName}`,
      text: categoryContent,
      summary: `Created category for ${teamName ? teamName + ' ' : ''}players via WikiPortraits Uploader`,
      format: 'json',
      token: csrfToken
    });

    const editResponse = await fetch(editUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.accessToken}`,
        'User-Agent': 'WikiPortraits-Uploader/1.0',
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: editParams.toString()
    });

    const editData = await editResponse.json();

    if (editData.error) {
      throw new Error(`Commons API error: ${editData.error.info || editData.error.code}`);
    }

    if (!editData.edit || editData.edit.result !== 'Success') {
      throw new Error('Failed to create category page');
    }

    return NextResponse.json({
      success: true,
      categoryName,
      pageId: editData.edit.pageid,
      newRevision: editData.edit.newrevid,
      message: 'Category created successfully'
    });

  } catch (error) {
    console.error('Category creation error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create category' },
      { status: 500 }
    );
  }
}