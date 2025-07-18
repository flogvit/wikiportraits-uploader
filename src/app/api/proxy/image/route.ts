import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get('url');

  if (!url) {
    return NextResponse.json({ error: 'URL parameter is required' }, { status: 400 });
  }

  try {
    // Decode the URL if it was encoded
    const decodedUrl = decodeURIComponent(url);
    
    // Validate that it's a supported image domain
    const allowedDomains = [
      'commons.wikimedia.org',
      'upload.wikimedia.org',
      'wikipedia.org'
    ];
    
    const urlObj = new URL(decodedUrl);
    const isAllowedDomain = allowedDomains.some(domain => 
      urlObj.hostname.endsWith(domain)
    );
    
    if (!isAllowedDomain) {
      return NextResponse.json({ error: 'Domain not allowed' }, { status: 403 });
    }

    // Fetch the image
    const response = await fetch(decodedUrl, {
      headers: {
        'User-Agent': 'WikiPortraits/1.0 (https://github.com/wikimedia/wikiportraits)',
      },
    });

    if (!response.ok) {
      return NextResponse.json({ error: 'Failed to fetch image' }, { status: response.status });
    }

    // Get the image data
    const imageBuffer = await response.arrayBuffer();
    const contentType = response.headers.get('content-type') || 'image/jpeg';

    // Return the image with proper headers
    return new NextResponse(imageBuffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });

  } catch (error) {
    console.error('Image proxy error:', error);
    return NextResponse.json({ error: 'Failed to proxy image' }, { status: 500 });
  }
}