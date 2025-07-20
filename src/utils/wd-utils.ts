// WD Utility Functions for raw entity manipulation
// Option C: Raw entities + typed utility functions

import { WikidataEntity, WD_PROPERTIES } from '@/types/wikidata';

// Universal person utilities
export const WDPersonUtils = {
  getName: (entity: WikidataEntity): string => {
    return entity.labels?.en?.value || entity.labels?.['en-us']?.value || entity.id;
  },

  getDescription: (entity: WikidataEntity): string | null => {
    return entity.descriptions?.en?.value || entity.descriptions?.['en-us']?.value || null;
  },

  getImage: (entity: WikidataEntity): string | null => {
    const imageClaim = entity.claims?.[WD_PROPERTIES.IMAGE]?.[0];
    return imageClaim?.mainsnak?.datavalue?.value || null;
  },

  getBirthDate: (entity: WikidataEntity): string | null => {
    const birthClaim = entity.claims?.[WD_PROPERTIES.BIRTH_DATE]?.[0];
    return birthClaim?.mainsnak?.datavalue?.value?.time || null;
  },

  getDeathDate: (entity: WikidataEntity): string | null => {
    const deathClaim = entity.claims?.[WD_PROPERTIES.DEATH_DATE]?.[0];
    return deathClaim?.mainsnak?.datavalue?.value?.time || null;
  },

  getNationality: (entity: WikidataEntity): string | null => {
    const nationalityClaim = entity.claims?.[WD_PROPERTIES.COUNTRY_OF_CITIZENSHIP]?.[0];
    return nationalityClaim?.mainsnak?.datavalue?.value?.id || null;
  },

  getOccupations: (entity: WikidataEntity): string[] => {
    const occupationClaims = entity.claims?.[WD_PROPERTIES.OCCUPATION] || [];
    return occupationClaims
      .map(claim => claim.mainsnak?.datavalue?.value?.id)
      .filter(Boolean) as string[];
  },

  getGender: (entity: WikidataEntity): string | null => {
    const genderClaim = entity.claims?.[WD_PROPERTIES.GENDER]?.[0];
    return genderClaim?.mainsnak?.datavalue?.value?.id || null;
  },

  getWikipediaUrl: (entity: WikidataEntity, language: string = 'en'): string | null => {
    const siteKey = `${language}wiki`;
    const sitelink = entity.sitelinks?.[siteKey];
    return sitelink ? `https://${language}.wikipedia.org/wiki/${encodeURIComponent(sitelink.title)}` : null;
  },

  getWikidataUrl: (entity: WikidataEntity): string => {
    return `https://www.wikidata.org/wiki/${entity.id}`;
  },

  isAlive: (entity: WikidataEntity): boolean => {
    return !entity.claims?.[WD_PROPERTIES.DEATH_DATE]?.length;
  },

  getAge: (entity: WikidataEntity): number | null => {
    const birthDate = WDPersonUtils.getBirthDate(entity);
    const deathDate = WDPersonUtils.getDeathDate(entity);
    
    if (!birthDate) return null;
    
    const birth = new Date(birthDate);
    const end = deathDate ? new Date(deathDate) : new Date();
    
    return Math.floor((end.getTime() - birth.getTime()) / (1000 * 60 * 60 * 24 * 365.25));
  }
};

// Music-specific utilities
export const WDMusicianUtils = {
  ...WDPersonUtils,

  getInstruments: (entity: WikidataEntity): string[] => {
    const instrumentClaims = entity.claims?.[WD_PROPERTIES.INSTRUMENT] || [];
    return instrumentClaims
      .map(claim => claim.mainsnak?.datavalue?.value?.id)
      .filter(Boolean) as string[];
  },

  getBands: (entity: WikidataEntity): string[] => {
    const memberClaims = entity.claims?.[WD_PROPERTIES.MEMBER_OF] || [];
    return memberClaims
      .map(claim => claim.mainsnak?.datavalue?.value?.id)
      .filter(Boolean) as string[];
  },

  getGenres: (entity: WikidataEntity): string[] => {
    const genreClaims = entity.claims?.[WD_PROPERTIES.GENRE] || [];
    return genreClaims
      .map(claim => claim.mainsnak?.datavalue?.value?.id)
      .filter(Boolean) as string[];
  },

  getRecordLabels: (entity: WikidataEntity): string[] => {
    const labelClaims = entity.claims?.[WD_PROPERTIES.RECORD_LABEL] || [];
    return labelClaims
      .map(claim => claim.mainsnak?.datavalue?.value?.id)
      .filter(Boolean) as string[];
  },

  isMusician: (entity: WikidataEntity): boolean => {
    const occupations = WDPersonUtils.getOccupations(entity);
    const instruments = WDMusicianUtils.getInstruments(entity);
    const bands = WDMusicianUtils.getBands(entity);
    
    // Check if has music-related occupations, instruments, or band memberships
    return occupations.length > 0 || instruments.length > 0 || bands.length > 0;
  }
};

