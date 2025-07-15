/**
 * Utility functions for Wikidata API interactions
 */

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
  useTestWikidata = false
): Promise<any> => {
  const url = new URL(useTestWikidata ? TEST_WIKIDATA_API_URL : WIKIDATA_API_URL);
  
  // Add common parameters
  url.searchParams.append('format', 'json');
  url.searchParams.append('origin', '*');
  
  // Add custom parameters
  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.append(key, value);
  });

  console.log('Wikidata GET:', url.toString());

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: getHeaders(accessToken),
  });

  if (!response.ok) {
    throw new Error(`Wikidata API error: ${response.status} ${response.statusText}`);
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
  
  const formData = new FormData();
  formData.append('format', 'json');
  
  // Add custom parameters
  Object.entries(params).forEach(([key, value]) => {
    formData.append(key, value);
  });

  console.log('Wikidata POST:', url);
  console.log('Form data:', Object.fromEntries(formData.entries()));

  const response = await fetch(url, {
    method: 'POST',
    headers: getHeaders(accessToken),
    body: formData,
  });

  if (!response.ok) {
    throw new Error(`Wikidata API error: ${response.status} ${response.statusText}`);
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
    useTestWikidata
  );

  const token = data.query?.tokens?.csrftoken;
  if (!token) {
    throw new Error('Could not obtain edit token');
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