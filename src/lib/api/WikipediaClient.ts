// Direct frontend client for Wikipedia API calls
// Replaces backend proxy routes for read operations

import { fetchWithTimeout } from '@/utils/fetch-utils';
import { logger } from '@/utils/logger';

interface WikipediaSearchParams {
  query: string;
  language?: string;
  limit?: number;
  namespace?: number;
}

interface WikipediaSearchResult {
  ns: number;
  title: string;
  pageid: number;
  size: number;
  wordcount: number;
  snippet: string;
  timestamp: string;
}

interface WikipediaArticle {
  pageid: number;
  title: string;
  extract: string;
  thumbnail?: {
    source: string;
    width: number;
    height: number;
  };
  pageimage?: string;
  coordinates?: {
    lat: number;
    lon: number;
  };
}

export class WikipediaClient {
  private static getBaseUrl(language: string = 'en'): string {
    return `https://${language}.wikipedia.org/w/api.php`;
  }

  private static readonly DEFAULT_PARAMS = {
    format: 'json',
    origin: '*' // Required for CORS
  };

  // Search Wikipedia articles
  static async searchArticles(params: WikipediaSearchParams): Promise<WikipediaSearchResult[]> {
    const baseUrl = WikipediaClient.getBaseUrl(params.language);
    
    const searchParams = new URLSearchParams({
      ...WikipediaClient.DEFAULT_PARAMS,
      action: 'query',
      list: 'search',
      srsearch: params.query,
      srlimit: (params.limit || 10).toString(),
      srnamespace: (params.namespace || 0).toString(),
      srprop: 'size|wordcount|timestamp|snippet'
    });

    try {
      const response = await fetchWithTimeout(`${baseUrl}?${searchParams.toString()}`, {
        method: 'GET',
        headers: {
          'User-Agent': 'WikiPortraits/1.0 (https://github.com/flogvit/wikiportraits-uploader)'
        }
      });

      if (!response.ok) {
        throw new Error(`Wikipedia search failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.error) {
        throw new Error(`Wikipedia API error: ${data.error.info}`);
      }

      return data.query?.search || [];
    } catch (error) {
      logger.error('WikipediaClient', 'Wikipedia search error', error);
      throw error;
    }
  }

  // Get article extracts and basic info
  static async getArticles(
    titles: string[],
    language: string = 'en'
  ): Promise<Record<string, WikipediaArticle>> {
    const baseUrl = WikipediaClient.getBaseUrl(language);
    
    const searchParams = new URLSearchParams({
      ...WikipediaClient.DEFAULT_PARAMS,
      action: 'query',
      titles: titles.join('|'),
      prop: 'extracts|pageimages|coordinates',
      exintro: 'true',
      explaintext: 'true',
      exsectionformat: 'plain',
      piprop: 'thumbnail',
      pithumbsize: '300',
      pilimit: '50',
      colimit: '50'
    });

    try {
      const response = await fetchWithTimeout(`${baseUrl}?${searchParams.toString()}`, {
        method: 'GET',
        headers: {
          'User-Agent': 'WikiPortraits/1.0 (https://github.com/flogvit/wikiportraits-uploader)'
        }
      });

      if (!response.ok) {
        throw new Error(`Wikipedia articles fetch failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.error) {
        throw new Error(`Wikipedia API error: ${data.error.info}`);
      }

      const articles: Record<string, WikipediaArticle> = {};
      
      if (data.query?.pages) {
        Object.values(data.query.pages).forEach((page: any) => {
          if (page.pageid && !page.missing) {
            articles[page.title] = {
              pageid: page.pageid,
              title: page.title,
              extract: page.extract || '',
              thumbnail: page.thumbnail,
              pageimage: page.pageimage,
              coordinates: page.coordinates?.[0] ? {
                lat: page.coordinates[0].lat,
                lon: page.coordinates[0].lon
              } : undefined
            };
          }
        });
      }

      return articles;
    } catch (error) {
      logger.error('WikipediaClient', 'Wikipedia articles fetch error', error);
      throw error;
    }
  }

  // Get single article
  static async getArticle(title: string, language: string = 'en'): Promise<WikipediaArticle | null> {
    const articles = await WikipediaClient.getArticles([title], language);
    return articles[title] || null;
  }

  // Search for music-related articles
  static async searchMusic(
    query: string,
    language: string = 'en',
    limit: number = 10
  ): Promise<WikipediaSearchResult[]> {
    // Add music-related search terms to improve results
    const musicQuery = `${query} music OR musician OR band OR album OR song OR concert OR festival`;
    
    return WikipediaClient.searchArticles({
      query: musicQuery,
      language,
      limit
    });
  }

  // Search for sports-related articles
  static async searchSports(
    query: string,
    language: string = 'en',
    limit: number = 10
  ): Promise<WikipediaSearchResult[]> {
    // Add sports-related search terms
    const sportsQuery = `${query} football OR soccer OR player OR team OR match OR stadium OR club`;
    
    return WikipediaClient.searchArticles({
      query: sportsQuery,
      language,
      limit
    });
  }

  // Get page content sections
  static async getPageSections(
    title: string,
    language: string = 'en'
  ): Promise<any[]> {
    const baseUrl = WikipediaClient.getBaseUrl(language);
    
    const searchParams = new URLSearchParams({
      ...WikipediaClient.DEFAULT_PARAMS,
      action: 'parse',
      page: title,
      prop: 'sections'
    });

    try {
      const response = await fetchWithTimeout(`${baseUrl}?${searchParams.toString()}`, {
        method: 'GET',
        headers: {
          'User-Agent': 'WikiPortraits/1.0 (https://github.com/flogvit/wikiportraits-uploader)'
        }
      });

      if (!response.ok) {
        throw new Error(`Wikipedia sections fetch failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.error) {
        throw new Error(`Wikipedia API error: ${data.error.info}`);
      }

      return data.parse?.sections || [];
    } catch (error) {
      logger.error('WikipediaClient', 'Wikipedia sections fetch error', error);
      throw error;
    }
  }

  // Get infobox data (simplified)
  static async getInfobox(
    title: string,
    language: string = 'en'
  ): Promise<Record<string, any> | null> {
    const baseUrl = WikipediaClient.getBaseUrl(language);
    
    const searchParams = new URLSearchParams({
      ...WikipediaClient.DEFAULT_PARAMS,
      action: 'query',
      titles: title,
      prop: 'revisions',
      rvprop: 'content',
      rvsection: '0',
      rvlimit: '1'
    });

    try {
      const response = await fetchWithTimeout(`${baseUrl}?${searchParams.toString()}`, {
        method: 'GET',
        headers: {
          'User-Agent': 'WikiPortraits/1.0 (https://github.com/flogvit/wikiportraits-uploader)'
        }
      });

      if (!response.ok) {
        throw new Error(`Wikipedia infobox fetch failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.error) {
        throw new Error(`Wikipedia API error: ${data.error.info}`);
      }

      // Extract infobox from wikitext (simplified parsing)
      const pages = data.query?.pages;
      if (!pages) return null;

      const page = Object.values(pages)[0] as any;
      if (!page?.revisions?.[0]?.['*']) return null;

      const wikitext = page.revisions[0]['*'];
      const infoboxMatch = wikitext.match(/\{\{[Ii]nfobox[\s\S]*?\}\}/);  // Use [\s\S] instead of . with /s flag
      
      if (!infoboxMatch) return null;

      // This is a simplified parser - in production you'd want a proper wikitext parser
      const infoboxText = infoboxMatch[0];
      const infoboxData: Record<string, any> = {};

      // Extract basic parameters (simplified)
      const paramMatches = infoboxText.match(/\|\s*([^=]+?)\s*=\s*([^|]+?)(?=\||\}\})/g);
      
      if (paramMatches) {
        paramMatches.forEach((param: string) => {
          const [key, value] = param.substring(1).split('=').map((s: string) => s.trim());
          if (key && value) {
            infoboxData[key] = value;
          }
        });
      }

      return infoboxData;
    } catch (error) {
      logger.error('WikipediaClient', 'Wikipedia infobox fetch error', error);
      return null;
    }
  }

