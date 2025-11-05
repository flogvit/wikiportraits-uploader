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
 * Generate a Commons-compliant filename based on event data
 */
export function generateCommonsFilename(
  originalFilename: string,
  formData: UniversalFormData,
  imageIndex: number
): string {
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
    mainPerformer = organizations[0].entity?.labels?.en?.value || organizations[0].entity?.id;
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

  // 5. Image number (if multiple images)
  parts.push(String(imageIndex + 1).padStart(2, '0'));

  // Join parts and add extension
  const filename = parts.join('_') + '.' + ext;

  return filename;
}

/**
 * Generate a batch of filenames for multiple images
 */
export function generateBatchFilenames(
  files: Array<{ file: File; metadata?: any }>,
  formData: UniversalFormData
): string[] {
  return files.map((fileData, index) =>
    generateCommonsFilename(fileData.file.name, formData, index)
  );
}

/**
 * Preview filename without applying it
 */
export function previewFilename(
  originalFilename: string,
  formData: UniversalFormData,
  imageIndex: number
): { original: string; suggested: string } {
  return {
    original: originalFilename,
    suggested: generateCommonsFilename(originalFilename, formData, imageIndex)
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
