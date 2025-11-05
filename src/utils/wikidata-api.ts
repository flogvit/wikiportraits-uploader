// import { getToken } from 'next-auth/jwt';

const WIKIDATA_API_URL = 'https://www.wikidata.org/w/api.php';
const USER_AGENT = 'WikiPortraits/1.0 (https://github.com/flogvit/wikiportraits)';

async function getWikidataCsrfToken(accessToken: string): Promise<string> {
  const token = accessToken || process.env.WIKIMEDIA_PERSONAL_ACCESS_TOKEN;
  
  if (!token) {
    throw new Error('No access token available for authentication');
  }
  const params = new URLSearchParams({
    action: 'query',
    meta: 'tokens',
    format: 'json',
    type: 'csrf',
  });

  const response = await fetch(`${WIKIDATA_API_URL}?${params.toString()}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      'User-Agent': USER_AGENT,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to get CSRF token from Wikidata');
  }

  const data = await response.json();
  return data.query.tokens.csrftoken;
}

export async function createClaim(accessToken: string, entityId: string, propertyId: string, value: string | any): Promise<any> {
  const token = accessToken || process.env.WIKIMEDIA_PERSONAL_ACCESS_TOKEN;

  if (!token) {
    throw new Error('No access token available for authentication');
  }

  const csrfToken = await getWikidataCsrfToken(token);

  // Format the value based on property type
  let formattedValue;

  // Check if this is a time property (P580, P582, P585, etc.)
  const timeProperties = ['P580', 'P582', 'P585', 'P571', 'P576'];
  const isTimeProperty = timeProperties.includes(propertyId);

  if (isTimeProperty && typeof value === 'string' && value.match(/^\d{4}-\d{2}-\d{2}$/)) {
    // Date string format YYYY-MM-DD - convert to Wikidata time format
    formattedValue = JSON.stringify({
      time: `+${value}T00:00:00Z`,
      timezone: 0,
      before: 0,
      after: 0,
      precision: 11, // day precision
      calendarmodel: 'http://www.wikidata.org/entity/Q1985727' // Gregorian calendar
    });
  } else if (typeof value === 'string' && value.startsWith('Q')) {
    // Entity reference (like P527, P361)
    formattedValue = JSON.stringify({ 'entity-type': 'item', 'id': value });
  } else if (typeof value === 'string') {
    // String value (like P373 Commons category)
    formattedValue = JSON.stringify(value);
  } else {
    // Already formatted
    formattedValue = JSON.stringify(value);
  }

  const params = new URLSearchParams({
    action: 'wbcreateclaim',
    entity: entityId,
    property: propertyId,
    snaktype: 'value',
    value: formattedValue,
    token: csrfToken,
    format: 'json',
  });

  const response = await fetch(WIKIDATA_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Bearer ${token}`,
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