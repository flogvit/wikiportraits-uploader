export interface Country {
  name: string;
  code: string;
  searchTerms: string[];
  language?: string;
}

export const COUNTRIES: Country[] = [
  // Nordic countries
  { name: 'Norway', code: 'NO', searchTerms: ['norway', 'nor', 'norge', 'norwegian'], language: 'no' },
  { name: 'Sweden', code: 'SE', searchTerms: ['sweden', 'swe', 'sverige', 'swedish'], language: 'sv' },
  { name: 'Denmark', code: 'DK', searchTerms: ['denmark', 'den', 'danmark', 'danish'], language: 'da' },
  { name: 'Finland', code: 'FI', searchTerms: ['finland', 'fin', 'suomi', 'finnish'], language: 'fi' },
  { name: 'Iceland', code: 'IS', searchTerms: ['iceland', 'ice', 'ísland', 'icelandic'], language: 'is' },

  // Major European countries
  { name: 'Germany', code: 'DE', searchTerms: ['germany', 'ger', 'deutschland', 'german'], language: 'de' },
  { name: 'France', code: 'FR', searchTerms: ['france', 'fra', 'french'], language: 'fr' },
  { name: 'Spain', code: 'ES', searchTerms: ['spain', 'spa', 'españa', 'spanish'], language: 'es' },
  { name: 'Italy', code: 'IT', searchTerms: ['italy', 'ita', 'italia', 'italian'], language: 'it' },
  { name: 'Netherlands', code: 'NL', searchTerms: ['netherlands', 'net', 'holland', 'nederland', 'dutch'], language: 'nl' },
  { name: 'United Kingdom', code: 'GB', searchTerms: ['uk', 'united kingdom', 'britain', 'england', 'british', 'english'], language: 'en' },
  { name: 'Ireland', code: 'IE', searchTerms: ['ireland', 'ire', 'irish'], language: 'en' },
  { name: 'Austria', code: 'AT', searchTerms: ['austria', 'aut', 'österreich', 'austrian'], language: 'de' },
  { name: 'Switzerland', code: 'CH', searchTerms: ['switzerland', 'swi', 'schweiz', 'suisse', 'swiss'], language: 'de' },
  { name: 'Belgium', code: 'BE', searchTerms: ['belgium', 'bel', 'belgië', 'belgique', 'belgian'], language: 'nl' },
  { name: 'Portugal', code: 'PT', searchTerms: ['portugal', 'por', 'portuguese'], language: 'pt' },
  { name: 'Poland', code: 'PL', searchTerms: ['poland', 'pol', 'polska', 'polish'], language: 'pl' },
  { name: 'Czech Republic', code: 'CZ', searchTerms: ['czech', 'czechia', 'czech republic', 'česká'], language: 'cs' },
  { name: 'Russia', code: 'RU', searchTerms: ['russia', 'rus', 'россия', 'russian'], language: 'ru' },

  // North America
  { name: 'United States', code: 'US', searchTerms: ['usa', 'us', 'united states', 'america', 'american'], language: 'en' },
  { name: 'Canada', code: 'CA', searchTerms: ['canada', 'can', 'canadian'], language: 'en' },
  { name: 'Mexico', code: 'MX', searchTerms: ['mexico', 'mex', 'méxico', 'mexican'], language: 'es' },

  // South America
  { name: 'Brazil', code: 'BR', searchTerms: ['brazil', 'bra', 'brasil', 'brazilian'], language: 'pt' },
  { name: 'Argentina', code: 'AR', searchTerms: ['argentina', 'arg', 'argentinian'], language: 'es' },
  { name: 'Chile', code: 'CL', searchTerms: ['chile', 'chi', 'chilean'], language: 'es' },
  { name: 'Colombia', code: 'CO', searchTerms: ['colombia', 'col', 'colombian'], language: 'es' },

  // Asia
  { name: 'Japan', code: 'JP', searchTerms: ['japan', 'jpn', '日本', 'japanese'], language: 'ja' },
  { name: 'China', code: 'CN', searchTerms: ['china', 'chn', '中国', 'chinese'], language: 'zh' },
  { name: 'South Korea', code: 'KR', searchTerms: ['korea', 'south korea', 'kor', '한국', 'korean'], language: 'ko' },
  { name: 'India', code: 'IN', searchTerms: ['india', 'ind', 'indian'], language: 'en' },
  { name: 'Thailand', code: 'TH', searchTerms: ['thailand', 'tha', 'thai'], language: 'th' },
  { name: 'Singapore', code: 'SG', searchTerms: ['singapore', 'sgp', 'singaporean'], language: 'en' },

  // Oceania
  { name: 'Australia', code: 'AU', searchTerms: ['australia', 'aus', 'australian'], language: 'en' },
  { name: 'New Zealand', code: 'NZ', searchTerms: ['new zealand', 'nzl', 'nz', 'kiwi'], language: 'en' },

  // Africa
  { name: 'South Africa', code: 'ZA', searchTerms: ['south africa', 'zaf', 'sa', 'south african'], language: 'en' },
  { name: 'Nigeria', code: 'NG', searchTerms: ['nigeria', 'nga', 'nigerian'], language: 'en' },
  { name: 'Egypt', code: 'EG', searchTerms: ['egypt', 'egy', 'egyptian'], language: 'ar' },

  // Additional European countries
  { name: 'Greece', code: 'GR', searchTerms: ['greece', 'grc', 'greek'], language: 'el' },
  { name: 'Turkey', code: 'TR', searchTerms: ['turkey', 'tur', 'turkish'], language: 'tr' },
  { name: 'Croatia', code: 'HR', searchTerms: ['croatia', 'hrv', 'croatian'], language: 'hr' },
  { name: 'Serbia', code: 'RS', searchTerms: ['serbia', 'srb', 'serbian'], language: 'sr' },
  { name: 'Hungary', code: 'HU', searchTerms: ['hungary', 'hun', 'hungarian'], language: 'hu' },
  { name: 'Romania', code: 'RO', searchTerms: ['romania', 'rou', 'romanian'], language: 'ro' },
  { name: 'Bulgaria', code: 'BG', searchTerms: ['bulgaria', 'bgr', 'bulgarian'], language: 'bg' },
  { name: 'Slovakia', code: 'SK', searchTerms: ['slovakia', 'svk', 'slovak'], language: 'sk' },
  { name: 'Slovenia', code: 'SI', searchTerms: ['slovenia', 'svn', 'slovenian'], language: 'sl' },
  { name: 'Estonia', code: 'EE', searchTerms: ['estonia', 'est', 'estonian'], language: 'et' },
  { name: 'Latvia', code: 'LV', searchTerms: ['latvia', 'lva', 'latvian'], language: 'lv' },
  { name: 'Lithuania', code: 'LT', searchTerms: ['lithuania', 'ltu', 'lithuanian'], language: 'lt' }
];

/**
 * Search countries by partial name match
 * @param query - Search query (e.g., "nor", "ger", "fra")
 * @returns Array of matching countries
 */
export function searchCountries(query: string): Country[] {
  if (!query || query.length < 1) return COUNTRIES.slice(0, 10); // Show top 10 by default
  
  const searchTerm = query.toLowerCase().trim();
  
  return COUNTRIES.filter(country => 
    country.searchTerms.some(term => term.includes(searchTerm))
  ).sort((a, b) => {
    // Prioritize exact matches at the beginning
    const aExact = a.searchTerms.some(term => term.startsWith(searchTerm));
    const bExact = b.searchTerms.some(term => term.startsWith(searchTerm));
    
    if (aExact && !bExact) return -1;
    if (!aExact && bExact) return 1;
    
    // Then sort by name length (shorter names first)
    return a.name.length - b.name.length;
  });
}

/**
 * Get country by exact name match
 */
export function getCountryByName(name: string): Country | undefined {
  return COUNTRIES.find(country => 
    country.name.toLowerCase() === name.toLowerCase() ||
    country.searchTerms.includes(name.toLowerCase())
  );
}