import { loadAuthorWikidataQid } from './localStorage';

/**
 * Fetch photographer details from Wikidata Q-ID
 * Used for display purposes when we need to show the photographer's name
 */
export const fetchPhotographerDetails = async (qid?: string) => {
  const wikidataQid = qid || loadAuthorWikidataQid();
  
  if (!wikidataQid) {
    return null;
  }
  
  try {
    const response = await fetch(`/api/wikidata/get-entity?id=${wikidataQid}`);
    if (response.ok) {
      const entity = await response.json();
      return {
        qid: wikidataQid,
        label: entity.label,
        description: entity.description,
        url: entity.url
      };
    }
  } catch (error) {
    console.error('Error fetching photographer details:', error);
  }
  return null;
};

/**
 * Get the current photographer's Q-ID
 */
export const getCurrentPhotographerQid = () => {
  return loadAuthorWikidataQid();
};

/**
 * Generate the author field for Commons uploads
 * Uses [[d:QID|Name]] syntax to link to Wikidata without requiring a Creator page
 */
export const generateAuthorField = (qid?: string, name?: string) => {
  const wikidataQid = qid || loadAuthorWikidataQid();

  if (wikidataQid) {
    // Use simple Wikidata link format: [[d:QID|Name]]
    // This works even if Creator page doesn't exist
    if (name) {
      return `[[d:${wikidataQid}|${name}]]`;
    }
    // If no name provided, just use the QID
    return `[[d:${wikidataQid}]]`;
  }

  return 'Unknown photographer';
};