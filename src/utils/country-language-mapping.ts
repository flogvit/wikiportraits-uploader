import { getCountryByName } from './countries';

/**
 * Get the appropriate Wikipedia language code for a country
 * @param country - Country name (case insensitive)
 * @returns Language code (e.g., 'no', 'de', 'fr') or 'en' as default
 */
export function getLanguageForCountry(country: string): string {
  if (!country) return 'en';
  
  const countryData = getCountryByName(country);
  return countryData?.language || 'en';
}

/**
 * Check if a country has a specific language mapping
 * @param country - Country name
 * @returns boolean indicating if mapping exists
 */
export function hasLanguageMapping(country: string): boolean {
  if (!country) return false;
  const countryData = getCountryByName(country);
  return !!(countryData?.language);
}