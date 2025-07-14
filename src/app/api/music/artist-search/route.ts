import { NextRequest, NextResponse } from 'next/server';

interface WikidataArtist {
  id: string;
  name: string;
  description?: string;
  country?: string;
  countryCode?: string;
  musicbrainzId?: string;
  formedYear?: string;
  wikipediaUrl?: string;
  wikidataUrl: string;
  isMusicRelated: boolean;
  entityType: 'person' | 'group' | 'unknown';
}

interface WikipediaArtist {
  id: string;
  title: string;
  description: string;
  url: string;
  wikipedia_url: string;
  isMusicRelated?: boolean;
  extract?: string;
}

interface UnifiedArtist {
  id: string;
  name: string;
  description?: string;
  country?: string;
  countryCode?: string;
  musicbrainzId?: string;
  formedYear?: string;
  wikipediaUrl?: string;
  wikidataUrl?: string;
  isMusicRelated: boolean;
  entityType?: 'person' | 'group' | 'unknown';
  source: 'wikidata' | 'wikipedia';
  extract?: string;
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get('q');
  const language = searchParams.get('lang') || 'en';
  const limit = parseInt(searchParams.get('limit') || '10');
  const wikidataOnly = searchParams.get('wikidata_only') === 'true';

  if (!query) {
    return NextResponse.json({ error: 'Query parameter is required' }, { status: 400 });
  }

  try {
    const results: UnifiedArtist[] = [];

    // Step 1: Search Wikidata first
    const wikidataUrl = new URL(`${request.nextUrl.origin}/api/wikidata/artist-search`);
    wikidataUrl.searchParams.set('q', query);
    wikidataUrl.searchParams.set('lang', language);
    wikidataUrl.searchParams.set('limit', limit.toString());

    try {
      const wikidataResponse = await fetch(wikidataUrl.toString());
      if (wikidataResponse.ok) {
        const wikidataData = await wikidataResponse.json();
        const wikidataResults: WikidataArtist[] = wikidataData.results || [];
        
        // Convert Wikidata results to unified format
        results.push(...wikidataResults.map(artist => ({
          id: artist.id,
          name: artist.name,
          description: artist.description,
          country: artist.country,
          countryCode: artist.countryCode,
          musicbrainzId: artist.musicbrainzId,
          formedYear: artist.formedYear,
          wikipediaUrl: artist.wikipediaUrl,
          wikidataUrl: artist.wikidataUrl,
          isMusicRelated: artist.isMusicRelated,
          entityType: artist.entityType,
          source: 'wikidata' as const
        })));
      }
    } catch (error) {
      console.error('Wikidata search failed:', error);
    }

    // Step 2: If we don't have enough results and not wikidata-only, search Wikipedia
    if (results.length < limit && !wikidataOnly) {
      const remainingLimit = limit - results.length;
      const wikipediaUrl = new URL(`${request.nextUrl.origin}/api/wikipedia/music-search`);
      wikipediaUrl.searchParams.set('q', query);
      wikipediaUrl.searchParams.set('lang', language);
      wikipediaUrl.searchParams.set('limit', remainingLimit.toString());

      try {
        const wikipediaResponse = await fetch(wikipediaUrl.toString());
        if (wikipediaResponse.ok) {
          const wikipediaData = await wikipediaResponse.json();
          const wikipediaResults: WikipediaArtist[] = wikipediaData.results || [];
          
          // Convert Wikipedia results to unified format, avoiding duplicates
          const existingNames = new Set(results.map(r => r.name.toLowerCase()));
          
          for (const artist of wikipediaResults) {
            if (!existingNames.has(artist.title.toLowerCase())) {
              results.push({
                id: artist.id,
                name: artist.title,
                description: artist.description,
                wikipediaUrl: artist.wikipedia_url,
                isMusicRelated: artist.isMusicRelated || false,
                source: 'wikipedia' as const,
                extract: artist.extract
              });
              existingNames.add(artist.title.toLowerCase());
            }
          }
        }
      } catch (error) {
        console.error('Wikipedia search failed:', error);
      }
    }

    // Step 3: Sort results (Wikidata music-related first, then Wikipedia music-related, then others)
    results.sort((a, b) => {
      // Prioritize Wikidata results
      if (a.source === 'wikidata' && b.source === 'wikipedia') return -1;
      if (a.source === 'wikipedia' && b.source === 'wikidata') return 1;
      
      // Within same source, prioritize music-related
      if (a.isMusicRelated && !b.isMusicRelated) return -1;
      if (!a.isMusicRelated && b.isMusicRelated) return 1;
      
      return 0;
    });

    return NextResponse.json({
      query,
      language,
      results: results.slice(0, limit),
      sources: {
        wikidata: results.filter(r => r.source === 'wikidata').length,
        wikipedia: results.filter(r => r.source === 'wikipedia').length
      },
      total: results.length
    });

  } catch (error) {
    console.error('Combined artist search error:', error);
    return NextResponse.json(
      { error: 'Failed to search for artists' }, 
      { status: 500 }
    );
  }
}

// Helper function to create Wikidata entries (for future implementation)
export async function POST(_request: NextRequest) {
  // This would be for creating new Wikidata entries
  // Requires OAuth authentication and proper permissions
  return NextResponse.json(
    { error: 'Creating Wikidata entries not yet implemented' }, 
    { status: 501 }
  );
}