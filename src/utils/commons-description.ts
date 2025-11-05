/**
 * Generate standard Commons-compliant descriptions for images
 * Prevents "incomplete description" warnings on Commons
 */

import { UniversalFormData } from '@/types/unified-form';

export interface DescriptionOptions {
  includePerformers?: boolean;
  includeLocation?: boolean;
  includeDate?: boolean;
  language?: string;
}

/**
 * Generate a standard Commons description for a music event image
 */
export function generateMusicEventDescription(
  formData: UniversalFormData,
  options: DescriptionOptions = {}
): string {
  const {
    includePerformers = true,
    includeLocation = true,
    includeDate = true,
    language = 'en'
  } = options;

  const parts: string[] = [];

  // Get event details
  const eventTitle = formData.eventDetails?.title;
  const eventDate = formData.eventDetails?.date;
  const location = formData.eventDetails?.location;
  const venue = formData.eventDetails?.venue;

  // Get band/organization first, then individual performers
  const organizations = formData.entities?.organizations || [];
  const performers = formData.entities?.people || [];

  const bandName = organizations.length > 0
    ? organizations[0].entity?.labels?.en?.value || organizations[0].entity?.id
    : null;

  const performerNames = performers
    .map(p => p.entity?.labels?.en?.value || p.entity?.id)
    .filter(Boolean);

  // Build description
  if (includePerformers) {
    // If we have a band, use that
    if (bandName) {
      parts.push(bandName);

      // If we also have specific performers, add them
      if (performerNames.length > 0) {
        if (performerNames.length === 1) {
          parts.push(`featuring ${performerNames[0]}`);
        } else if (performerNames.length === 2) {
          parts.push(`featuring ${performerNames[0]} and ${performerNames[1]}`);
        } else {
          const lastPerformer = performerNames[performerNames.length - 1];
          const otherPerformers = performerNames.slice(0, -1).join(', ');
          parts.push(`featuring ${otherPerformers}, and ${lastPerformer}`);
        }
      }
      parts.push('performing');
    }
    // Otherwise use individual performers
    else if (performerNames.length > 0) {
      if (performerNames.length === 1) {
        parts.push(performerNames[0]);
      } else if (performerNames.length === 2) {
        parts.push(`${performerNames[0]} and ${performerNames[1]}`);
      } else {
        const lastPerformer = performerNames[performerNames.length - 1];
        const otherPerformers = performerNames.slice(0, -1).join(', ');
        parts.push(`${otherPerformers}, and ${lastPerformer}`);
      }
      parts.push('performing');
    }
  }

  // Add event title
  if (eventTitle) {
    if (parts.length > 0) {
      parts.push('at');
    }
    parts.push(eventTitle);
  }

  // Add location
  if ((venue || location) && includeLocation) {
    const locationParts: string[] = [];
    if (venue) locationParts.push(venue);
    if (location && location !== venue) locationParts.push(location);

    if (locationParts.length > 0) {
      if (parts.length > 0) {
        parts.push('in');
      }
      parts.push(locationParts.join(', '));
    }
  }

  // Add date
  if (eventDate && includeDate) {
    const date = new Date(eventDate);
    const dateStr = date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    if (parts.length > 0) {
      parts.push('on');
    }
    parts.push(dateStr);
  }

  let description = parts.join(' ');

  // Capitalize first letter
  if (description.length > 0) {
    description = description.charAt(0).toUpperCase() + description.slice(1);
  }

  // Add period if not present
  if (description && !description.endsWith('.')) {
    description += '.';
  }

  // Wrap in language template for proper Commons formatting
  if (description) {
    description = `{{${language}|1=${description}}}`;
  } else {
    description = `{{${language}|1=Concert photograph}}`;
  }

  return description;
}

/**
 * Generate a minimal Commons-compliant description
 * Used as fallback if detailed info not available
 */
export function generateMinimalDescription(
  formData: UniversalFormData
): string {
  const eventTitle = formData.eventDetails?.title;
  const eventDate = formData.eventDetails?.date;

  if (eventTitle && eventDate) {
    const year = new Date(eventDate).getFullYear();
    return `${eventTitle} ${year}`;
  }

  if (eventTitle) {
    return eventTitle;
  }

  return 'Concert photograph';
}

/**
 * Generate description for a general upload (non-music)
 */
export function generateGeneralDescription(
  formData: UniversalFormData,
  customText?: string
): string {
  if (customText && customText.trim()) {
    return customText.trim();
  }

  // Fallback to minimal description
  return generateMinimalDescription(formData);
}

/**
 * Check if description meets Commons minimum requirements
 */
export function isDescriptionComplete(description: string): boolean {
  if (!description || description.trim().length === 0) {
    return false;
  }

  // Commons requires at least a few words
  const wordCount = description.trim().split(/\s+/).length;
  return wordCount >= 2;
}

/**
 * Get description suggestions based on form data
 */
export function getDescriptionSuggestions(
  formData: UniversalFormData
): string[] {
  const suggestions: string[] = [];

  // Full description
  const fullDesc = generateMusicEventDescription(formData);
  if (fullDesc !== 'Concert photograph') {
    suggestions.push(fullDesc);
  }

  // Without date
  const noDateDesc = generateMusicEventDescription(formData, { includeDate: false });
  if (noDateDesc !== fullDesc && noDateDesc !== 'Concert photograph') {
    suggestions.push(noDateDesc);
  }

  // Without location
  const noLocationDesc = generateMusicEventDescription(formData, { includeLocation: false });
  if (noLocationDesc !== fullDesc && noLocationDesc !== noDateDesc && noLocationDesc !== 'Concert photograph') {
    suggestions.push(noLocationDesc);
  }

  // Minimal
  const minimalDesc = generateMinimalDescription(formData);
  if (minimalDesc !== 'Concert photograph' && !suggestions.includes(minimalDesc)) {
    suggestions.push(minimalDesc);
  }

  // Always include fallback
  suggestions.push('Concert photograph');

  return suggestions;
}
