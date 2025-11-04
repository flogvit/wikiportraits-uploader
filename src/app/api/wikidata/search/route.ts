import { NextRequest, NextResponse } from 'next/server';
import { WikidataClient, WikidataHelpers } from '@/lib/api/WikidataClient';
import { WikidataEntity } from '@/types/wikidata';

interface SearchResult {
  id: string;
  label: string;
  description?: string;
  aliases?: string[];
  conceptUri: string;
  url: string;
  isHuman?: boolean;
  isPhotographer?: boolean;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');
    const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 50);

    if (!query || query.trim().length === 0) {
      return NextResponse.json({ 
        error: 'Query parameter is required' 
      }, { status: 400 });
    }

    // Use WikidataClient to search for entities
    const searchResponse = await WikidataClient.searchEntities({
      query: query.trim(),
      limit: limit * 2, // Get more results to filter
      type: 'item'
    });

    if (!searchResponse.search || searchResponse.search.length === 0) {
      return NextResponse.json({
        results: [],
        total: 0
      });
    }

    // Get full entity data for detailed filtering
    const entityIds = searchResponse.search.map(item => item.id);
    const entitiesResponse = await WikidataClient.getEntities({
      ids: entityIds,
      languages: ['en'],
      props: ['labels', 'descriptions', 'claims', 'aliases']
    });

    const entities = Object.values(entitiesResponse.entities);
    
    // Transform and filter entities
    const results: SearchResult[] = entities
      .map(entity => transformEntityToSearchResult(entity))
      .filter(result => result !== null)
      .slice(0, limit); // Apply final limit

    return NextResponse.json({
      results,
      total: results.length
    });

  } catch (error) {
    console.error('Wikidata search error:', error);
    return NextResponse.json({ 
      error: 'Search failed', 
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

function transformEntityToSearchResult(entity: WikidataEntity): SearchResult | null {
  if (!entity || !entity.id) return null;

  const label = WikidataHelpers.getName(entity);
  const description = WikidataHelpers.getDescription(entity);
  
  // Check if entity is human
  const isHuman = WikidataHelpers.isInstanceOf(entity, 'Q5');
  
  // Check if entity is a photographer
  const isPhotographer = checkIsPhotographer(entity);

  // Get aliases
  const aliases = entity.aliases?.en?.map(alias => alias.value) || [];

  return {
    id: entity.id,
    label,
    description: description || undefined,
    aliases: aliases.length > 0 ? aliases : undefined,
    conceptUri: `http://www.wikidata.org/entity/${entity.id}`,
    url: `https://www.wikidata.org/wiki/${entity.id}`,
    isHuman,
    isPhotographer
  };
}

function checkIsPhotographer(entity: WikidataEntity): boolean {
  // Check occupation claims (P106)
  const occupations = entity.claims?.P106 || [];
  
  const photographerOccupations = [
    'Q33231', // photographer
    'Q1930187', // photojournalist
    'Q33216', // portrait photographer
    'Q222344', // fashion photographer
    'Q1925963', // press photographer
    'Q2526255', // documentary photographer
    // Add more photographer-related occupations as needed
  ];

  return occupations.some(claim => 
    claim.mainsnak.datavalue?.value?.id && 
    photographerOccupations.includes(claim.mainsnak.datavalue.value.id)
  );
}