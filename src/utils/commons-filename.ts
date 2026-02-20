/**
 * Utilities for generating Commons-compliant filenames
 * Based on Commons naming conventions: https://commons.wikimedia.org/wiki/Commons:File_naming
 */

import { UniversalFormData } from '@/types/unified-form';

/**
 * Sanitize a string for use in Commons filenames
 * - Replace Norwegian/special characters with ASCII equivalents
 * - Remove or replace special characters
 * - Replace spaces with underscores
 * - Remove multiple consecutive underscores
 */
export function sanitizeForFilename(text: string): string {
  return text
    .trim()
    // Replace Norwegian characters with ASCII equivalents
    .replace(/æ/gi, 'ae')
    .replace(/ø/gi, 'o')
    .replace(/å/gi, 'aa')
    // Replace other common diacritics
    .replace(/ä/gi, 'a')
    .replace(/ö/gi, 'o')
    .replace(/ü/gi, 'u')
    .replace(/é/gi, 'e')
    .replace(/è/gi, 'e')
    .replace(/ê/gi, 'e')
    .replace(/à/gi, 'a')
    .replace(/á/gi, 'a')
    .replace(/ó/gi, 'o')
    .replace(/ú/gi, 'u')
    // Remove leading/trailing spaces
    .replace(/^\s+|\s+$/g, '')
    // Replace spaces with underscores
    .replace(/\s+/g, '_')
    // Remove special characters that Commons doesn't allow
    .replace(/[<>:"/\\|?*\[\]{}]/g, '')
    // Replace multiple underscores with single underscore
    .replace(/_+/g, '_')
    // Remove leading/trailing underscores
    .replace(/^_+|_+$/g, '');
}

/**
 * Check if a file exists on Commons
 */
async function checkFileExistsOnCommons(filename: string): Promise<boolean> {
  try {
    const response = await fetch(
      `https://commons.wikimedia.org/w/api.php?` +
      new URLSearchParams({
        action: 'query',
        titles: `File:${filename}`,
        format: 'json',
        origin: '*'
      })
    );

    const data = await response.json();
    console.log('🌐 Commons API response for', filename, ':', data);

    const pages = data.query?.pages || {};
    const page = Object.values(pages)[0] as any;

    console.log('📄 Page data:', page);
    console.log('❓ Has missing property:', 'missing' in page);
    console.log('❓ Missing value:', page.missing);

    // If page.missing property exists, file doesn't exist
    // The property is present (even if undefined) for non-existent files
    const exists = !('missing' in page);
    console.log(`✅ File ${filename} exists on Commons: ${exists}`);
    return exists;
  } catch (error) {
    console.error('❌ Error checking file existence:', error);
    return false; // Assume doesn't exist if check fails
  }
}

/**
 * Generate a Commons-compliant filename based on event data
 * Checks for uniqueness against existing filenames and Commons
 */
export async function generateCommonsFilename(
  originalFilename: string,
  formData: UniversalFormData,
  imageIndex: number,
  existingFilenames: string[] = []
): Promise<string> {
  const ext = originalFilename.split('.').pop()?.toLowerCase() || 'jpg';

  // Get event details
  const eventTitle = formData.eventDetails?.title || 'Event';
  const eventDate = formData.eventDetails?.date;
  const location = formData.eventDetails?.location;

  // Get performer info if available
  const performers = formData.entities?.people || [];
  const organizations = formData.entities?.organizations || [];

  // Try to get main band/organization first, then fall back to individual performers
  let mainPerformer = null;
  if (organizations.length > 0) {
    mainPerformer = organizations[0].entity?.labels?.en?.value || organizations[0].labels?.en?.value || organizations[0].entity?.id;
  } else if (performers.length > 0) {
    mainPerformer = performers[0].entity?.labels?.en?.value || performers[0].entity?.id;
  }

  // Build filename parts
  const parts: string[] = [];

  // 1. Band/Performer name (always first if available)
  if (mainPerformer) {
    parts.push(sanitizeForFilename(mainPerformer));
  }

  // 2. Event title (only if different from performer/band)
  if (eventTitle && eventTitle !== mainPerformer && mainPerformer) {
    // Don't add event title if it's redundant
    const sanitizedTitle = sanitizeForFilename(eventTitle);
    const sanitizedPerformer = sanitizeForFilename(mainPerformer);
    if (sanitizedTitle !== sanitizedPerformer) {
      parts.push(sanitizedTitle);
    }
  } else if (eventTitle && !mainPerformer) {
    // No performer, use event title
    parts.push(sanitizeForFilename(eventTitle));
  }

  // 3. Location (if available)
  if (location) {
    parts.push(sanitizeForFilename(location));
  }

  // 4. Date in YYYY-MM-DD format
  if (eventDate) {
    console.log('📅 Date input:', eventDate, 'Type:', typeof eventDate);
    const date = typeof eventDate === 'string' ? new Date(eventDate) : eventDate;
    console.log('📅 Parsed date:', date, 'UTC:', date.toISOString());

    // Use UTC methods to avoid timezone issues
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;
    console.log('📅 Formatted date:', dateStr);
    parts.push(dateStr);
  }

  // 5. Image number - check for uniqueness
  let counter = imageIndex + 1;
  let baseFilename = parts.join('_');
  let filename = `${baseFilename}_${String(counter).padStart(2, '0')}.${ext}`;

  // Check against existing filenames and Commons
  let isUnique = false;
  while (!isUnique) {
    // Check local list first (fast)
    if (existingFilenames.includes(filename)) {
      counter++;
      filename = `${baseFilename}_${String(counter).padStart(2, '0')}.${ext}`;
      console.log('⚠️  Local filename collision detected, incrementing to:', filename);
      continue;
    }

    // Check Commons (slower, but necessary)
    const existsOnCommons = await checkFileExistsOnCommons(filename);
    if (existsOnCommons) {
      counter++;
      filename = `${baseFilename}_${String(counter).padStart(2, '0')}.${ext}`;
      console.log('⚠️  Commons filename collision detected, incrementing to:', filename);
      continue;
    }

    // Unique!
    isUnique = true;
  }

  return filename;
}

/**
 * Generate a batch of filenames for multiple images
 */
export async function generateBatchFilenames(
  files: Array<{ file: File; metadata?: any }>,
  formData: UniversalFormData
): Promise<string[]> {
  return Promise.all(files.map((fileData, index) =>
    generateCommonsFilename(fileData.file.name, formData, index)
  ));
}

/**
 * Preview filename without applying it
 */
export async function previewFilename(
  originalFilename: string,
  formData: UniversalFormData,
  imageIndex: number
): Promise<{ original: string; suggested: string }> {
  return {
    original: originalFilename,
    suggested: await generateCommonsFilename(originalFilename, formData, imageIndex)
  };
}

/**
 * Check if filename needs Commons formatting
 */
export function needsFormatting(filename: string): boolean {
  // Check for common issues
  const hasSpaces = /\s/.test(filename);
  const hasSpecialChars = /[<>:"/\\|?*\[\]{}]/.test(filename);
  const hasMultipleUnderscores = /__/.test(filename);

  return hasSpaces || hasSpecialChars || hasMultipleUnderscores;
}
