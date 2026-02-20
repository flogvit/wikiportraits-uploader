// import { getToken } from 'next-auth/jwt';

import { fetchWithTimeout, TOKEN_TIMEOUT_MS } from '@/utils/fetch-utils';

const USER_AGENT = 'WikiPortraits/1.0 (https://github.com/flogvit/wikiportraits-uploader)';

async function getWikipediaCsrfToken(accessToken: string, lang: string): Promise<string> {
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

  const response = await fetchWithTimeout(`https://${lang}.wikipedia.org/w/api.php?${params.toString()}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      'User-Agent': USER_AGENT,
    },
    timeoutMs: TOKEN_TIMEOUT_MS,
  });

  if (!response.ok) {
    throw new Error('Failed to get CSRF token from Wikipedia');
  }

  const data = await response.json();
  return data.query.tokens.csrftoken;
}

export async function updateInfoboxImage(
  accessToken: string,
  lang: string,
  title: string,
  image: string,
  summary: string
): Promise<any> {
  const token = accessToken || process.env.WIKIMEDIA_PERSONAL_ACCESS_TOKEN;
  
  if (!token) {
    throw new Error('No access token available for authentication');
  }
  
  const csrfToken = await getWikipediaCsrfToken(token, lang);

  const response = await fetchWithTimeout(`https://${lang}.wikipedia.org/w/api.php`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Bearer ${token}`,
      'User-Agent': USER_AGENT,
    },
    body: new URLSearchParams({
      action: 'edit',
      title,
      summary,
      format: 'json',
      token: csrfToken,
      appendtext: `| image = ${image}\n`,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(`Failed to update infobox on Wikipedia: ${errorData?.error?.info}`);
  }

  return response.json();
}
