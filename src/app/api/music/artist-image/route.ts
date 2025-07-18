import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const artistId = searchParams.get('artistId');

  if (!artistId) {
    return NextResponse.json({ error: 'Artist ID is required' }, { status: 400 });
  }

  try {
    // Fetch artist data from Wikidata
    const entityUrl = new URL('https://www.wikidata.org/w/api.php');
    entityUrl.searchParams.set('action', 'wbgetentities');
    entityUrl.searchParams.set('ids', artistId);
    entityUrl.searchParams.set('props', 'claims');
    entityUrl.searchParams.set('format', 'json');

    const response = await fetch(entityUrl.toString(), {
      headers: {
        'User-Agent': 'WikiPortraits/1.0 (https://github.com/flogvit/wikiportraits)',
      },
    });

    if (!response.ok) {
      console.error(`Failed to fetch artist data for ${artistId}:`, response.status);
      return NextResponse.json({ error: 'Failed to fetch artist data' }, { status: response.status });
    }

    const data = await response.json();
    const entity = data.entities[artistId];
    
    if (!entity) {
      return NextResponse.json({ error: 'Artist not found' }, { status: 404 });
    }

    // Get image from P18 (image) property
    const imageClaims = entity.claims?.P18 || [];
    const imageFileName = imageClaims[0]?.mainsnak?.datavalue?.value;
    
    if (imageFileName) {
      const imageUrl = `https://commons.wikimedia.org/wiki/Special:FilePath/${imageFileName}`;
      return NextResponse.json({ imageUrl });
    } else {
      return NextResponse.json({ imageUrl: null });
    }
  } catch (error) {
    console.error(`Error fetching image for artist ${artistId}:`, error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}