// Soccer-specific utilities
export const WDSoccerPlayerUtils = {
  ...WDPersonUtils,

  getPositions: (entity: WikidataEntity): string[] => {
    const positionClaims = entity.claims?.[WD_PROPERTIES.POSITION_PLAYED] || [];
    return positionClaims
      .map(claim => claim.mainsnak?.datavalue?.value?.id)
      .filter(Boolean) as string[];
  },

  getTeams: (entity: WikidataEntity): string[] => {
    const teamClaims = entity.claims?.[WD_PROPERTIES.MEMBER_OF_SPORTS_TEAM] || [];
    return teamClaims
      .map(claim => claim.mainsnak?.datavalue?.value?.id)
      .filter(Boolean) as string[];
  },

  getSports: (entity: WikidataEntity): string[] => {
    const sportClaims = entity.claims?.[WD_PROPERTIES.SPORT] || [];
    return sportClaims
      .map(claim => claim.mainsnak?.datavalue?.value?.id)
      .filter(Boolean) as string[];
  },

  isSoccerPlayer: (entity: WikidataEntity): boolean => {
    const sports = WDSoccerPlayerUtils.getSports(entity);
    const positions = WDSoccerPlayerUtils.getPositions(entity);
    const teams = WDSoccerPlayerUtils.getTeams(entity);
    
    // Check if plays association football or has soccer-related positions/teams
    return sports.includes(WD_PROPERTIES.ASSOCIATION_FOOTBALL) || 
           positions.length > 0 || 
           teams.length > 0;
  },

  getCareerStats: (entity: WikidataEntity): { goals?: number; matches?: number; } => {
    // This would need to be implemented based on specific Wikidata properties
    // for soccer statistics - placeholder for now
    return {};
  }
};

// Entity-specific utilities (for bands, teams, organizations themselves) - moved before WDOrganizationUtils
export const WDEntityUtils = {
  getName: (entity: WikidataEntity): string => {
    return entity.labels?.en?.value || entity.labels?.['en-us']?.value || entity.id;
  },

  getDescription: (entity: WikidataEntity): string | null => {
    return entity.descriptions?.en?.value || entity.descriptions?.['en-us']?.value || null;
  },

  getImage: (entity: WikidataEntity): string | null => {
    const imageClaim = entity.claims?.[WD_PROPERTIES.IMAGE]?.[0];
    return imageClaim?.mainsnak?.datavalue?.value || null;
  },

  getCountry: (entity: WikidataEntity): string | null => {
    const countryClaim = entity.claims?.[WD_PROPERTIES.COUNTRY]?.[0];
    return countryClaim?.mainsnak?.datavalue?.value?.id || null;
  },

  getLocation: (entity: WikidataEntity): string | null => {
    const locationClaim = entity.claims?.[WD_PROPERTIES.LOCATED_IN]?.[0];
    return locationClaim?.mainsnak?.datavalue?.value?.id || null;
  },

  getCoordinates: (entity: WikidataEntity): { lat: number; lon: number; } | null => {
    const coordClaim = entity.claims?.[WD_PROPERTIES.COORDINATE_LOCATION]?.[0];
    if (coordClaim?.mainsnak?.datavalue?.value) {
      const value = coordClaim.mainsnak.datavalue.value;
      return {
        lat: value.latitude,
        lon: value.longitude
      };
    }
    
    return null;
  },

  getWikipediaUrl: (entity: WikidataEntity, language: string = 'en'): string | null => {
    const siteKey = `${language}wiki`;
    const sitelink = entity.sitelinks?.[siteKey];
    return sitelink ? `https://${language}.wikipedia.org/wiki/${encodeURIComponent(sitelink.title)}` : null;
  },

  getWikidataUrl: (entity: WikidataEntity): string => {
    return `https://www.wikidata.org/wiki/${entity.id}`;
  },

  getInstanceOf: (entity: WikidataEntity): string[] => {
    const instanceClaims = entity.claims?.[WD_PROPERTIES.INSTANCE_OF] || [];
    return instanceClaims
      .map(claim => claim.mainsnak?.datavalue?.value?.id)
      .filter(Boolean) as string[];
  },

  isType: (entity: WikidataEntity, qid: string): boolean => {
    const instanceOf = WDEntityUtils.getInstanceOf(entity);
    return instanceOf.includes(qid);
  },

  isHuman: (entity: WikidataEntity): boolean => {
    return WDEntityUtils.isType(entity, WD_PROPERTIES.HUMAN);
  },

  isBand: (entity: WikidataEntity): boolean => {
    return WDEntityUtils.isType(entity, WD_PROPERTIES.BAND);
  },

  isFootballClub: (entity: WikidataEntity): boolean => {
    return WDEntityUtils.isType(entity, WD_PROPERTIES.FOOTBALL_CLUB);
  },

  isOrganization: (entity: WikidataEntity): boolean => {
    return WDEntityUtils.isType(entity, WD_PROPERTIES.ORGANIZATION);
  }
};

