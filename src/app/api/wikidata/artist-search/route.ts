import { NextRequest, NextResponse } from 'next/server';

interface WikidataSearchResult {
  id: string;
  label: string;
  description?: string;
  concepturi: string;
}

interface WikidataEntityResponse {
  entities: {
    [key: string]: {
      id: string;
      labels: { [lang: string]: { language: string; value: string } };
      descriptions?: { [lang: string]: { language: string; value: string } };
      claims?: {
        P31?: Array<{ mainsnak: { datavalue: { value: { id: string } } } }>;
        P17?: Array<{ mainsnak: { datavalue: { value: { id: string } } } }>;
        P136?: Array<{ mainsnak: { datavalue: { value: { id: string } } } }>;
        P434?: Array<{ mainsnak: { datavalue: { value: string } } }>;
        P571?: Array<{ mainsnak: { datavalue: { value: { time: string } } } }>;
      };
      sitelinks?: {
        [key: string]: {
          site: string;
          title: string;
          url: string;
        };
      };
    };
  };
}

interface ProcessedArtist {
  id: string;
  name: string;
  description?: string;
  country?: string;
  countryCode?: string;
  genres?: string[];
  musicbrainzId?: string;
  formedYear?: string;
  wikipediaUrl?: string;
  wikidataUrl: string;
  isMusicRelated: boolean;
  entityType: 'person' | 'group' | 'unknown';
}

// Country mappings
const countryMappings: { [key: string]: { name: string; code: string } } = {
  'Q20': { name: 'Norway', code: 'no' },
  'Q34': { name: 'Sweden', code: 'sv' },
  'Q35': { name: 'Denmark', code: 'da' },
  'Q183': { name: 'Germany', code: 'de' },
  'Q142': { name: 'France', code: 'fr' },
  'Q30': { name: 'United States', code: 'en' },
  'Q145': { name: 'United Kingdom', code: 'en' },
};

// Musical entity types
const musicEntityTypes = {
  'Q5': 'person',           // human
  'Q215380': 'group',       // musical group
  'Q2088357': 'group',      // musical ensemble
  'Q639669': 'person',      // musician
};

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get('q');
  const language = searchParams.get('lang') || 'en';
  const limit = parseInt(searchParams.get('limit') || '10');

  if (!query) {
    return NextResponse.json({ error: 'Query parameter is required' }, { status: 400 });
  }

  try {
    // Step 1: Search for entities using Wikidata search API
    const searchUrl = new URL('https://www.wikidata.org/w/api.php');
    searchUrl.searchParams.set('action', 'wbsearchentities');
    searchUrl.searchParams.set('search', query);
    searchUrl.searchParams.set('language', language);
    searchUrl.searchParams.set('type', 'item');
    searchUrl.searchParams.set('format', 'json');
    searchUrl.searchParams.set('limit', (limit * 2).toString()); // Get more to filter

    const searchResponse = await fetch(searchUrl.toString());
    if (!searchResponse.ok) {
      throw new Error('Wikidata search API request failed');
    }

    const searchData = await searchResponse.json();
    const searchResults: WikidataSearchResult[] = searchData.search || [];

    if (searchResults.length === 0) {
      return NextResponse.json({
        query,
        language,
        results: [],
        source: 'wikidata'
      });
    }

    // Step 2: Get detailed information for each entity
    const entityIds = searchResults.map(result => result.id).slice(0, limit);
    const entityUrl = new URL('https://www.wikidata.org/w/api.php');
    entityUrl.searchParams.set('action', 'wbgetentities');
    entityUrl.searchParams.set('ids', entityIds.join('|'));
    entityUrl.searchParams.set('props', 'labels|descriptions|claims|sitelinks');
    entityUrl.searchParams.set('languages', `${language}|en`);
    entityUrl.searchParams.set('format', 'json');

    const entityResponse = await fetch(entityUrl.toString());
    if (!entityResponse.ok) {
      throw new Error('Wikidata entity API request failed');
    }

    const entityData: WikidataEntityResponse = await entityResponse.json();

    // Step 3: Process and filter results for music-related entities
    const processedResults: ProcessedArtist[] = [];

    for (const entityId of entityIds) {
      const entity = entityData.entities[entityId];
      if (!entity) continue;

      // Get the best label
      const label = entity.labels[language]?.value || entity.labels['en']?.value || entityId;
      
      // Get description
      const description = entity.descriptions?.[language]?.value || entity.descriptions?.['en']?.value;

      // Check if this is a music-related entity
      const instanceOfClaims = entity.claims?.P31 || [];
      const entityTypes = instanceOfClaims.map(claim => claim.mainsnak.datavalue.value.id);
      
      const isMusicRelated = entityTypes.some(type => Object.keys(musicEntityTypes).includes(type));
      const entityType = entityTypes.find(type => musicEntityTypes[type as keyof typeof musicEntityTypes]) 
        ? musicEntityTypes[entityTypes.find(type => musicEntityTypes[type as keyof typeof musicEntityTypes]) as keyof typeof musicEntityTypes]
        : 'unknown';

      // Get country information
      const countryClaims = entity.claims?.P17 || [];
      const countryId = countryClaims[0]?.mainsnak.datavalue.value.id;
      const countryInfo = countryId ? countryMappings[countryId] : undefined;

      // Get MusicBrainz ID
      const musicbrainzClaims = entity.claims?.P434 || [];
      const musicbrainzId = musicbrainzClaims[0]?.mainsnak.datavalue.value;

      // Get formation year
      const formedClaims = entity.claims?.P571 || [];
      const formedYear = formedClaims[0]?.mainsnak.datavalue.value.time?.match(/\+(\d{4})/)?.[1];

      // Get Wikipedia URL (prefer language-specific, fallback to English)
      let wikipediaUrl: string | undefined;
      const sitelinks = entity.sitelinks || {};
      const preferredWiki = `${language}wiki`;
      const englishWiki = 'enwiki';
      
      if (sitelinks[preferredWiki]) {
        wikipediaUrl = `https://${language}.wikipedia.org/wiki/${encodeURIComponent(sitelinks[preferredWiki].title)}`;
      } else if (sitelinks[englishWiki]) {
        wikipediaUrl = `https://en.wikipedia.org/wiki/${encodeURIComponent(sitelinks[englishWiki].title)}`;
      }

      const wikidataUrl = `https://www.wikidata.org/wiki/${entityId}`;

      // Include if music-related or has ambiguous description suggesting it might be music-related
      const shouldInclude = isMusicRelated || 
        (description && /band|music|singer|artist|album|song/i.test(description)) ||
        !description; // Include items without description for manual review

      if (shouldInclude) {
        processedResults.push({
          id: entityId,
          name: label,
          description,
          country: countryInfo?.name,
          countryCode: countryInfo?.code,
          musicbrainzId,
          formedYear,
          wikipediaUrl,
          wikidataUrl,
          isMusicRelated,
          entityType: entityType as 'person' | 'group' | 'unknown'
        });
      }
    }

    // Sort results: music-related first, then by relevance
    processedResults.sort((a, b) => {
      if (a.isMusicRelated && !b.isMusicRelated) return -1;
      if (!a.isMusicRelated && b.isMusicRelated) return 1;
      return 0;
    });

    return NextResponse.json({
      query,
      language,
      results: processedResults.slice(0, limit),
      source: 'wikidata',
      total: processedResults.length
    });

  } catch (error) {
    console.error('Wikidata artist search error:', error);
    return NextResponse.json(
      { error: 'Failed to search Wikidata for artists' }, 
      { status: 500 }
    );
  }
}