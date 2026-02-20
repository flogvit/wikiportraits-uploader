// Direct frontend client for Wikimedia Commons API calls
// Replaces backend proxy routes for read operations

import { lookupCache, CacheType } from '@/utils/lookup-cache';
import { fetchWithTimeout, TOKEN_TIMEOUT_MS } from '@/utils/fetch-utils';
import { logger } from '@/utils/logger';

interface CommonsSearchParams {
  query: string;
  language?: string;
  limit?: number;
  namespace?: number;
  category?: string;
}

interface CommonsFile {
  pageid: number;
  title: string;
  url: string;
  descriptionurl: string;
  thumburl?: string;
  thumbwidth?: number;
  thumbheight?: number;
  size: number;
  width?: number;
  height?: number;
  mime: string;
  mediatype: string;
  timestamp: string;
  user: string;
  userid: number;
  extmetadata?: {
    DateTime?: { value: string };
    ObjectName?: { value: string };
    Credit?: { value: string };
    Artist?: { value: string };
    LicenseShortName?: { value: string };
    UsageTerms?: { value: string };
    Categories?: { value: string };
    ImageDescription?: { value: string };
  };
}

interface CommonsCategory {
  pageid: number;
  title: string;
  categoryinfo?: {
    size: number;
    pages: number;
    files: number;
    subcats: number;
  };
}

interface CommonsUploadParams {
  filename: string;
  description: string;
  categories: string[];
  license: string;
  source: string;
  author: string;
  date?: string;
}

export class CommonsClient {
  private static readonly BASE_URL = 'https://commons.wikimedia.org/w/api.php';
  private static readonly DEFAULT_PARAMS = {
    format: 'json',
    origin: '*' // Required for CORS
  };