// Organization entity utilities (bands, soccer clubs, companies, etc.)
export const WDOrganizationUtils = {
  ...WDEntityUtils,
  
  // Get organization name
  getName: (entity: WikidataEntity): string => {
    return entity.labels?.en?.value || entity.labels?.['en-us']?.value || entity.id;
  },
  
  // Get organization description
  getDescription: (entity: WikidataEntity): string | null => {
    return entity.descriptions?.en?.value || entity.descriptions?.['en-us']?.value || null;
  },
  
  // Get country/location
  getCountry: (entity: WikidataEntity): string | null => {
    const countryClaim = entity.claims?.[WD_PROPERTIES.COUNTRY]?.[0];
    const locationClaim = entity.claims?.['P17']?.[0]; // country property
    return countryClaim?.mainsnak?.datavalue?.value?.id || 
           locationClaim?.mainsnak?.datavalue?.value?.id || null;
  },
  
  // Get founding date
  getFoundingDate: (entity: WikidataEntity): string | null => {
    const foundingClaim = entity.claims?.['P571']?.[0]; // inception date
    const establishedClaim = entity.claims?.['P2031']?.[0]; // work period start
    
    const date = foundingClaim?.mainsnak?.datavalue?.value?.time || 
                establishedClaim?.mainsnak?.datavalue?.value?.time;
    
    if (!date) return null;
    
    // Extract year from date string like "+1962-00-00T00:00:00Z"
    const yearMatch = date.match(/\+(\d{4})/);
    return yearMatch ? yearMatch[1] : null;
  },
  
  // Get organization type (band, football club, company, etc.)
  getOrganizationType: (entity: WikidataEntity): string => {
    const instanceClaims = entity.claims?.[WD_PROPERTIES.INSTANCE_OF] || [];
    
    for (const claim of instanceClaims) {
      const value = claim.mainsnak?.datavalue?.value?.id;
      switch (value) {
        case WD_PROPERTIES.BAND:
        case 'Q215627': // musical group
          return 'band';
        case WD_PROPERTIES.FOOTBALL_CLUB:
        case 'Q476028': // football club
          return 'football_club';
        case 'Q4438121': // sports club
          return 'sports_club';
        case 'Q783794': // company
          return 'company';
        case 'Q43229': // organization
          return 'organization';
        default:
          continue;
      }
    }
    
    return 'organization'; // fallback
  },
  
  // Get Wikipedia URL
  getWikipediaUrl: (entity: WikidataEntity): string | null => {
    const sitelink = entity.sitelinks?.['enwiki'];
    return sitelink ? `https://en.wikipedia.org/wiki/${encodeURIComponent(sitelink.title)}` : null;
  },
  
  // Get members/employees
  getMembers: (entity: WikidataEntity): string[] => {
    const memberClaims = entity.claims?.['P527'] || []; // has part
    const bandMemberClaims = entity.claims?.['P527'] || []; // has part (for bands)
    const playerClaims = entity.claims?.['P527'] || []; // has part (for teams)
    
    return [...memberClaims, ...bandMemberClaims, ...playerClaims]
      .map(claim => claim.mainsnak?.datavalue?.value?.id)
      .filter(Boolean) as string[];
  },
  
  // Get logo/image
  getLogo: (entity: WikidataEntity): string | null => {
    const logoClaim = entity.claims?.['P154']?.[0]; // logo image
    const imageClaim = entity.claims?.[WD_PROPERTIES.IMAGE]?.[0]; // general image
    
    return logoClaim?.mainsnak?.datavalue?.value || 
           imageClaim?.mainsnak?.datavalue?.value || 
           null;
  },
  
  // Get website
  getWebsite: (entity: WikidataEntity): string | null => {
    const websiteClaim = entity.claims?.['P856']?.[0]; // official website
    return websiteClaim?.mainsnak?.datavalue?.value || null;
  },
  
  // Get location
  getLocation: (entity: WikidataEntity): string | null => {
    const locationClaim = entity.claims?.['P159']?.[0]; // headquarters location
    const basedClaim = entity.claims?.['P276']?.[0]; // location
    
    return locationClaim?.mainsnak?.datavalue?.value?.id || 
           basedClaim?.mainsnak?.datavalue?.value?.id || 
           null;
  }
};


// Helper function to get thumbnail URL for Wikimedia images
export const getThumbnailUrl = (imageUrl: string, size: number = 128): string => {
  if (!imageUrl) return '';
  
  // Handle Wikimedia Commons Special:FilePath URLs
  if (imageUrl.includes('commons.wikimedia.org/wiki/Special:FilePath/')) {
    return `${imageUrl}?width=${size}`;
  }
  
  // Handle direct Wikimedia Commons URLs
  if (imageUrl.includes('commons.wikimedia.org') || imageUrl.includes('upload.wikimedia.org')) {
    const match = imageUrl.match(/\/commons\/([^\/]+)\/([^\/]+)\/([^\/]+)$/);
    if (match) {
      const [, level1, level2, filename] = match;
      return `https://upload.wikimedia.org/wikipedia/commons/thumb/${level1}/${level2}/${filename}/${size}px-${filename}`;
    }
  }
  
  return imageUrl;
};