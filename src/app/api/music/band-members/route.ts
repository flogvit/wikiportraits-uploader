import { NextRequest, NextResponse } from 'next/server';
import { BandMember } from '@/types/music';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const bandId = searchParams.get('bandId');
  const bandName = searchParams.get('bandName');

  if (!bandId && !bandName) {
    return NextResponse.json({ error: 'Band ID or name is required' }, { status: 400 });
  }

  try {
    let members: BandMember[] = [];

    if (bandId) {
      members = await fetchBandMembersById(bandId);
    } else if (bandName) {
      members = await fetchBandMembersByName(bandName);
    }

    return NextResponse.json({ members });
  } catch (error) {
    console.error('Error fetching band members:', error);
    return NextResponse.json({ error: 'Failed to fetch band members' }, { status: 500 });
  }
}

async function fetchBandMembersById(bandId: string): Promise<BandMember[]> {
  // Try multiple approaches to find band members
  
  // Approach 1: Check if band has P527 (has part) - direct member listing
  const entityUrl = new URL('https://www.wikidata.org/w/api.php');
  entityUrl.searchParams.set('action', 'wbgetentities');
  entityUrl.searchParams.set('ids', bandId);
  entityUrl.searchParams.set('props', 'claims|labels');
  entityUrl.searchParams.set('format', 'json');

  const entityResponse = await fetch(entityUrl.toString());
  if (!entityResponse.ok) {
    return getDemoMembers(bandId);
  }

  const entityData = await entityResponse.json();
  const entity = entityData.entities[bandId];
  
  if (!entity) {
    return getDemoMembers(bandId);
  }

  // Check P527 (has part) for direct member listing
  const memberClaims = entity.claims?.P527 || [];
  const memberIds = memberClaims.map((claim: any) => claim.mainsnak.datavalue?.value?.id).filter(Boolean);

  if (memberIds.length > 0) {
    console.log(`Found ${memberIds.length} members via P527 for band ${bandId}`);
    return fetchMemberDetails(memberIds);
  }

  // Approach 2: Try SPARQL reverse lookup for P463 (member of)
  console.log(`No P527 members found for band ${bandId}, trying SPARQL reverse lookup...`);
  
  const sparqlQuery = `
    SELECT DISTINCT ?member ?memberLabel ?instrument ?instrumentLabel ?birthDate ?nationality ?nationalityLabel ?image ?wikipedia WHERE {
      ?member wdt:P463 wd:${bandId} .
      ?member wdt:P31 wd:Q5 .
      
      OPTIONAL { ?member wdt:P1303 ?instrument }
      OPTIONAL { ?member wdt:P569 ?birthDate }
      OPTIONAL { ?member wdt:P27 ?nationality }
      OPTIONAL { ?member wdt:P18 ?image }
      OPTIONAL { 
        ?wikipedia schema:about ?member ;
                  schema:isPartOf <https://en.wikipedia.org/> .
      }
      
      SERVICE wikibase:label { bd:serviceParam wikibase:language "en" }
    }
    ORDER BY ?memberLabel
  `;

  const encodedQuery = encodeURIComponent(sparqlQuery);
  const sparqlUrl = `https://query.wikidata.org/sparql?query=${encodedQuery}&format=json`;

  const sparqlResponse = await fetch(sparqlUrl, {
    method: 'GET',
    headers: {
      'Accept': 'application/json',
      'User-Agent': 'WikiPortraits/1.0 (https://github.com/flogvit/wikiportraits)',
    },
  });

  if (!sparqlResponse.ok) {
    console.error(`Wikidata SPARQL error: ${sparqlResponse.status}`);
    return getDemoMembers(bandId);
  }

  const sparqlData = await sparqlResponse.json();
  const sparqlMembers = processSparqlBandMembersData(sparqlData.results.bindings);
  
  if (sparqlMembers.length > 0) {
    console.log(`Found ${sparqlMembers.length} members via SPARQL reverse lookup for band ${bandId}`);
    return sparqlMembers;
  }

  // Fallback: return demo members
  return getDemoMembers(bandId);
}

async function fetchMemberDetails(memberIds: string[]): Promise<BandMember[]> {
  const membersEntityUrl = new URL('https://www.wikidata.org/w/api.php');
  membersEntityUrl.searchParams.set('action', 'wbgetentities');
  membersEntityUrl.searchParams.set('ids', memberIds.join('|'));
  membersEntityUrl.searchParams.set('props', 'labels|descriptions|claims|sitelinks');
  membersEntityUrl.searchParams.set('languages', 'en');
  membersEntityUrl.searchParams.set('format', 'json');

  const membersResponse = await fetch(membersEntityUrl.toString());
  if (!membersResponse.ok) {
    return [];
  }

  const membersData = await membersResponse.json();
  return processMembersFromEntityData(membersData.entities);
}

