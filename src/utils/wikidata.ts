/**
 * Utility functions for Wikidata API interactions
 */

import { lookupCache, CacheType } from '@/utils/lookup-cache';

const WIKIDATA_API_URL = 'https://www.wikidata.org/w/api.php';
const TEST_WIKIDATA_API_URL = 'https://test.wikidata.org/w/api.php';

/**
 * Common headers for Wikidata API requests
 */
const getHeaders = (accessToken?: string): Record<string, string> => {
  const headers: Record<string, string> = {
    'User-Agent': 'WikiPortraits/1.0 (https://github.com/flogvit/wikiportraits-uploader)',
    'Content-Type': 'application/json',
  };

  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }

  return headers;
};

/**
 * Make a GET request to Wikidata API
 */
export const wikidataGet = async (
  params: Record<string, string>,
  accessToken?: string,
  useTestWikidata = false,
  isServerSide = false // Add flag to indicate server-side calls
): Promise<any> => {
  const url = new URL(useTestWikidata ? TEST_WIKIDATA_API_URL : WIKIDATA_API_URL);

  // Add common parameters
  url.searchParams.append('format', 'json');

  // Only add origin for client-side requests (CORS)
  // Server-side requests should NOT include origin to allow token retrieval
  if (!isServerSide) {
    url.searchParams.append('origin', '*');
  }

  // Add custom parameters
  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.append(key, value);
  });

//  console.log('Wikidata GET:', url.toString());

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: getHeaders(accessToken),
  });

  if (!response.ok) {
    const text = await response.text();
    console.error('Wikidata API error response:', text.substring(0, 500));
    throw new Error(`Wikidata API error: ${response.status} ${response.statusText}`);
  }

  const contentType = response.headers.get('content-type');
  if (!contentType?.includes('application/json')) {
    const text = await response.text();
    console.error('Non-JSON response from Wikidata:', text.substring(0, 500));
    throw new Error(`Wikidata returned non-JSON response (${contentType}). This usually means authentication failed.`);
  }

  const data = await response.json();

  if (data.error) {
    throw new Error(`Wikidata API error: ${data.error.code} - ${data.error.info}`);
  }

  return data;
};

/**
 * Make a POST request to Wikidata API
 */
export const wikidataPost = async (
  params: Record<string, string>,
  accessToken: string,
  useTestWikidata = false
): Promise<any> => {
  const url = useTestWikidata ? TEST_WIKIDATA_API_URL : WIKIDATA_API_URL;

  // Use URLSearchParams for application/x-www-form-urlencoded (MediaWiki standard)
  const formData = new URLSearchParams();
  formData.append('format', 'json');

  // Add custom parameters
  Object.entries(params).forEach(([key, value]) => {
    formData.append(key, value);
  });

  console.log('Wikidata POST:', url);
  console.log('Form data:', Object.fromEntries(formData.entries()));

  // Set proper headers for URL-encoded form data
  const headers = getHeaders(accessToken);
  headers['Content-Type'] = 'application/x-www-form-urlencoded';

  const response = await fetch(url, {
    method: 'POST',
    headers: headers,
    body: formData.toString(),
  });

  if (!response.ok) {
    const text = await response.text();
    console.error('Wikidata POST error response:', text.substring(0, 500));
    throw new Error(`Wikidata API error: ${response.status} ${response.statusText}`);
  }

  const contentType = response.headers.get('content-type');
  if (!contentType?.includes('application/json')) {
    const text = await response.text();
    console.error('Non-JSON response from Wikidata POST:', text.substring(0, 500));
    throw new Error(`Wikidata returned non-JSON response (${contentType}). Check server logs for details.`);
  }

  const data = await response.json();

  if (data.error) {
    throw new Error(`Wikidata API error: ${data.error.code} - ${data.error.info}`);
  }

  return data;
};

/**
 * Get an edit token from Wikidata
 */
export const getEditToken = async (
  accessToken: string,
  useTestWikidata = false
): Promise<string> => {
  const data = await wikidataGet(
    { action: 'query', meta: 'tokens' },
    accessToken,
    useTestWikidata,
    true // isServerSide = true (don't add origin parameter)
  );

  console.log('Edit token response:', data);

  const token = data.query?.tokens?.csrftoken;
  if (!token) {
    console.error('Failed to get edit token. Full response:', JSON.stringify(data, null, 2));
    throw new Error(`Could not obtain edit token. Response: ${JSON.stringify(data.query?.tokens || data)}`);
  }

  return token;
};

/**
 * Get user permissions from Wikidata
 */
export const getUserPermissions = async (
  accessToken: string,
  useTestWikidata = false
): Promise<string[]> => {
  const data = await wikidataGet(
    { action: 'query', meta: 'userinfo', uiprop: 'rights' },
    accessToken,
    useTestWikidata
  );

  return data.query?.userinfo?.rights || [];
};

/**
 * Get entity details from Wikidata
 */
export const getWikidataEntity = async (
  entityId: string,
  language = 'en',
  props = 'labels|descriptions|aliases|claims'
): Promise<any> => {
  // Check cache first
  const cacheKey = `${entityId}:${language}:${props}`;
  const cached = lookupCache.get<any>(CacheType.WIKIDATA_ENTITY, cacheKey);
  if (cached !== null) {
    return cached;
  }

  const data = await wikidataGet({
    action: 'wbgetentities',
    ids: entityId,
    props,
    languages: language,
  });

  const entity = data.entities?.[entityId];
  if (!entity) {
    throw new Error(`Entity ${entityId} not found`);
  }

  // Cache the result
  lookupCache.set(CacheType.WIKIDATA_ENTITY, cacheKey, entity);

  return entity;
};

