/**
 * Band category management with disambiguation support
 * Handles proper category hierarchy for band performances
 */

import { CommonsClient } from '@/lib/api/CommonsClient';
import { CategoryCreationInfo } from '@/types/categories';
import { logger } from '@/utils/logger';

export interface BandCategoryInfo {
  bandName: string;
  bandQid: string;
  mainCategory: string; // e.g., "FordRekord" or "Ingenting (Norwegian band)"
  needsDisambiguation: boolean;
  year: string;
  eventName: string;
  categoriesToCreate: CategoryCreationInfo[];
}

/**
 * Check if a category name needs disambiguation
 * First checks if Wikidata entity already has P373 (Commons category) and uses that
 */
export async function checkNeedsDisambiguation(
  categoryName: string,
  expectedQid: string
): Promise<{ needsDisambiguation: boolean; suggestedName: string; reason?: string }> {
  try {
    // First, check if the Wikidata entity already has P373 (Commons category)
    const { getWikidataEntity } = await import('./wikidata');
    try {
      const entity = await getWikidataEntity(expectedQid, 'en', 'claims|labels');
      const existingP373 = entity.claims?.P373?.[0]?.mainsnak?.datavalue?.value;

      if (existingP373) {
        // Entity already has a Commons category set - use that!
        logger.debug('band-categories', `Using existing P373 from ${expectedQid}`, existingP373);
        return {
          needsDisambiguation: existingP373 !== categoryName,
          suggestedName: existingP373,
          reason: `Using P373 value from Wikidata: ${existingP373}`
        };
      }
    } catch (error) {
      logger.warn('band-categories', 'Could not fetch Wikidata entity for P373 check', error);
    }

    // No P373 on Wikidata - check if category exists on Commons
    const exists = await CommonsClient.categoryExists(categoryName);

    if (!exists) {
      // Category doesn't exist - safe to use base name
      return { needsDisambiguation: false, suggestedName: categoryName };
    }

    // Category exists - check if it's about the same Wikidata entity
    // Fetch category page content to check for Wikidata Infobox
    const response = await fetch(
      `https://commons.wikimedia.org/w/api.php?` +
      new URLSearchParams({
        action: 'query',
        titles: `Category:${categoryName}`,
        prop: 'revisions',
        rvprop: 'content',
        rvslots: 'main',
        format: 'json',
        origin: '*'
      })
    );

    const data = await response.json();
    const pages = data.query?.pages || {};
    const page = Object.values(pages)[0] as any;
    const content = page?.revisions?.[0]?.slots?.main?.['*'] || '';

    // Check for Wikidata Infobox with the expected QID
    const wikidataTemplateMatch = content.match(/{{Wikidata\s+Infobox[^}]*\|([^}|]+)/i);
    const hasWikidataTemplate = content.includes('{{Wikidata Infobox');
    const wikidataQidInCategory = wikidataTemplateMatch?.[1]?.trim();

    logger.debug('band-categories', 'Category disambiguation check', {
      categoryName,
      exists,
      expectedQid,
      foundQid: wikidataQidInCategory,
      hasWikidataTemplate,
      contentPreview: content.substring(0, 200)
    });

    // If category has the same QID, it's the correct category
    if (wikidataQidInCategory === expectedQid) {
      return {
        needsDisambiguation: false,
        suggestedName: categoryName,
        reason: `Category:${categoryName} already exists and links to ${expectedQid}`
      };
    }

    // Category exists but has different or no QID - needs disambiguation
    return {
      needsDisambiguation: true,
      suggestedName: `${categoryName} (band)`,
      reason: `Category:${categoryName} exists but links to different entity (${wikidataQidInCategory || 'none'})`
    };
  } catch (error) {
    logger.error('band-categories', 'Error checking disambiguation', error);
    // On error, be conservative and disambiguate
    return {
      needsDisambiguation: true,
      suggestedName: `${categoryName} (band)`,
      reason: 'Could not verify existing category - using disambiguation for safety'
    };
  }
}

/**
 * Generate complete band category structure for a performance
 */
export async function generateBandCategoryStructure(
  bandName: string,
  bandQid: string,
  year: string,
  eventName: string
): Promise<BandCategoryInfo> {
  // Check if disambiguation needed
  const disambigCheck = await checkNeedsDisambiguation(bandName, bandQid);
  const mainCategory = disambigCheck.suggestedName;

  const categoriesToCreate: CategoryCreationInfo[] = [];

  // 1. Main band category (e.g., "FordRekord" or "Ingenting (Norwegian band)")
  categoriesToCreate.push({
    categoryName: mainCategory,
    shouldCreate: true,
    parentCategory: undefined, // Top-level or could be "Musical groups from Norway"
    description: `[[d:${bandQid}|${bandName}]].`,
    eventName: bandName
  });

  // 2. "Band by year" category (e.g., "FordRekord by year")
  const byYearCategory = `${mainCategory} by year`;
  categoriesToCreate.push({
    categoryName: byYearCategory,
    shouldCreate: true,
    parentCategory: mainCategory,
    description: `[[d:${bandQid}|${bandName}]] by year.`,
    eventName: bandName
  });

  // 3. "Band in YYYY" category (e.g., "FordRekord in 2025")
  const bandInYearCategory = `${mainCategory} in ${year}`;
  categoriesToCreate.push({
    categoryName: bandInYearCategory,
    shouldCreate: true,
    parentCategory: byYearCategory,
    description: `[[d:${bandQid}|${bandName}]] in ${year}.`,
    eventName: bandName
  });

  // 4. "Band at Event" category (e.g., "FordRekord at Jærnåttå 2025")
  const bandAtEventCategory = `${bandName} at ${eventName}`;
  categoriesToCreate.push({
    categoryName: bandAtEventCategory,
    shouldCreate: true,
    parentCategory: bandInYearCategory, // Primary parent: "FordRekord in 2025"
    description: `[[d:${bandQid}|${bandName}]] performing at ${eventName}.`,
    eventName: bandName,
    additionalParents: [eventName] // Also in "Jærnåttå 2025"
  });

  return {
    bandName,
    bandQid,
    mainCategory,
    needsDisambiguation: disambigCheck.needsDisambiguation,
    year,
    eventName,
    categoriesToCreate
  };
}

/**
 * Get all band category structures for an event
 */
export async function getAllBandCategoryStructures(
  bands: Array<{ name: string; qid: string }>,
  year: string,
  eventName: string
): Promise<BandCategoryInfo[]> {
  const structures = await Promise.all(
    bands.map(band => generateBandCategoryStructure(band.name, band.qid, year, eventName))
  );

  return structures;
}

/**
 * Flatten all categories from band structures
 */
export function flattenBandCategories(structures: BandCategoryInfo[]): CategoryCreationInfo[] {
  const allCategories: CategoryCreationInfo[] = [];

  structures.forEach(structure => {
    allCategories.push(...structure.categoriesToCreate);
  });

  // Remove duplicates by category name
  const uniqueCategories = new Map<string, CategoryCreationInfo>();
  allCategories.forEach(cat => {
    if (!uniqueCategories.has(cat.categoryName)) {
      uniqueCategories.set(cat.categoryName, cat);
    }
  });

  return Array.from(uniqueCategories.values());
}