function getDemoMembers(bandId: string): BandMember[] {
  // No fallback demo data - return empty array
  return [];
}

async function fetchBandMembersByName(bandName: string): Promise<BandMember[]> {
  // Use the standard Wikidata search API to find the band
  const searchUrl = new URL('https://www.wikidata.org/w/api.php');
  searchUrl.searchParams.set('action', 'wbsearchentities');
  searchUrl.searchParams.set('search', bandName);
  searchUrl.searchParams.set('language', 'en');
  searchUrl.searchParams.set('type', 'item');
  searchUrl.searchParams.set('format', 'json');
  searchUrl.searchParams.set('limit', '1');

  const searchResponse = await fetch(searchUrl.toString());
  if (!searchResponse.ok) {
    throw new Error(`Wikidata search error: ${searchResponse.status}`);
  }

  const searchData = await searchResponse.json();
  const searchResults = searchData.search || [];
  
  if (searchResults.length === 0) {
    return [];
  }

  const bandId = searchResults[0].id;
  return fetchBandMembersById(bandId);
}

function processMembersFromEntityData(entities: any): BandMember[] {
  const members: BandMember[] = [];

  Object.keys(entities).forEach(entityId => {
    const entity = entities[entityId];
    
    // Get the member name
    const name = entity.labels?.en?.value || entityId;
    
    // Get instruments from P1303 (instrument) claims
    const instrumentClaims = entity.claims?.P1303 || [];
    const instruments: string[] = [];
    
    instrumentClaims.forEach((claim: any) => {
      const instrumentId = claim.mainsnak.datavalue?.value?.id;
      if (instrumentId) {
        // For now, add the ID - we could enhance this to resolve to names
        instruments.push(instrumentId);
      }
    });
    
    // Get birth date from P569 (date of birth)
    const birthDateClaims = entity.claims?.P569 || [];
    const birthDate = birthDateClaims[0]?.mainsnak.datavalue?.value?.time;
    
    // Get nationality from P27 (country of citizenship)
    const nationalityClaims = entity.claims?.P27 || [];
    const nationalityId = nationalityClaims[0]?.mainsnak.datavalue?.value?.id;
    
    // Get image from P18 (image)
    const imageClaims = entity.claims?.P18 || [];
    const imageUrl = imageClaims[0]?.mainsnak.datavalue?.value;
    
    // Get Wikipedia URL from sitelinks
    const sitelinks = entity.sitelinks || {};
    const wikipediaUrl = sitelinks.enwiki ? 
      `https://en.wikipedia.org/wiki/${encodeURIComponent(sitelinks.enwiki.title)}` : 
      undefined;
    
    members.push({
      id: entityId,
      name,
      wikidataUrl: `https://www.wikidata.org/wiki/${entityId}`,
      wikipediaUrl,
      instruments: instruments.length > 0 ? instruments : undefined,
      birthDate: birthDate ? new Date(birthDate).getFullYear().toString() : undefined,
      nationality: nationalityId, // This would need to be resolved to a human name
      imageUrl: imageUrl ? `https://commons.wikimedia.org/wiki/Special:FilePath/${imageUrl}` : undefined,
    });
  });

  return members;
}

function processSparqlBandMembersData(bindings: any[]): BandMember[] {
  const memberMap = new Map<string, BandMember>();

  bindings.forEach((binding) => {
    const memberId = binding.member.value.split('/').pop();
    const memberName = binding.memberLabel.value;

    if (!memberMap.has(memberId)) {
      memberMap.set(memberId, {
        id: memberId,
        name: memberName,
        wikidataUrl: binding.member.value,
        wikipediaUrl: binding.wikipedia?.value,
        instruments: [],
        birthDate: binding.birthDate?.value ? new Date(binding.birthDate.value).getFullYear().toString() : undefined,
        nationality: binding.nationalityLabel?.value,
        imageUrl: binding.image?.value ? `https://commons.wikimedia.org/wiki/Special:FilePath/${binding.image.value}` : undefined,
      });
    }

    const member = memberMap.get(memberId)!;
    
    // Add instruments (avoid duplicates)
    if (binding.instrumentLabel?.value && !member.instruments!.includes(binding.instrumentLabel.value)) {
      member.instruments!.push(binding.instrumentLabel.value);
    }
  });

  // Clean up empty instrument arrays
  const members = Array.from(memberMap.values());
  members.forEach(member => {
    if (member.instruments && member.instruments.length === 0) {
      member.instruments = undefined;
    }
  });

  return members;
}