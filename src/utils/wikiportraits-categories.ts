/**
 * WikiPortraits category generation following WikiPortraits best practices
 *
 * WikiPortraits category structure:
 * - Format: "WikiPortraits at {year} {event}" (year first for chronological sorting)
 * - Parent categories: "WikiPortraits at music events" and "WikiPortraits in {year}"
 */

import { CategoryCreationInfo } from '@/types/categories';

export interface WikiPortraitsCategoryInfo {
  mainCategory: string;          // e.g., "WikiPortraits at 2025 Jærnåttå"
  yearCategory: string;           // e.g., "WikiPortraits in 2025"
  typeCategory: string;           // e.g., "WikiPortraits at music events"
  categoriesToCreate: CategoryCreationInfo[];
}

/**
 * Generate WikiPortraits category structure for a music event
 *
 * @param eventName - Event name without year (e.g., "Jærnåttå")
 * @param year - Year as string (e.g., "2025")
 * @param eventType - Type of event (default: "music events")
 */
export function generateWikiPortraitsCategories(
  eventName: string,
  year: string,
  eventType: 'music events' | 'concerts' | 'festivals' = 'music events'
): WikiPortraitsCategoryInfo {
  // Main WikiPortraits category: "WikiPortraits at 2025 Jærnåttå"
  const mainCategory = `WikiPortraits at ${year} ${eventName}`;

  // Year category: "WikiPortraits in 2025"
  const yearCategory = `WikiPortraits in ${year}`;

  // Type category: "WikiPortraits at music events"
  const typeCategory = `WikiPortraits at ${eventType}`;

  const categoriesToCreate: CategoryCreationInfo[] = [
    {
      categoryName: mainCategory,
      shouldCreate: true,
      parentCategory: yearCategory,
      description: `Images from [[${eventName}]] uploaded via [[c:Commons:WikiPortraits|WikiPortraits]].`,
      eventName: eventName,
      additionalParents: [typeCategory]
    },
    {
      categoryName: yearCategory,
      shouldCreate: true,
      parentCategory: 'WikiPortraits',
      description: `Images uploaded via [[c:Commons:WikiPortraits|WikiPortraits]] in ${year}.`,
      eventName: 'WikiPortraits'
    },
    {
      categoryName: typeCategory,
      shouldCreate: true,
      parentCategory: 'WikiPortraits',
      description: `Images from music events uploaded via [[c:Commons:WikiPortraits|WikiPortraits]].`,
      eventName: 'WikiPortraits'
    }
  ];

  return {
    mainCategory,
    yearCategory,
    typeCategory,
    categoriesToCreate
  };
}

/**
 * Get the WikiPortraits category name for an event
 * This is what should be used in wikitext [[Category:...]]
 *
 * @param eventName - Event name without year (e.g., "Jærnåttå")
 * @param year - Year as string (e.g., "2025")
 */
export function getWikiPortraitsCategoryName(eventName: string, year: string): string {
  return `WikiPortraits at ${year} ${eventName}`;
}

/**
 * Extract event name without year from full event name
 * e.g., "Jærnåttå 2025" -> "Jærnåttå"
 */
export function extractEventNameWithoutYear(fullEventName: string): string {
  // Remove year pattern (4 digits at the end)
  return fullEventName.replace(/\s*\d{4}\s*$/, '').trim();
}

/**
 * Check if we should create WikiPortraits categories
 * based on whether they already exist
 */
export async function getWikiPortraitsCategoriesToCreate(
  eventName: string,
  year: string,
  eventType: 'music events' | 'concerts' | 'festivals' = 'music events'
): Promise<CategoryCreationInfo[]> {
  const { CommonsClient } = await import('@/lib/api/CommonsClient');
  const info = generateWikiPortraitsCategories(eventName, year, eventType);

  const categoriesToCreate: CategoryCreationInfo[] = [];

  // Check each category
  for (const cat of info.categoriesToCreate) {
    const exists = await CommonsClient.categoryExists(cat.categoryName);
    if (!exists) {
      categoriesToCreate.push(cat);
    }
  }

  return categoriesToCreate;
}
