// Wikidata-related interfaces

export interface WikidataEntity {
  id: string;
  label: string;
  description?: string;
  url?: string;
  image?: string;
  properties?: Record<string, any>;
}

export interface WikidataSearchResult {
  id: string;
  label: string;
  description?: string;
  concepturi: string;
}

export interface WikidataEntityResponse {
  entities: {
    [key: string]: {
      id: string;
      labels: { [lang: string]: { language: string; value: string } };
      descriptions?: { [lang: string]: { language: string; value: string } };
      claims?: {
        P31?: Array<{ mainsnak: { datavalue: { value: { id: string } } } }>;
        P17?: Array<{ mainsnak: { datavalue: { value: { id: string } } } }>;
        P136?: Array<{ mainsnak: { datavalue: { value: { id: string } } } }>;
        P434?: Array<{ mainsnak: { datavalue: { value: string } } }>;
        P571?: Array<{ mainsnak: { datavalue: { value: { time: string } } } }>;
      };
      sitelinks?: {
        [key: string]: {
          site: string;
          title: string;
          url: string;
        };
      };
    };
  };
}

export interface WikidataSearchResponse {
  search: WikidataSearchResult[];
}

export interface ProcessedArtist {
  id: string;
  name: string;
  description?: string;
  country?: string;
  countryCode?: string;
  genres?: string[];
  musicbrainzId?: string;
  formedYear?: string;
  wikipediaUrl?: string;
  wikidataUrl: string;
  isMusicRelated: boolean;
  entityType: 'person' | 'group' | 'unknown';
}