import { ImageFile } from '@/types';

/**
 * Extract all categories from image wikitext using regex
 */
export function extractCategoriesFromWikitext(wikitext: string): string[] {
  if (!wikitext) return [];
  
  // Match [[Category:CategoryName]] patterns
  const categoryRegex = /\[\[Category:([^\]]+)\]\]/gi;
  const matches = wikitext.match(categoryRegex);
  
  if (!matches) return [];
  
  return matches.map(match => {
    // Extract the category name from [[Category:Name]]
    const categoryMatch = match.match(/\[\[Category:([^\]]+)\]\]/i);
    return categoryMatch ? categoryMatch[1].trim() : '';
  }).filter(cat => cat.length > 0);
}

/**
 * Get all unique categories from all images
 */
export function getAllCategoriesFromImages(images: ImageFile[]): string[] {
  const allCategories = new Set<string>();
  
  images.forEach(image => {
    // Add categories from metadata.categories array
    image.metadata.categories.forEach(cat => {
      if (cat.trim()) {
        allCategories.add(cat.trim());
      }
    });
    
    // Add categories from wikitext
    const wikitextCategories = extractCategoriesFromWikitext(image.metadata.wikitext || '');
    wikitextCategories.forEach(cat => {
      if (cat.trim()) {
        allCategories.add(cat.trim());
      }
    });
  });
  
  return Array.from(allCategories).sort();
}

/**
 * Update image metadata with categories found in wikitext
 */
export function syncCategoriesFromWikitext(image: ImageFile): ImageFile {
  const wikitextCategories = extractCategoriesFromWikitext(image.metadata.wikitext || '');
  const existingCategories = new Set(image.metadata.categories);
  
  // Add any new categories found in wikitext
  wikitextCategories.forEach(cat => {
    if (cat.trim() && !existingCategories.has(cat.trim())) {
      existingCategories.add(cat.trim());
    }
  });
  
  return {
    ...image,
    metadata: {
      ...image.metadata,
      categories: Array.from(existingCategories)
    }
  };
}