  // Get random articles from a category
  static async getRandomFromCategory(
    category: string,
    language: string = 'en',
    limit: number = 10
  ): Promise<WikipediaSearchResult[]> {
    const baseUrl = WikipediaClient.getBaseUrl(language);
    
    const searchParams = new URLSearchParams({
      ...WikipediaClient.DEFAULT_PARAMS,
      action: 'query',
      list: 'categorymembers',
      cmtitle: `Category:${category}`,
      cmlimit: (limit * 2).toString(), // Get more to randomize
      cmnamespace: '0'
    });

    try {
      const response = await fetchWithTimeout(`${baseUrl}?${searchParams.toString()}`, {
        method: 'GET',
        headers: {
          'User-Agent': 'WikiPortraits/1.0 (https://github.com/flogvit/wikiportraits-uploader)'
        }
      });

      if (!response.ok) {
        throw new Error(`Wikipedia category fetch failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.error) {
        throw new Error(`Wikipedia API error: ${data.error.info}`);
      }

      const members = data.query?.categorymembers || [];
      
      // Shuffle and limit results
      const shuffled = members.sort(() => 0.5 - Math.random());
      return shuffled.slice(0, limit);
    } catch (error) {
      logger.error('WikipediaClient', 'Wikipedia category fetch error', error);
      return [];
    }
  }
}

// Helper functions for common operations
export const WikipediaHelpers = {
  // Create Wikipedia URL from title
  getArticleUrl: (title: string, language: string = 'en'): string => {
    return `https://${language}.wikipedia.org/wiki/${encodeURIComponent(title)}`;
  },

  // Extract year from article title or content
  extractYear: (title: string, extract?: string): number | null => {
    const yearMatch = (title + ' ' + (extract || '')).match(/\b(19|20)\d{2}\b/);
    return yearMatch ? parseInt(yearMatch[0]) : null;
  },

  // Check if article is music-related
  isMusicRelated: (title: string, extract?: string): boolean => {
    const musicTerms = ['music', 'musician', 'band', 'album', 'song', 'concert', 'festival', 'singer', 'composer'];
    const text = (title + ' ' + (extract || '')).toLowerCase();
    return musicTerms.some(term => text.includes(term));
  },

  // Check if article is sports-related
  isSportsRelated: (title: string, extract?: string): boolean => {
    const sportsTerms = ['football', 'soccer', 'player', 'team', 'match', 'stadium', 'club', 'sport'];
    const text = (title + ' ' + (extract || '')).toLowerCase();
    return sportsTerms.some(term => text.includes(term));
  },

  // Clean Wikipedia extract text
  cleanExtract: (extract: string): string => {
    return extract
      .replace(/\s+/g, ' ')
      .replace(/^\s*\w+\s*/, '') // Remove leading single word
      .trim();
  }
};

// Export default instance
export default WikipediaClient;