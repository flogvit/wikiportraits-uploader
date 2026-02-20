/**
 * Performer category management with proper P373 handling
 * Handles individual performers (band members, musicians, etc.)
 */

import { CommonsClient } from '@/lib/api/CommonsClient';
import { WikidataEntity, WD_PROPERTIES } from '@/types/wikidata';

export interface PerformerCategoryInfo {
  performerName: string;
  performerQid: string;
  commonsCategory: string; // The actual category name to use
  source: 'p373' | 'disambiguated' | 'base';
  needsCreation: boolean;
  description: string;
}

/**
 * Extract Commons category (P373) from a Wikidata entity
 */
export function extractCommonsCategory(entity: WikidataEntity): string | null {
  const p373Claims = entity.claims?.[WD_PROPERTIES.COMMONS_CATEGORY];

  if (!p373Claims || p373Claims.length === 0) {
    return null;
  }

  // Get the first P373 value (there should typically be only one)
  const value = p373Claims[0]?.mainsnak?.datavalue?.value;

  if (typeof value === 'string') {
    return value;
  }

  return null;
}

/**
 * Get occupation/role from entity for disambiguation
 */
export function getOccupationForDisambiguation(entity: WikidataEntity): string | null {
  const occupationClaims = entity.claims?.[WD_PROPERTIES.OCCUPATION];

  if (!occupationClaims || occupationClaims.length === 0) {
    return null;
  }

  // Common occupation Q-codes for performers
  const occupationMap: Record<string, string> = {
    'Q177220': 'singer',
    'Q855091': 'guitarist',
    'Q765778': 'bassist',
    'Q386854': 'drummer',
    'Q2252262': 'keyboardist',
    'Q36834': 'composer',
    'Q639669': 'musician',
    'Q10800557': 'singer-songwriter',
    'Q488205': 'singer-songwriter',
    'Q2643890': 'music producer',
    'Q222722': 'conductor',
    'Q1414443': 'vocalist'
  };

  // Try to find a musical occupation
  for (const claim of occupationClaims) {
    const occupationId = claim.mainsnak?.datavalue?.value?.id;
    if (occupationId && occupationMap[occupationId]) {
      return occupationMap[occupationId];
    }
  }

  // Fall back to first occupation if no musical one found
  const firstOccupation = occupationClaims[0]?.mainsnak?.datavalue?.value?.id;
  return occupationMap[firstOccupation] || 'musician';
}

/**
 * Get nationality for disambiguation
 */
export function getNationalityForDisambiguation(entity: WikidataEntity): string | null {
  const nationalityClaims = entity.claims?.[WD_PROPERTIES.COUNTRY_OF_CITIZENSHIP];

  if (!nationalityClaims || nationalityClaims.length === 0) {
    return null;
  }

  // Common country Q-codes and their adjective forms
  const nationalityMap: Record<string, string> = {
    'Q20': 'Norwegian',
    'Q30': 'American',
    'Q145': 'British',
    'Q183': 'German',
    'Q142': 'French',
    'Q38': 'Italian',
    'Q29': 'Spanish',
    'Q96': 'Mexican',
    'Q16': 'Canadian',
    'Q408': 'Australian',
    'Q31': 'Belgian',
    'Q55': 'Dutch',
    'Q34': 'Swedish',
    'Q35': 'Danish',
    'Q33': 'Finnish',
    'Q39': 'Swiss',
    'Q40': 'Austrian',
    'Q155': 'Brazilian',
    'Q159': 'Russian',
    'Q17': 'Japanese',
    'Q148': 'Chinese',
    'Q884': 'South Korean',
    'Q668': 'Indian'
  };

  const nationalityId = nationalityClaims[0]?.mainsnak?.datavalue?.value?.id;
  return nationalityId ? nationalityMap[nationalityId] || null : null;
}

/**
 * Generate disambiguated category name for a performer
 */
function generateDisambiguatedName(
  performerName: string,
  entity: WikidataEntity
): string {
  // Try occupation-based disambiguation first (most common for musicians)
  const occupation = getOccupationForDisambiguation(entity);
  if (occupation) {
    return `${performerName} (${occupation})`;
  }

  // Fall back to nationality-based disambiguation
  const nationality = getNationalityForDisambiguation(entity);
  if (nationality) {
    return `${performerName} (${nationality} musician)`;
  }

  // Last resort: just use "musician"
  return `${performerName} (musician)`;
}

/**
 * Check if a category exists and links to the correct entity
 */
