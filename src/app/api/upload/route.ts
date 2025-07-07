import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { fetchCSRFToken, uploadFileInChunks } from '@/utils/commons-api';
import { generateCommonsTemplate } from '@/utils/commons-template';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    
    if (!session?.accessToken) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const metadata = JSON.parse(formData.get('metadata') as string);

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Only JPEG, PNG, GIF, and WebP are allowed.' },
        { status: 400 }
      );
    }

    // Validate file size (50MB limit)
    const maxSize = 50 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'File too large. Maximum size is 50MB.' },
        { status: 400 }
      );
    }

    // Generate Commons filename
    const extension = file.name.split('.').pop()?.toLowerCase();
    const sanitizedName = metadata.filename || file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const commonsFilename = `File:${sanitizedName}${extension ? '.' + extension : ''}`;

    // Generate Commons page content
    const pageContent = generateCommonsTemplate({
      description: metadata.description,
      author: metadata.author,
      date: metadata.date,
      source: metadata.source,
      license: metadata.license,
      categories: metadata.categories || [],
      event: metadata.event,
      location: metadata.location,
    });

    // Fetch CSRF token
    const csrfToken = await fetchCSRFToken(session.accessToken as string);

    // Upload file
    const uploadResult = await uploadFileInChunks(
      file,
      commonsFilename,
      pageContent,
      session.accessToken as string,
      csrfToken
    );

    if (uploadResult.upload.error) {
      return NextResponse.json(
        { 
          error: 'Upload failed', 
          details: uploadResult.upload.error.info 
        },
        { status: 400 }
      );
    }

    if (uploadResult.upload.warnings) {
      return NextResponse.json({
        success: true,
        filename: uploadResult.upload.filename,
        warnings: uploadResult.upload.warnings,
        url: `https://commons.wikimedia.org/wiki/${encodeURIComponent(commonsFilename)}`,
      });
    }

    return NextResponse.json({
      success: true,
      filename: uploadResult.upload.filename,
      url: `https://commons.wikimedia.org/wiki/${encodeURIComponent(commonsFilename)}`,
    });

  } catch (error) {
    console.error('Upload error:', error);
    
    return NextResponse.json(
      { 
        error: 'Upload failed', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 }
  );
}