/**
 * Search for entities on Wikidata
 */
export const searchWikidataEntities = async (
  query: string,
  limit = 10,
  language = 'en',
  type = 'item'
): Promise<any[]> => {
  const data = await wikidataGet({
    action: 'wbsearchentities',
    search: query,
    language,
    limit: limit.toString(),
    type,
  });

  return data.search || [];
};

/**
 * Create a new entity on Wikidata
 */
export const createWikidataEntity = async (
  entityData: any,
  accessToken: string,
  useTestWikidata = false
): Promise<any> => {
  // Get edit token first
  const token = await getEditToken(accessToken, useTestWikidata);

  // Create the entity
  const result = await wikidataPost(
    {
      action: 'wbeditentity',
      new: 'item',
      data: JSON.stringify(entityData),
      token,
    },
    accessToken,
    useTestWikidata
  );

  return result;
};

/**
 * Helper function to parse Wikidata claims
 */
export const parseWikidataClaims = (claims: any, propertyId: string): any[] => {
  const property = claims[propertyId];
  if (!property || !Array.isArray(property)) {
    return [];
  }

  return property.map(claim => {
    const mainsnak = claim.mainsnak;
    if (!mainsnak || mainsnak.snaktype !== 'value') {
      return null;
    }

    const datavalue = mainsnak.datavalue;
    if (!datavalue) {
      return null;
    }

    return datavalue.value;
  }).filter(Boolean);
};

/**
 * Check if entity has a specific claim value
 */
export const hasClaimValue = (claims: any, propertyId: string, expectedValue: string): boolean => {
  const values = parseWikidataClaims(claims, propertyId);
  return values.some(value =>
    typeof value === 'object' && value.id === expectedValue
  );
};

/**
 * Search for a specific music festival by name
 */
export const searchMusicFestival = async (
  name: string,
  language = 'en'
): Promise<any[]> => {
  const results = await searchWikidataEntities(name, 20, language);
  const festivals = [];

  for (const result of results) {
    try {
      const entity = await getWikidataEntity(result.id, language, 'labels|descriptions|claims');

      // Check if it's a music festival (Q868557) or festival edition (Q1569406)
      const instanceOf = entity.claims?.P31;
      const isFestival = instanceOf?.some((claim: any) => {
        const qid = claim.mainsnak?.datavalue?.value?.id;
        return ['Q868557', 'Q1569406', 'Q27020041'].includes(qid);
      });

      if (isFestival) {
        festivals.push(entity);
      }
    } catch (error) {
      console.error('Error checking entity:', error);
    }
  }

  return festivals;
};

/**
 * Search for a band/musical artist by name
 */
export const searchBand = async (
  name: string,
  language = 'en'
): Promise<any[]> => {
  const results = await searchWikidataEntities(name, 20, language);
  const bands = [];

  for (const result of results) {
    try {
      const entity = await getWikidataEntity(result.id, language, 'labels|descriptions|claims');

      // Check if it's a band (Q215380) or musical ensemble (Q2088357)
      const instanceOf = entity.claims?.P31;
      const isBand = instanceOf?.some((claim: any) => {
        const qid = claim.mainsnak?.datavalue?.value?.id;
        return ['Q215380', 'Q2088357', 'Q5741069', 'Q105756498'].includes(qid);
      });

      if (isBand) {
        bands.push(entity);
      }
    } catch (error) {
      console.error('Error checking entity:', error);
    }
  }

  return bands;
};

/**
 * Check if a Wikidata entity exists by exact name match
 */
export const checkEntityExists = async (
  name: string,
  instanceOfQIDs: string[],
  language = 'en'
): Promise<{ exists: boolean; entity?: any }> => {
  // Check cache first
  const cacheKey = `${name}:${instanceOfQIDs.join(',')}:${language}`;
  const cached = lookupCache.get<{ exists: boolean; entity?: any }>(
    CacheType.WIKIDATA_ENTITY_EXISTS,
    cacheKey
  );
  if (cached !== null) {
    return cached;
  }

  const results = await searchWikidataEntities(name, 5, language);

  for (const result of results) {
    // Check for exact name match
    if (result.label?.toLowerCase() !== name.toLowerCase()) {
      continue;
    }

    try {
      const entity = await getWikidataEntity(result.id, language, 'labels|descriptions|claims');

      // Check if it's one of the expected types
      const instanceOf = entity.claims?.P31;
      const isCorrectType = instanceOf?.some((claim: any) => {
        const qid = claim.mainsnak?.datavalue?.value?.id;
        return instanceOfQIDs.includes(qid);
      });

      if (isCorrectType) {
        const result = { exists: true, entity };
        // Cache the result
        lookupCache.set(CacheType.WIKIDATA_ENTITY_EXISTS, cacheKey, result);
        return result;
      }
    } catch (error) {
      console.error('Error checking entity:', error);
    }
  }

  const result = { exists: false };
  // Cache the result
  lookupCache.set(CacheType.WIKIDATA_ENTITY_EXISTS, cacheKey, result);
  return result;
};