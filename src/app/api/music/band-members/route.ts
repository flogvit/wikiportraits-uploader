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
  
  if (memberClaims.length > 0) {
    console.log(`Found ${memberClaims.length} members via P527 for band ${bandId}`);
    return fetchMemberDetailsWithRoles(memberClaims);
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

async function fetchMemberDetailsWithRoles(memberClaims: unknown[]): Promise<BandMember[]> {
  // Extract member IDs and role information from P527 claims
  const memberData: Array<{
    id: string;
    roles: string[];
    startTime?: string;
    endTime?: string;
  }> = [];

  // Collect all role IDs to resolve in batch
  const roleIds = new Set<string>();

  memberClaims.forEach((claim: unknown) => {
    const memberId = claim.mainsnak.datavalue?.value?.id;
    if (!memberId) return;

    const roles: string[] = [];
    const qualifiers = claim.qualifiers || {};
    
    // Extract roles from P3831 (object of statement has role)
    const roleClaims = qualifiers.P3831 || [];
    roleClaims.forEach((roleClaim: unknown) => {
      const roleId = roleClaim.datavalue?.value?.id;
      if (roleId) {
        roles.push(roleId);
        roleIds.add(roleId);
      }
    });

    // Extract time qualifiers
    const startTimeClaims = qualifiers.P580 || [];
    const endTimeClaims = qualifiers.P582 || [];
    
    const startTime = startTimeClaims[0]?.datavalue?.value?.time;
    const endTime = endTimeClaims[0]?.datavalue?.value?.time;

    memberData.push({
      id: memberId,
      roles,
      startTime: startTime ? new Date(startTime).getFullYear().toString() : undefined,
      endTime: endTime ? new Date(endTime).getFullYear().toString() : undefined
    });
  });

  // Resolve role names if we have any
  const roleNames: { [key: string]: string } = {};
  if (roleIds.size > 0) {
    const roleUrl = new URL('https://www.wikidata.org/w/api.php');
    roleUrl.searchParams.set('action', 'wbgetentities');
    roleUrl.searchParams.set('ids', Array.from(roleIds).join('|'));
    roleUrl.searchParams.set('props', 'labels');
    roleUrl.searchParams.set('languages', 'en');
    roleUrl.searchParams.set('format', 'json');

    try {
      const roleResponse = await fetch(roleUrl.toString());
      if (roleResponse.ok) {
        const roleData = await roleResponse.json();
        Object.keys(roleData.entities).forEach(id => {
          const entity = roleData.entities[id];
          roleNames[id] = entity.labels?.en?.value || id;
        });
      }
    } catch (error) {
      console.error('Failed to resolve role names:', error);
    }
  }

  // Fetch member details
  const memberIds = memberData.map(m => m.id);
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
  const members: BandMember[] = [];

  memberData.forEach(memberInfo => {
    const entity = membersData.entities[memberInfo.id];
    if (!entity) return;

    // Get the member name
    const name = entity.labels?.en?.value || memberInfo.id;
    
    // Convert role IDs to names
    const instruments = memberInfo.roles.map(roleId => roleNames[roleId] || roleId);
    
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
      id: memberInfo.id,
      name,
      wikidataUrl: `https://www.wikidata.org/wiki/${memberInfo.id}`,
      wikipediaUrl,
      instruments: instruments.length > 0 ? instruments : undefined,
      birthDate: birthDate ? new Date(birthDate).getFullYear().toString() : undefined,
      nationality: nationalityId, // This would need to be resolved to a human name
      imageUrl: imageUrl ? `https://commons.wikimedia.org/wiki/Special:FilePath/${imageUrl}` : undefined,
      // Add band-specific time period
      memberFrom: memberInfo.startTime,
      memberTo: memberInfo.endTime
    });
  });

  return members;
}

/*
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
  return await processMembersFromEntityData(membersData.entities);
}
*/

function getDemoMembers(_bandId: string): BandMember[] {
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

async function processMembersFromEntityData(entities: Record<string, unknown>): Promise<BandMember[]> {
  const members: BandMember[] = [];

  // Collect all instrument IDs to resolve in batch
  const instrumentIds = new Set<string>();
  
  Object.keys(entities).forEach(entityId => {
    const entity = entities[entityId];
    const instrumentClaims = entity.claims?.P1303 || [];
    instrumentClaims.forEach((claim: unknown) => {
      const instrumentId = claim.mainsnak.datavalue?.value?.id;
      if (instrumentId) {
        instrumentIds.add(instrumentId);
      }
    });
  });

  // Resolve instrument names if we have any
  const instrumentNames: { [key: string]: string } = {};
  if (instrumentIds.size > 0) {
    const instrumentUrl = new URL('https://www.wikidata.org/w/api.php');
    instrumentUrl.searchParams.set('action', 'wbgetentities');
    instrumentUrl.searchParams.set('ids', Array.from(instrumentIds).join('|'));
    instrumentUrl.searchParams.set('props', 'labels');
    instrumentUrl.searchParams.set('languages', 'en');
    instrumentUrl.searchParams.set('format', 'json');

    try {
      const instrumentResponse = await fetch(instrumentUrl.toString());
      if (instrumentResponse.ok) {
        const instrumentData = await instrumentResponse.json();
        Object.keys(instrumentData.entities).forEach(id => {
          const entity = instrumentData.entities[id];
          instrumentNames[id] = entity.labels?.en?.value || id;
        });
      }
    } catch (error) {
      console.error('Failed to resolve instrument names:', error);
    }
  }

  Object.keys(entities).forEach(entityId => {
    const entity = entities[entityId];
    
    // Get the member name
    const name = entity.labels?.en?.value || entityId;
    
    // Get instruments from P1303 (instrument) claims
    const instrumentClaims = entity.claims?.P1303 || [];
    const instruments: string[] = [];
    
    instrumentClaims.forEach((claim: unknown) => {
      const instrumentId = claim.mainsnak.datavalue?.value?.id;
      if (instrumentId) {
        // Use resolved name or fall back to ID
        instruments.push(instrumentNames[instrumentId] || instrumentId);
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

function processSparqlBandMembersData(bindings: unknown[]): BandMember[] {
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