import { getToken } from 'next-auth/jwt';

const WIKIDATA_API_URL = 'https://www.wikidata.org/w/api.php';
const USER_AGENT = 'WikiPortraits/1.0 (https://github.com/flogvit/wikiportraits)';

async function getWikidataCsrfToken(accessToken: string): Promise<string> {
  const params = new URLSearchParams({
    action: 'query',
    meta: 'tokens',
    format: 'json',
    type: 'csrf',
  });

  const response = await fetch(`${WIKIDATA_API_URL}?${params.toString()}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'User-Agent': USER_AGENT,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to get CSRF token from Wikidata');
  }

  const data = await response.json();
  return data.query.tokens.csrftoken;
}

export async function createClaim(accessToken: string, entityId: string, propertyId: string, value: string): Promise<any> {
  const csrfToken = await getWikidataCsrfToken(accessToken);

  const params = new URLSearchParams({
    action: 'wbcreateclaim',
    entity: entityId,
    property: propertyId,
    snaktype: 'value',
    value: JSON.stringify(value),
    token: csrfToken,
    format: 'json',
  });

  const response = await fetch(WIKIDATA_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Bearer ${accessToken}`,
      'User-Agent': USER_AGENT,
    },
    body: params.toString(),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(`Failed to create claim on Wikidata: ${errorData?.error?.info}`);
  }

  return response.json();
}

export async function getClaim(entityId: string, propertyId: string): Promise<any> {
  const params = new URLSearchParams({
    action: 'wbgetclaims',
    entity: entityId,
    property: propertyId,
    format: 'json',
  });

  const response = await fetch(`${WIKIDATA_API_URL}?${params.toString()}`, {
    headers: {
      'User-Agent': USER_AGENT,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to get claims from Wikidata');
  }

  return response.json();
}