  // Search for files on Commons
  static async searchFiles(params: CommonsSearchParams): Promise<CommonsFile[]> {
    const searchParams = new URLSearchParams({
      ...CommonsClient.DEFAULT_PARAMS,
      action: 'query',
      list: 'search',
      srsearch: params.query,
      srnamespace: (params.namespace || 6).toString(), // File namespace
      srlimit: (params.limit || 20).toString(),
      srprop: 'size|wordcount|timestamp|snippet'
    });

    try {
      const response = await fetchWithTimeout(`${CommonsClient.BASE_URL}?${searchParams.toString()}`, {
        method: 'GET',
        headers: {
          'User-Agent': 'WikiPortraits/1.0 (https://github.com/flogvit/wikiportraits-uploader)'
        }
      });

      if (!response.ok) {
        throw new Error(`Commons search failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.error) {
        throw new Error(`Commons API error: ${data.error.info}`);
      }

      const searchResults = data.query?.search || [];
      
      // Get detailed file information
      if (searchResults.length > 0) {
        const titles = searchResults.map((result: any) => result.title);
        return CommonsClient.getFileDetails(titles);
      }

      return [];
    } catch (error) {
      logger.error('CommonsClient', 'Commons search error', error);
      throw error;
    }
  }

  // Get detailed file information
  static async getFileDetails(titles: string[]): Promise<CommonsFile[]> {
    const searchParams = new URLSearchParams({
      ...CommonsClient.DEFAULT_PARAMS,
      action: 'query',
      titles: titles.join('|'),
      prop: 'imageinfo',
      iiprop: 'timestamp|user|userid|comment|canonicaltitle|url|size|dimensions|sha1|mime|thumbmime|thumberror|descriptionurl|extmetadata',
      iiurlwidth: '300',
      iiextmetadatafilter: 'DateTime|ObjectName|Credit|Artist|LicenseShortName|UsageTerms|Categories|ImageDescription'
    });

    try {
      const response = await fetchWithTimeout(`${CommonsClient.BASE_URL}?${searchParams.toString()}`, {
        method: 'GET',
        headers: {
          'User-Agent': 'WikiPortraits/1.0 (https://github.com/flogvit/wikiportraits-uploader)'
        }
      });

      if (!response.ok) {
        throw new Error(`Commons file details fetch failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.error) {
        throw new Error(`Commons API error: ${data.error.info}`);
      }

      const files: CommonsFile[] = [];
      
      if (data.query?.pages) {
        Object.values(data.query.pages).forEach((page: any) => {
          if (page.imageinfo && page.imageinfo.length > 0) {
            const info = page.imageinfo[0];
            files.push({
              pageid: page.pageid,
              title: page.title,
              url: info.url,
              descriptionurl: info.descriptionurl,
              thumburl: info.thumburl,
              thumbwidth: info.thumbwidth,
              thumbheight: info.thumbheight,
              size: info.size,
              width: info.width,
              height: info.height,
              mime: info.mime,
              mediatype: info.mediatype,
              timestamp: info.timestamp,
              user: info.user,
              userid: info.userid,
              extmetadata: info.extmetadata
            });
          }
        });
      }

      return files;
    } catch (error) {
      logger.error('CommonsClient', 'Commons file details fetch error', error);
      throw error;
    }
  }

  // Get files from a category
  static async getCategoryFiles(
    category: string,
    limit: number = 20,
    continueParam?: string
  ): Promise<{ files: CommonsFile[]; continue?: string }> {
    const searchParams = new URLSearchParams({
      ...CommonsClient.DEFAULT_PARAMS,
      action: 'query',
      list: 'categorymembers',
      cmtitle: category.startsWith('Category:') ? category : `Category:${category}`,
      cmtype: 'file',
      cmlimit: limit.toString(),
      ...(continueParam && { cmcontinue: continueParam })
    });

    try {
      const response = await fetchWithTimeout(`${CommonsClient.BASE_URL}?${searchParams.toString()}`, {
        method: 'GET',
        headers: {
          'User-Agent': 'WikiPortraits/1.0 (https://github.com/flogvit/wikiportraits-uploader)'
        }
      });

      if (!response.ok) {
        throw new Error(`Commons category fetch failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.error) {
        throw new Error(`Commons API error: ${data.error.info}`);
      }

      const members = data.query?.categorymembers || [];
      const files = members.length > 0 
        ? await CommonsClient.getFileDetails(members.map((m: any) => m.title))
        : [];

      return {
        files,
        continue: data.continue?.cmcontinue
      };
    } catch (error) {
      logger.error('CommonsClient', 'Commons category files fetch error', error);
      throw error;
    }
  }

  // Check if category exists
  static async categoryExists(categoryName: string): Promise<boolean> {
    const fullCategoryName = categoryName.startsWith('Category:')
      ? categoryName
      : `Category:${categoryName}`;

    // Check cache first
    const cached = lookupCache.get<boolean>(CacheType.COMMONS_CATEGORY_EXISTS, fullCategoryName);
    if (cached !== null) {
      return cached;
    }

    const searchParams = new URLSearchParams({
      ...CommonsClient.DEFAULT_PARAMS,
      action: 'query',
      titles: fullCategoryName,
      prop: 'categoryinfo'
    });

    try {
      const response = await fetchWithTimeout(`${CommonsClient.BASE_URL}?${searchParams.toString()}`, {
        method: 'GET',
        headers: {
          'User-Agent': 'WikiPortraits/1.0 (https://github.com/flogvit/wikiportraits-uploader)'
        }
      });

      if (!response.ok) {
        throw new Error(`Commons category check failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();

      if (data.error) {
        throw new Error(`Commons API error: ${data.error.info}`);
      }

      let exists = false;
      if (data.query?.pages) {
        const page = Object.values(data.query.pages)[0] as any;
        // Check if missing property exists (undefined means page exists, any value means it doesn't)
        exists = page.missing === undefined;
      }

      // Cache the result
      lookupCache.set(CacheType.COMMONS_CATEGORY_EXISTS, fullCategoryName, exists);
      return exists;
    } catch (error) {
      logger.error('CommonsClient', 'Commons category exists check error', error);
      return false;
    }
  }

  // Get category information
  static async getCategoryInfo(categoryName: string): Promise<CommonsCategory | null> {
    const fullCategoryName = categoryName.startsWith('Category:') 
      ? categoryName 
      : `Category:${categoryName}`;

    const searchParams = new URLSearchParams({
      ...CommonsClient.DEFAULT_PARAMS,
      action: 'query',
      titles: fullCategoryName,
      prop: 'categoryinfo'
    });

    try {
      const response = await fetchWithTimeout(`${CommonsClient.BASE_URL}?${searchParams.toString()}`, {
        method: 'GET',
        headers: {
          'User-Agent': 'WikiPortraits/1.0 (https://github.com/flogvit/wikiportraits-uploader)'
        }
      });

      if (!response.ok) {
        throw new Error(`Commons category info fetch failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.error) {
        throw new Error(`Commons API error: ${data.error.info}`);
      }

      if (data.query?.pages) {
        const page = Object.values(data.query.pages)[0] as any;
        if (!page.missing) {
          return {
            pageid: page.pageid,
            title: page.title,
            categoryinfo: page.categoryinfo
          };
        }
      }

      return null;
    } catch (error) {
      logger.error('CommonsClient', 'Commons category info fetch error', error);
      return null;
    }
  }

  // Get upload token (requires authentication)
  static async getUploadToken(): Promise<string | null> {
    const searchParams = new URLSearchParams({
      ...CommonsClient.DEFAULT_PARAMS,
      action: 'query',
      meta: 'tokens',
      type: 'csrf'
    });

    try {
      const response = await fetchWithTimeout(`${CommonsClient.BASE_URL}?${searchParams.toString()}`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'User-Agent': 'WikiPortraits/1.0 (https://github.com/flogvit/wikiportraits-uploader)'
        },
        timeoutMs: TOKEN_TIMEOUT_MS
      });

      if (!response.ok) {
        throw new Error(`Commons token fetch failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.error) {
        throw new Error(`Commons API error: ${data.error.info}`);
      }

      return data.query?.tokens?.csrftoken || null;
    } catch (error) {
      logger.error('CommonsClient', 'Commons upload token fetch error', error);
      return null;
    }
  }

  // Get parent categories (supercategories) of a category
  static async getParentCategories(categoryName: string): Promise<string[]> {
    const fullCategoryName = categoryName.startsWith('Category:')
      ? categoryName
      : `Category:${categoryName}`;

    const searchParams = new URLSearchParams({
      ...CommonsClient.DEFAULT_PARAMS,
      action: 'query',
      titles: fullCategoryName,
      prop: 'categories',
      cllimit: '500'
    });

    try {
      const response = await fetchWithTimeout(`${CommonsClient.BASE_URL}?${searchParams.toString()}`, {
        method: 'GET',
        headers: {
          'User-Agent': 'WikiPortraits/1.0 (https://github.com/flogvit/wikiportraits-uploader)'
        }
      });

      if (!response.ok) {
        throw new Error(`Commons parent categories fetch failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();

      if (data.error) {
        throw new Error(`Commons API error: ${data.error.info}`);
      }

      if (data.query?.pages) {
        const page = Object.values(data.query.pages)[0] as any;
        if (page.categories) {
          return page.categories.map((cat: any) => cat.title.replace(/^Category:/, ''));
        }
      }

      return [];
    } catch (error) {
      logger.error('CommonsClient', 'Commons parent categories fetch error', error);
      return [];
    }
  }

  // Get subcategories of a category
  static async getSubcategories(categoryName: string, limit: number = 500): Promise<string[]> {
    const fullCategoryName = categoryName.startsWith('Category:')
      ? categoryName
      : `Category:${categoryName}`;

    const searchParams = new URLSearchParams({
      ...CommonsClient.DEFAULT_PARAMS,
      action: 'query',
      list: 'categorymembers',
      cmtitle: fullCategoryName,
      cmtype: 'subcat',
      cmlimit: limit.toString()
    });

    try {
      const response = await fetchWithTimeout(`${CommonsClient.BASE_URL}?${searchParams.toString()}`, {
        method: 'GET',
        headers: {
          'User-Agent': 'WikiPortraits/1.0 (https://github.com/flogvit/wikiportraits-uploader)'
        }
      });

      if (!response.ok) {
        throw new Error(`Commons subcategories fetch failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();

      if (data.error) {
        throw new Error(`Commons API error: ${data.error.info}`);
      }

      const members = data.query?.categorymembers || [];
      return members.map((member: any) => member.title.replace(/^Category:/, ''));
    } catch (error) {
      logger.error('CommonsClient', 'Commons subcategories fetch error', error);
      return [];
    }
  }

  // Search categories
  static async searchCategories(
    query: string,
    limit: number = 10
  ): Promise<CommonsCategory[]> {
    const searchParams = new URLSearchParams({
      ...CommonsClient.DEFAULT_PARAMS,
      action: 'query',
      list: 'search',
      srsearch: query,
      srnamespace: '14', // Category namespace
      srlimit: limit.toString(),
      srprop: 'size|timestamp'
    });

    try {
      const response = await fetchWithTimeout(`${CommonsClient.BASE_URL}?${searchParams.toString()}`, {
        method: 'GET',
        headers: {
          'User-Agent': 'WikiPortraits/1.0 (https://github.com/flogvit/wikiportraits-uploader)'
        }
      });

      if (!response.ok) {
        throw new Error(`Commons category search failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.error) {
        throw new Error(`Commons API error: ${data.error.info}`);
      }

      const searchResults = data.query?.search || [];
      
      // Get detailed category information
      if (searchResults.length > 0) {
        const categories: CommonsCategory[] = [];
        
        for (const result of searchResults) {
          const categoryInfo = await CommonsClient.getCategoryInfo(result.title);
          if (categoryInfo) {
            categories.push(categoryInfo);
          }
        }
        
        return categories;
      }

      return [];
    } catch (error) {
      logger.error('CommonsClient', 'Commons category search error', error);
      throw error;
    }
  }
}

// Helper functions for common operations
export const CommonsHelpers = {
  // Get Commons file URL from filename
  getFileUrl: (filename: string): string => {
    const cleanFilename = filename.replace(/^File:/, '');
    return `https://commons.wikimedia.org/wiki/File:${encodeURIComponent(cleanFilename)}`;
  },

  // Get Commons category URL
  getCategoryUrl: (categoryName: string): string => {
    const cleanCategoryName = categoryName.replace(/^Category:/, '');
    return `https://commons.wikimedia.org/wiki/Category:${encodeURIComponent(cleanCategoryName)}`;
  },

  // Extract license from file metadata
  getLicense: (file: CommonsFile): string | null => {
    return file.extmetadata?.LicenseShortName?.value || null;
  },

  // Extract artist from file metadata
  getArtist: (file: CommonsFile): string | null => {
    return file.extmetadata?.Artist?.value || file.user || null;
  },

  // Check if file is an image
  isImage: (file: CommonsFile): boolean => {
    return file.mediatype === 'BITMAP' || file.mediatype === 'DRAWING';
  },

  // Check if file is free license
  isFreeContent: (file: CommonsFile): boolean => {
    const license = CommonsHelpers.getLicense(file);
    if (!license) return false;
    
    const freelicenses = ['CC0', 'CC-BY', 'CC-BY-SA', 'PD', 'GPL', 'LGPL'];
    return freelicenses.some(freeLicense => 
      license.toUpperCase().includes(freeLicense)
    );
  },

  // Format file size
  formatFileSize: (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  },

  // Generate upload description template
  generateUploadDescription: (params: CommonsUploadParams): string => {
    const categories = params.categories.map(cat => `[[Category:${cat}]]`).join('\n');

    // Check if description is already wrapped in language template
    const description = params.description?.startsWith('{{')
      ? params.description // Already wrapped, use as-is
      : `{{en|1=${params.description}}}`; // Not wrapped, wrap it

    return `== {{int:filedesc}} ==
{{Information
|description=${description}
|date=${params.date || new Date().toISOString().split('T')[0]}
|source=${params.source}
|author=${params.author}
|permission=
|other_versions=
}}

== {{int:license-header}} ==
{{${params.license}}}

${categories}`;
  }
};

// Export default instance
export default CommonsClient;