async function verifyCategoryEntity(
  categoryName: string,
  expectedQid: string
): Promise<{ isCorrect: boolean; foundQid?: string }> {
  try {
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

    // Check for Wikidata Infobox with QID
    const wikidataMatch = content.match(/{{Wikidata\s+Infobox[^}]*\|([^}|]+)/i);
    const foundQid = wikidataMatch?.[1]?.trim();

    return {
      isCorrect: foundQid === expectedQid,
      foundQid
    };
  } catch (error) {
    console.error('Error verifying category entity:', error);
    return { isCorrect: false };
  }
}

/**
 * Get the appropriate Commons category for a performer
 * This is the main function to use when categorizing performer images
 */
export async function getPerformerCategory(
  entity: WikidataEntity
): Promise<PerformerCategoryInfo> {
  const performerName = entity.labels?.en?.value || entity.id;
  const performerQid = entity.id;

  // Step 1: Check if entity has P373 (Commons category)
  const existingP373 = extractCommonsCategory(entity);

  if (existingP373) {
    // Verify the category exists
    const exists = await CommonsClient.categoryExists(existingP373);

    return {
      performerName,
      performerQid,
      commonsCategory: existingP373,
      source: 'p373',
      needsCreation: !exists,
      description: `[[d:${performerQid}|${performerName}]].`
    };
  }

  // Step 2: No P373 - check if base name category exists
  const baseNameExists = await CommonsClient.categoryExists(performerName);

  if (!baseNameExists) {
    // Base name doesn't exist - safe to use
    return {
      performerName,
      performerQid,
      commonsCategory: performerName,
      source: 'base',
      needsCreation: true,
      description: `[[d:${performerQid}|${performerName}]].`
    };
  }

  // Step 3: Base name exists - verify if it's the same entity
  const verification = await verifyCategoryEntity(performerName, performerQid);

  if (verification.isCorrect) {
    return {
      performerName,
      performerQid,
      commonsCategory: performerName,
      source: 'base',
      needsCreation: false,
      description: `[[d:${performerQid}|${performerName}]].`
    };
  }

  // If category exists but has no Wikidata link, assume it's the one we just created
  if (!verification.foundQid) {
    return {
      performerName,
      performerQid,
      commonsCategory: performerName,
      source: 'base',
      needsCreation: false,
      description: `[[d:${performerQid}|${performerName}]].`
    };
  }

  // Step 4: Need disambiguation
  const disambiguatedName = generateDisambiguatedName(performerName, entity);

  const disambigExists = await CommonsClient.categoryExists(disambiguatedName);

  return {
    performerName,
    performerQid,
    commonsCategory: disambiguatedName,
    source: 'disambiguated',
    needsCreation: !disambigExists,
    description: `[[d:${performerQid}|${performerName}]].`
  };
}

/**
 * Get categories for multiple performers
 */
export async function getPerformerCategories(
  entities: WikidataEntity[]
): Promise<PerformerCategoryInfo[]> {
  return Promise.all(entities.map(entity => getPerformerCategory(entity)));
}

/**
 * Helper to check if an entity is a person/performer
 */
export function isPerformer(entity: WikidataEntity): boolean {
  const instanceOf = entity.claims?.[WD_PROPERTIES.INSTANCE_OF];

  if (!instanceOf || instanceOf.length === 0) {
    return false;
  }

  // Check if entity is human (Q5)
  return instanceOf.some(claim =>
    claim.mainsnak?.datavalue?.value?.id === WD_PROPERTIES.HUMAN
  );
}

/**
 * Add performer categories to an image's category list
 * This should be called when tagging images with specific performers
 *
 * @param existingCategories - The current categories for the image
 * @param performerEntities - The Wikidata entities of performers to tag
 * @returns Updated array of categories including performer categories
 */
export async function addPerformerCategoriesToImage(
  existingCategories: string[],
  performerEntities: WikidataEntity[]
): Promise<string[]> {
  const performerCategories = await getPerformerCategories(performerEntities);

  const newCategories = new Set(existingCategories);

  performerCategories.forEach(info => {
    newCategories.add(info.commonsCategory);
  });

  return Array.from(newCategories);
}

/**
 * Get just the category names for a list of performers
 * Useful for displaying or validating categories before adding
 */
export async function getPerformerCategoryNames(
  performerEntities: WikidataEntity[]
): Promise<string[]> {
  const performerCategories = await getPerformerCategories(performerEntities);
  return performerCategories.map(info => info.commonsCategory);
}
