/**
 * Utilities for managing WikiPortraits event templates on Commons
 */

import { CommonsClient } from '@/lib/api/CommonsClient';

export interface WikiPortraitsTemplateConfig {
  eventName: string;
  eventTitle: string; // Full title with links (e.g., "[[:en:Jærnåttå|Jærnåttå {{{1}}}]]")
  templateName: string; // e.g., "WikiPortraits/Jærnåttå"
  photoCat: string; // e.g., "WikiPortraits at {{{1}}} Jærnåttå"
  accent?: string; // Hex color for accent
  wikipediaLink?: string; // e.g., "en:Jærnåttå"
}

/**
 * Generate the standard WikiPortraits template content (one-time creation)
 * This template uses parameters and can be reused for all events
 */
export function generateStandardWikiPortraitsTemplate(): string {
  return `{{WikiPortraits
 | title    = [[:{{{lang|en}}}:{{{page|{{{event}}}}}}|{{{event}}} {{{year}}}]]
 | photocat = {{#if:{{{photocat|}}}
               | {{{photocat}}}
               | WikiPortraits at {{{year}}} {{{event}}}
              }}
 | accent   = {{{accent|#4b8510}}}
}}
<includeonly>
{{#ifeq: {{NAMESPACENUMBER}} | 6
 | [[Category:{{#if:{{{category|}}}
                | {{{category}}}
                | WikiPortraits at {{{year}}} {{{event}}}
               }}]]
}}
</includeonly>
<noinclude>{{Documentation}}</noinclude>`;
}

/**
 * Generate template usage parameters for a specific event
 * Uses the standard WikiPortraits template with event-specific parameters
 */
export function generateTemplateParameters(eventDetails: {
  title: string;
  wikipediaUrl?: string;
  wikidataId?: string;
  language?: string;
}, year: string | number): string {
  const eventName = eventDetails.title;
  const language = eventDetails.language || 'en';

  // Extract Wikipedia page name if available
  let wikipediaPage = eventName;
  if (eventDetails.wikipediaUrl) {
    const urlParts = eventDetails.wikipediaUrl.split('/');
    wikipediaPage = decodeURIComponent(urlParts[urlParts.length - 1]);
  }

  // Build template usage with parameters
  const params = [
    `event=${eventName}`,
    `year=${year}`,
    `lang=${language}`,
    `page=${wikipediaPage}`
  ];

  return `{{WikiPortraits_uploader|${params.join('|')}}}`;
}

/**
 * Check if the standard WikiPortraits template exists on Commons
 */
export async function checkStandardTemplateExists(): Promise<boolean> {
  return checkTemplateExists('WikiPortraits_uploader');
}

/**
 * Check if WikiPortraits template exists on Commons
 */
export async function checkTemplateExists(templateName: string): Promise<boolean> {
  try {
    const fullTemplateName = templateName.startsWith('Template:')
      ? templateName
      : `Template:${templateName}`;

    // Use Commons API to check if template page exists
    const response = await fetch(
      `https://commons.wikimedia.org/w/api.php?` +
      new URLSearchParams({
        action: 'query',
        titles: fullTemplateName,
        format: 'json',
        origin: '*'
      })
    );

    const data = await response.json();
    if (data.query?.pages) {
      const page = Object.values(data.query.pages)[0] as any;
      return page.missing === undefined;
    }

    return false;
  } catch (error) {
    console.error('Error checking template existence:', error);
    return false;
  }
}

/**
 * Get the standard template name (always "WikiPortraits_uploader")
 */
export function getStandardTemplateName(): string {
  return 'WikiPortraits_uploader';
}

/**
 * Generate summary for creating the template on Commons
 */
export function getTemplateCreationSummary(eventName: string): string {
  return `Creating WikiPortraits event template for ${eventName}`;
}

/**
 * Parse year from date
 */
export function getYearFromDate(date: string | Date): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return dateObj.getFullYear().toString();
}
