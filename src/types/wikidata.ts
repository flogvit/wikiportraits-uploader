// Unified Wikidata/Wikimedia data interfaces
// Working directly with WD entities without transformation

export interface WikidataEntity {
  id: string;
  type: 'item' | 'property';
  labels?: {
    [languageCode: string]: {
      language: string;
      value: string;
    };
  };
  descriptions?: {
    [languageCode: string]: {
      language: string;
      value: string;
    };
  };
  aliases?: {
    [languageCode: string]: Array<{
      language: string;
      value: string;
    }>;
  };
  claims?: {
    [propertyId: string]: WikidataClaim[];
  };
  sitelinks?: {
    [siteId: string]: {
      site: string;
      title: string;
      badges?: string[];
    };
  };
}

export interface WikidataClaim {
  id: string;
  mainsnak: WikidataSnak;
  type: 'statement' | 'claim';
  rank: 'preferred' | 'normal' | 'deprecated';
  qualifiers?: {
    [propertyId: string]: WikidataSnak[];
  };
  references?: WikidataReference[];
}

export interface WikidataSnak {
  snaktype: 'value' | 'novalue' | 'somevalue';
  property: string;
  hash?: string;
  datavalue?: WikidataDataValue;
  datatype?: string;
}

export interface WikidataDataValue {
  value: any;
  type: 'string' | 'wikibase-entityid' | 'time' | 'quantity' | 'monolingualtext' | 'globecoordinate';
}

export interface WikidataReference {
  hash: string;
  snaks: {
    [propertyId: string]: WikidataSnak[];
  };
}

// Workflow item wrapper for WD entities
export interface WorkflowItem<T = WikidataEntity> {
  orgData: T;           // Original WD/WM data
  data: T;              // Current/modified WD/WM data
  new: boolean;         // True if this is a new entity
  dirty: boolean;       // True if data has been modified
  conflicts?: DataConflict[];
  lastModified: Date;
  version: number;
}

export interface DataConflict {
  property: string;
  originalValue: any;
  currentValue: any;
  conflictType: 'edit' | 'delete' | 'add';
  source: 'user' | 'external';
}

// Common Wikidata property constants
export const WD_PROPERTIES = {
  // Person properties
  INSTANCE_OF: 'P31',           // instance of
  IMAGE: 'P18',                 // image
  BIRTH_DATE: 'P569',           // date of birth
  DEATH_DATE: 'P570',           // date of death
  BIRTH_PLACE: 'P19',           // place of birth
  COUNTRY_OF_CITIZENSHIP: 'P27', // country of citizenship
  OCCUPATION: 'P106',           // occupation
  GENDER: 'P21',                // sex or gender
  
  // Music properties
  INSTRUMENT: 'P1303',          // instrument
  MEMBER_OF: 'P463',            // member of
  GENRE: 'P136',                // genre
  RECORD_LABEL: 'P264',         // record label
  
  // Soccer properties
  POSITION_PLAYED: 'P413',      // position played on team / speciality
  MEMBER_OF_SPORTS_TEAM: 'P54', // member of sports team
  SPORT: 'P641',                // sport
  
  // Organization properties
  POSITION_HELD: 'P39',         // position held
  EMPLOYER: 'P108',             // employer
  WORK_LOCATION: 'P937',        // work location
  
  // Location properties
  COORDINATE_LOCATION: 'P625',  // coordinate location
  COUNTRY: 'P17',               // country
  LOCATED_IN: 'P131',           // located in the administrative territorial entity
  
  // Time properties
  START_TIME: 'P580',           // start time
  END_TIME: 'P582',             // end time
  POINT_IN_TIME: 'P585',        // point in time
  
  // Common entity types (Q-codes)
  HUMAN: 'Q5',                  // human
  BAND: 'Q215627',              // musical group
  FOOTBALL_CLUB: 'Q476028',     // association football club
  ORGANIZATION: 'Q43229',       // organization
  MUSICAL_INSTRUMENT: 'Q34379', // musical instrument
  ASSOCIATION_FOOTBALL: 'Q2736', // association football
} as const;

// Helper type for property values
export type PropertyValue = string | number | WikidataEntity | Date;

// Entity type guards
export function isWikidataEntity(obj: any): obj is WikidataEntity {
  return obj && typeof obj === 'object' && typeof obj.id === 'string' && obj.type;
}

export function isWorkflowItem<T>(obj: any): obj is WorkflowItem<T> {
  return obj && typeof obj === 'object' && 
         obj.orgData && obj.data && 
         typeof obj.new === 'boolean' && 
         typeof obj.dirty === 'boolean';
}

// Legacy interfaces for backward compatibility during migration
export interface WikidataSearchResult {
  id: string;
  label: string;
  description?: string;
  concepturi: string;
}

export interface WikidataEntityResponse {
  entities: {
    [key: string]: WikidataEntity;
  };
}

export interface WikidataSearchResponse {
  search: WikidataSearchResult[];
}

// Legacy processed artist interface - will be removed after migration
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