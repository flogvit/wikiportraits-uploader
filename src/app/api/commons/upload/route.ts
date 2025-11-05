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

    console.log('📤 Uploading to Commons:', {
      filename,
      size: file.size,
      type: file.type
    });

    // Get CSRF token
    const tokenResponse = await fetch(
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
        }
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
    const uploadResponse = await fetch(
      'https://commons.wikimedia.org/w/api.php',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.accessToken}`,
          'User-Agent': 'WikiPortraits/1.0 (https://github.com/flogvit/wikiportraits)'
        },
        body: uploadFormData
      }
    );

    const uploadResult = await uploadResponse.json();

    if (uploadResult.error) {
      console.error('Commons upload error:', uploadResult.error);
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
      return NextResponse.json({
        success: true,
        filename: uploadResult.upload.filename,
        url: uploadResult.upload.imageinfo?.url,
        descriptionUrl: uploadResult.upload.imageinfo?.descriptionurl,
        pageId: uploadResult.upload.pageid
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
    console.error('Image upload error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to upload image' },
      { status: 500 }
    );
  }
}
