/**
 * Generate captions (short descriptions) for Commons structured data
 */

import { UniversalFormData } from '@/types/unified-form';
import { Caption } from '@/types/upload';

// Translation mappings for caption connector words
const TRANSLATIONS = {
  with: {
    en: 'with',
    no: 'med',
    nb: 'med',
    nn: 'med',
    de: 'mit',
    fr: 'avec',
    es: 'con',
    it: 'con',
    pt: 'com',
    nl: 'met',
    sv: 'med',
    da: 'med',
    fi: 'kanssa',
    pl: 'z',
    ru: 'с',
  },
  at: {
    en: 'at',
    no: 'på',
    nb: 'på',
    nn: 'på',
    de: 'bei',
    fr: 'à',
    es: 'en',
    it: 'a',
    pt: 'em',
    nl: 'bij',
    sv: 'på',
    da: 'ved',
    fi: 'tapahtumassa',
    pl: 'na',
    ru: 'на',
  }
};

/**
 * Generate captions in multiple languages
 */
export function generateMultilingualCaptions(
  formData: UniversalFormData,
  location?: string,
  date?: string,
  languages: string[] = ['en', 'nb', 'nn', 'de', 'fr', 'es']
): Caption[] {
  // Get performers and band ONCE outside the loop
  const performers = formData.entities?.people || [];
  const performerNames = performers
    .map(p => p.entity?.labels?.en?.value || p.entity?.id)
    .filter(Boolean);

  const organizations = formData.entities?.organizations || [];
  const bandName = organizations.length > 0
    ? organizations[0].entity?.labels?.en?.value || organizations[0].entity?.id
    : null;

  const eventTitle = formData.eventDetails?.title;
  const eventName = eventTitle ? eventTitle.replace(/\s+\d{4}$/, '') : '';
  const year = date ? new Date(date).getFullYear().toString() : '';

  // Loop through languages and build caption for each
  return languages.map(lang => {
    let caption = '';

    // Get translated words for this language
    const withWord = (TRANSLATIONS.with as any)[lang] || 'with';
    const atWord = (TRANSLATIONS.at as any)[lang] || 'at';

    // Add performers
    if (performerNames.length > 0) {
      caption += performerNames.join(', ');
    }

    // Add "with Band"
    if (bandName && performerNames.length > 0) {
      caption += ` ${withWord} ${bandName}`;
    } else if (bandName) {
      caption += bandName;
    }

    // Add "at Event"
    if (eventName) {
      caption += ` ${atWord} ${eventName}`;
    }

    // Add location and year
    if (location) {
      caption += ` ${location}`;
    }
    if (year) {
      caption += ` ${year}`;
    }

    return {
      language: lang,
      text: caption.trim()
    };
  });
}

/**
 * Generate caption in a specific language (single)
 */
export function generateCaption(
  formData: UniversalFormData,
  location?: string,
  date?: string,
  language: string = 'en'
): string {
  const captions = generateMultilingualCaptions(formData, location, date, [language]);
  return captions[0]?.text || '';
}

/**
 * Legacy function for backward compatibility
 */
export function generateCaptionFromDescription(
  formData: UniversalFormData,
  location?: string,
  date?: string
): string {
  return generateCaption(formData, location, date, 'en');
}
