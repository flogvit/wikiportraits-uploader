// Direct frontend client for Wikidata API calls
// Replaces backend proxy routes for read operations

import { WikidataEntity, WikidataSearchResponse } from '@/types/wikidata';

interface WikidataSearchParams {
  query: string;
  language?: string;
  limit?: number;
  continue?: number;
  type?: 'item' | 'property';
}

interface WikidataEntityParams {
  ids: string | string[];
  languages?: string[];
  props?: string[];
}

export class WikidataClient {
  private static readonly BASE_URL = 'https://wikidata.org/w/api.php';
  private static readonly DEFAULT_PARAMS = {
    format: 'json',
    origin: '*' // Required for CORS
  };

  // Search for entities
  static async searchEntities(params: WikidataSearchParams): Promise<WikidataSearchResponse> {
    const searchParams = new URLSearchParams({
      ...WikidataClient.DEFAULT_PARAMS,
      action: 'wbsearchentities',
      search: params.query,
      language: params.language || 'en',
      limit: (params.limit || 10).toString(),
      continue: (params.continue || 0).toString(),
      type: params.type || 'item',
      uselang: params.language || 'en'
    });

    try {
      const response = await fetch(`${WikidataClient.BASE_URL}?${searchParams.toString()}`, {
        method: 'GET',
        headers: {
          'User-Agent': 'WikiPortraits/1.0 (https://github.com/your-username/wikiportraits)'
        }
      });

      if (!response.ok) {
        throw new Error(`Wikidata search failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.error) {
        throw new Error(`Wikidata API error: ${data.error.info}`);
      }

      return data;
    } catch (error) {
      console.error('Wikidata search error:', error);
      throw error;
    }
  }

  // Get entity details
  static async getEntities(params: WikidataEntityParams): Promise<{ entities: Record<string, WikidataEntity> }> {
    const ids = Array.isArray(params.ids) ? params.ids.join('|') : params.ids;
    
    const searchParams = new URLSearchParams({
      ...WikidataClient.DEFAULT_PARAMS,
      action: 'wbgetentities',
      ids: ids,
      languages: (params.languages || ['en']).join('|'),
      props: (params.props || ['labels', 'descriptions', 'claims', 'sitelinks']).join('|')
    });

    try {
      const response = await fetch(`${WikidataClient.BASE_URL}?${searchParams.toString()}`, {
        method: 'GET',
        headers: {
          'User-Agent': 'WikiPortraits/1.0 (https://github.com/your-username/wikiportraits)'
        }
      });

      if (!response.ok) {
        throw new Error(`Wikidata entity fetch failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.error) {
        throw new Error(`Wikidata API error: ${data.error.info}`);
      }

      return data;
    } catch (error) {
      console.error('Wikidata entity fetch error:', error);
      throw error;
    }
  }

  // Get entity by ID
  static async getEntity(id: string, languages: string[] = ['en']): Promise<WikidataEntity | null> {
    const result = await WikidataClient.getEntities({
      ids: id,
      languages
    });

    return result.entities[id] || null;
  }

  // Search for people with specific properties
  static async searchPeople(
    query: string, 
    requiredProperties: string[] = [],
    limit: number = 10
  ): Promise<WikidataEntity[]> {
    // First do a general search
    const searchResult = await WikidataClient.searchEntities({
      query,
      limit: limit * 2, // Get more results to filter
      type: 'item'
    });

    if (!searchResult.search || searchResult.search.length === 0) {
      return [];
    }

    // Get full entity data for filtering
    const entityIds = searchResult.search.map(item => item.id);
    const entitiesResult = await WikidataClient.getEntities({
      ids: entityIds
    });

    // Filter entities based on required properties
    const entities = Object.values(entitiesResult.entities);
    const filteredEntities = entities.filter(entity => {
      // Check if entity is a person (instance of Q5)
      const instanceOf = entity.claims?.P31;
      const isHuman = instanceOf?.some(claim => 
        claim.mainsnak.datavalue?.value?.id === 'Q5'
      );

      if (!isHuman) return false;

      // Check required properties
      if (requiredProperties.length > 0) {
        return requiredProperties.every(prop => 
          entity.claims?.[prop]?.length > 0
        );
      }

      return true;
    });

    return filteredEntities.slice(0, limit);
  }

  // Search for entities of a specific type
  static async searchEntitiesOfType(
    query: string,
    entityType: string,
    limit: number = 10
  ): Promise<WikidataEntity[]> {
    const searchResult = await WikidataClient.searchEntities({
      query,
      limit: limit * 2,
      type: 'item'
    });

    if (!searchResult.search || searchResult.search.length === 0) {
      return [];
    }

    const entityIds = searchResult.search.map(item => item.id);
    const entitiesResult = await WikidataClient.getEntities({
      ids: entityIds
    });

    const entities = Object.values(entitiesResult.entities);
    const filteredEntities = entities.filter(entity => {
      const instanceOf = entity.claims?.P31;
      return instanceOf?.some(claim => 
        claim.mainsnak.datavalue?.value?.id === entityType
      );
    });

    return filteredEntities.slice(0, limit);
  }

  // Get claims for a specific property
  static async getEntityClaims(
    entityId: string,
    property: string
  ): Promise<any[]> {
    const entity = await WikidataClient.getEntity(entityId);
    return entity?.claims?.[property] || [];
  }

  // Helper method to resolve Q-IDs to labels
  static async resolveLabels(
    qids: string[],
    language: string = 'en'
  ): Promise<Record<string, string>> {
    if (qids.length === 0) return {};

    const result = await WikidataClient.getEntities({
      ids: qids,
      languages: [language],
      props: ['labels']
    });

    const labels: Record<string, string> = {};
    Object.entries(result.entities).forEach(([id, entity]) => {
      labels[id] = entity.labels?.[language]?.value || id;
    });

    return labels;
  }
}

// Helper functions for common operations
export const WikidataHelpers = {
  // Get human-readable name from entity
  getName: (entity: WikidataEntity, language: string = 'en'): string => {
    return entity.labels?.[language]?.value || entity.id;
  },

  // Get description from entity
  getDescription: (entity: WikidataEntity, language: string = 'en'): string | null => {
    return entity.descriptions?.[language]?.value || null;
  },

  // Get Wikipedia URL from entity
  getWikipediaUrl: (entity: WikidataEntity, language: string = 'en'): string | null => {
    const siteKey = `${language}wiki`;
    const sitelink = entity.sitelinks?.[siteKey];
    return sitelink ? `https://${language}.wikipedia.org/wiki/${encodeURIComponent(sitelink.title)}` : null;
  },

  // Get claim values for a property
  getClaimValues: (entity: WikidataEntity, property: string): any[] => {
    const claims = entity.claims?.[property] || [];
    return claims.map(claim => claim.mainsnak.datavalue?.value).filter(Boolean);
  },

  // Check if entity has a specific instance of claim
  isInstanceOf: (entity: WikidataEntity, qid: string): boolean => {
    const instanceClaims = entity.claims?.P31 || [];
    return instanceClaims.some(claim => 
      claim.mainsnak.datavalue?.value?.id === qid
    );
  }
};

// Export default instance
export default WikidataClient;