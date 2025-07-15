import { NextRequest, NextResponse } from 'next/server';
import { searchWikidataEntities, getWikidataEntity, hasClaimValue } from '@/utils/wikidata';

interface WikidataSearchResult {
  id: string;
  label: string;
  description?: string;
  aliases?: string[];
  conceptUri: string;
  url: string;
}

interface WikidataSearchResponse {
  search: WikidataSearchResult[];
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') || searchParams.get('search');
    const limit = searchParams.get('limit') || '10';
    const language = searchParams.get('lang') || searchParams.get('language') || 'en';
    
    if (!query) {
      return NextResponse.json({ error: 'Query parameter is required' }, { status: 400 });
    }

    // Search for entities using utility
    const searchResults = await searchWikidataEntities(query, parseInt(limit), language);

    // Filter and enhance results to prioritize photographers
    const enhancedResults = await Promise.all(
      searchResults.map(async (item) => {
        try {
          // Get entity details to check if it's a photographer
          const entity = await getWikidataEntity(item.id, language, 'claims');
          const claims = entity?.claims || {};
          
          // Check if entity is a human (P31: Q5) and photographer (P106: Q33231)
          const isHuman = hasClaimValue(claims, 'P31', 'Q5');
          const isPhotographer = hasClaimValue(claims, 'P106', 'Q33231');
          
          return {
            ...item,
            isHuman,
            isPhotographer,
            priority: isPhotographer ? 1 : isHuman ? 2 : 3
          };
        } catch (error) {
          console.error(`Error fetching entity ${item.id}:`, error);
          return {
            ...item,
            isHuman: false,
            isPhotographer: false,
            priority: 3
          };
        }
      })
    );

    // Sort by priority (photographers first, then humans, then others)
    const sortedResults = enhancedResults.sort((a, b) => a.priority - b.priority);

    return NextResponse.json({
      results: sortedResults.map(({ priority: _unused, ...item }) => item)
    });
  } catch (error) {
    console.error('Wikidata search error:', error);
    return NextResponse.json(
      { error: 'Failed to search Wikidata' },
      { status: 500 }
    );
  }
}
