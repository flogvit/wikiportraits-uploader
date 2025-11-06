import { MusicEventMetadata, FestivalMetadata, ConcertMetadata, MusicArtist } from '@/types/music';
import { CategoryCreationInfo } from '@/types/categories';

// Helper function to get the correct Wikipedia page name for bands/artists
function getWikipediaPageName(bandName: string, wikipediaUrl?: string): string {
  if (wikipediaUrl) {
    // Extract the page name from the Wikipedia URL
    const urlParts = wikipediaUrl.split('/');
    const pageName = urlParts[urlParts.length - 1];
    return decodeURIComponent(pageName.replace(/_/g, ' '));
  }
  
  // If no Wikipedia URL is provided, return the band name as is
  // In practice, this should be looked up via the Wikipedia search API
  return bandName;
}

export interface MusicCategoryOptions {
  eventData: MusicEventMetadata;
  includeBandCategories?: boolean;
  includeEventCategories?: boolean;
  includeWikiPortraitsIntegration?: boolean;
}

export type { CategoryCreationInfo } from '@/types/categories';

export function generateMusicCategories(eventDataOrOptions: any): string[] {
  // Handle both old signature (with options object) and new signature (plain eventData)
  let eventData: any;
  let includeBandCategories = true;
  let includeEventCategories = true;
  let includeWikiPortraitsIntegration = true;

  if (eventDataOrOptions?.eventData) {
    // Old signature with MusicCategoryOptions
    eventData = eventDataOrOptions.eventData;
    includeBandCategories = eventDataOrOptions.includeBandCategories ?? true;
    includeEventCategories = eventDataOrOptions.includeEventCategories ?? true;
    includeWikiPortraitsIntegration = eventDataOrOptions.includeWikiPortraitsIntegration ?? true;
  } else {
    // New signature with plain eventData
    eventData = eventDataOrOptions;
  }

  const categories: Set<string> = new Set();

  // Base WikiPortraits category
  categories.add('WikiPortraits');

  if (!eventData) {
    return Array.from(categories);
  }

  // Handle unified event format (from EventDetailsForm)
  if (eventData.title && !eventData.eventType) {
    return generateUnifiedEventCategories(eventData);
  }

  // Handle legacy music event format
  if (eventData.eventType === 'festival' && eventData.festivalData) {
    return generateFestivalCategories(eventData.festivalData, {
      includeBandCategories,
      includeEventCategories,
      includeWikiPortraitsIntegration
    });
  } else if (eventData.eventType === 'concert' && eventData.concertData) {
    return generateConcertCategories(eventData.concertData, {
      includeBandCategories,
      includeEventCategories,
      includeWikiPortraitsIntegration
    });
  }

  return Array.from(categories);
}

/**
 * Generate categories for unified event format (from EventDetailsForm)
 */
function generateUnifiedEventCategories(eventData: any): string[] {
  const categories: Set<string> = new Set();
  const { title, date, participants, commonsCategory } = eventData;

  // Base WikiPortraits category
  categories.add('WikiPortraits');

  if (!title) {
    return Array.from(categories);
  }

  // Extract year from date
  const year = date ? new Date(date).getFullYear().toString() : '';
  const eventName = commonsCategory || (year ? `${title} ${year}` : title);

  // Add WikiPortraits at Event category - use "WikiPortraits at {year} {event}" format
  // Extract event name without year for WikiPortraits category
  const eventNameWithoutYear = title; // Just the event name, no year
  if (year) {
    // Format: "WikiPortraits at 2025 Jærnåttå" (year first)
    categories.add(`WikiPortraits at ${year} ${eventNameWithoutYear}`);
    // Also add year category: "WikiPortraits in 2025"
    categories.add(`WikiPortraits in ${year}`);
    // Also add type category: "WikiPortraits at music events"
    categories.add('WikiPortraits at music events');
  } else {
    categories.add(`WikiPortraits at ${eventName}`);
  }

  // Add main event category
  categories.add(eventName);

  // Add participant-specific categories
  if (participants && Array.isArray(participants)) {
    participants.forEach((participant: any) => {
      if (participant.name && participant.commonsCategory) {
        categories.add(participant.commonsCategory);
      }
    });
  }

  return Array.from(categories).sort();
}

function generateFestivalCategories(
  festivalData: FestivalMetadata,
  options: { includeBandCategories: boolean; includeEventCategories: boolean; includeWikiPortraitsIntegration: boolean }
): string[] {
  const categories: Set<string> = new Set();
  const { festival, selectedBands, addToWikiPortraitsConcerts } = festivalData;

  // Base WikiPortraits category
  categories.add('WikiPortraits');

  // WikiPortraits at Concerts integration
  if (addToWikiPortraitsConcerts && options.includeWikiPortraitsIntegration) {
    categories.add('WikiPortraits at Concerts');
  }

  // Main festival category: "Category:Jærnåttå 2025"
  if (options.includeEventCategories && festival.name && festival.year) {
    const festivalCategory = `${festival.name} ${festival.year}`;
    categories.add(festivalCategory);

    // General festival category: "Category:Jærnåttå"
    categories.add(festival.name);

    // Location-based category
    if (festival.location) {
      categories.add(`Music festivals in ${festival.location}`);
    }

    // Country-based category
    if (festival.country) {
      categories.add(`Music festivals in ${festival.country}`);
    }

    // Year-based category
    categories.add(`Music festivals in ${festival.year}`);
  }

  // Band-specific categories
  if (options.includeBandCategories && selectedBands.length > 0) {
    selectedBands.forEach(band => {
      if (band.name) {
        // Individual band category
        categories.add(band.name);

        // Festival-specific band category: "Category:FordRekord at Jærnåttå 2025"
        if (festival.name && festival.year) {
          categories.add(`${band.name} at ${festival.name} ${festival.year}`);
        }

      }
    });
  }

  return Array.from(categories).sort();
}

function generateConcertCategories(
  concertData: ConcertMetadata,
  options: { includeBandCategories: boolean; includeEventCategories: boolean; includeWikiPortraitsIntegration: boolean }
): string[] {
  const categories: Set<string> = new Set();
  const { concert, addToWikiPortraitsConcerts } = concertData;

  // Base WikiPortraits category
  categories.add('WikiPortraits');

  // WikiPortraits at Concerts integration
  if (addToWikiPortraitsConcerts && options.includeWikiPortraitsIntegration) {
    categories.add('WikiPortraits at Concerts');
  }

  // Artist/Band category
  if (options.includeBandCategories && concert.artist.name) {
    categories.add(concert.artist.name);

  }

  // Concert-specific categories
  if (options.includeEventCategories) {
    // Venue category
    if (concert.venue) {
      categories.add(`Concerts at ${concert.venue}`);
    }

    // City category
    if (concert.city) {
      categories.add(`Concerts in ${concert.city}`);
    }

    // Country category
    if (concert.country) {
      categories.add(`Concerts in ${concert.country}`);
    }

    // Year category
    if (concert.date) {
      const year = new Date(concert.date).getFullYear().toString();
      categories.add(`Concerts in ${year}`);
    }

    // Tour category
    if (concert.tour) {
      categories.add(`${concert.tour} tour`);
      if (concert.artist.name) {
        categories.add(`${concert.artist.name} tours`);
      }
    }
  }

  return Array.from(categories).sort();
}

export function getCategoriesToCreate(eventData: any): CategoryCreationInfo[] {
  const categoriesToCreate: CategoryCreationInfo[] = [];

  // Handle unified event format (from EventDetailsForm)
  if (eventData.title && !eventData.eventType) {
    return getUnifiedEventCategoriesToCreate(eventData);
  }

  // Handle legacy music event format
  if (eventData.eventType === 'festival' && eventData.festivalData) {
    return getFestivalCategoriesToCreate(eventData.festivalData);
  } else if (eventData.eventType === 'concert' && eventData.concertData) {
    return getConcertCategoriesToCreate(eventData.concertData);
  }

  return categoriesToCreate;
}

function getFestivalCategoriesToCreate(festivalData: FestivalMetadata): CategoryCreationInfo[] {
  const categoriesToCreate: CategoryCreationInfo[] = [];
  const { festival, selectedBands, addToWikiPortraitsConcerts } = festivalData;

  // Create main festival category
  if (festival.name && festival.year) {
    const festivalCategory = `${festival.name} ${festival.year}`;
    categoriesToCreate.push({
      categoryName: festivalCategory,
      shouldCreate: true,
      parentCategory: festival.name,
      description: `[[${festival.name}]] ${festival.year}${festival.location ? ` in ${festival.location}` : ''}.`,
      eventName: festival.name
    });

    // Create WikiPortraits at Festival category
    const wikiPortraitsFestivalCategory = `WikiPortraits at ${festival.name} ${festival.year}`;
    categoriesToCreate.push({
      categoryName: wikiPortraitsFestivalCategory,
      shouldCreate: true,
      parentCategory: 'WikiPortraits',
      description: `WikiPortraits photos taken at [[${festival.name}]] ${festival.year}.`,
      eventName: festival.name
    });

    // Create general festival category
    categoriesToCreate.push({
      categoryName: festival.name,
      shouldCreate: true,
      parentCategory: addToWikiPortraitsConcerts ? 'WikiPortraits at Concerts' : undefined,
      description: `[[${festival.name}]] music festival.`,
      eventName: festival.name
    });

    // Create band subcategories
    selectedBands.forEach(band => {
      if (band.name) {
        const bandAtFestivalCategory = `${band.name} at ${festival.name} ${festival.year}`;
        categoriesToCreate.push({
          categoryName: bandAtFestivalCategory,
          shouldCreate: true,
          parentCategory: festivalCategory,
          description: `[[${getWikipediaPageName(band.name, band.wikipediaUrl)}]] performing at [[${festival.name}]] ${festival.year}.`,
          eventName: festival.name
        });

        // Create individual band category if needed - this is the key addition!
        const bandWikipediaName = getWikipediaPageName(band.name, band.wikipediaUrl);
        categoriesToCreate.push({
          categoryName: band.name,
          shouldCreate: true,
          description: `[[${bandWikipediaName}]].`,
          eventName: festival.name
        });
      }
    });
  }

  return categoriesToCreate;
}

function getConcertCategoriesToCreate(concertData: ConcertMetadata): CategoryCreationInfo[] {
  const categoriesToCreate: CategoryCreationInfo[] = [];
  const { concert, addToWikiPortraitsConcerts } = concertData;

  // Create artist category - this is the key addition for individual artist categories!
  if (concert.artist.name) {
    const artistWikipediaName = getWikipediaPageName(concert.artist.name, concert.artist.wikipediaUrl);
    categoriesToCreate.push({
      categoryName: concert.artist.name,
      shouldCreate: true,
      parentCategory: addToWikiPortraitsConcerts ? 'WikiPortraits at Concerts' : undefined,
      description: `[[${artistWikipediaName}]].`,
      eventName: concert.artist.name
    });

    // Create venue category if applicable
    if (concert.venue) {
      categoriesToCreate.push({
        categoryName: `Concerts at ${concert.venue}`,
        shouldCreate: true,
        description: `Concerts held at ${concert.venue}${concert.city ? ` in ${concert.city}` : ''}.`,
        eventName: concert.artist.name
      });
    }
  }

  return categoriesToCreate;
}

/**
 * Detect and auto-create band-at-event categories from all image categories
 * Scans for pattern: "BandName at EventName YYYY" and creates them with proper parents
 */
export function detectBandCategories(allCategories: string[], eventName: string): CategoryCreationInfo[] {
  const bandCategories: CategoryCreationInfo[] = [];
  const bandAtEventPattern = new RegExp(`^(.+) at ${eventName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`);

  allCategories.forEach(category => {
    const match = category.match(bandAtEventPattern);
    if (match) {
      const bandName = match[1];
      bandCategories.push({
        categoryName: category,
        shouldCreate: true,
        parentCategory: eventName,
        description: `[[${bandName}]] performing at ${eventName}.`,
        eventName
      });
    }
  });

  return bandCategories;
}

/**
 * Generate categories for unified event format (from EventDetailsForm)
 * This handles events with participants like Eurovision
 */
function getUnifiedEventCategoriesToCreate(eventData: any): CategoryCreationInfo[] {
  const categoriesToCreate: CategoryCreationInfo[] = [];
  const { title, date, participants, commonsCategory, categoryExists } = eventData;

  if (!title) {
    return categoriesToCreate;
  }

  // Extract year from date
  const year = date ? new Date(date).getFullYear().toString() : '';

  // Use the Commons category if provided, otherwise construct it
  const eventName = commonsCategory || (year ? `${title} ${year}` : title);

  // Extract base event name (without year) for parent categories
  const baseEventName = title.replace(/\s+\d{4}$/, ''); // Remove year if in title

  // Note: We assume parent categories exist for well-known events
  // This is a heuristic - in reality we'd need to check each one
  const isWellKnownEvent = eventName.toLowerCase().includes('eurovision') ||
                           eventName.toLowerCase().includes('coachella') ||
                           eventName.toLowerCase().includes('glastonbury');

  // 1. Create base event category (e.g., "Eurovision Song Contest")
  // Assume it exists for well-known events
  categoriesToCreate.push({
    categoryName: baseEventName,
    shouldCreate: !isWellKnownEvent, // Don't create if it's a well-known event
    parentCategory: undefined, // Top-level category
    description: `[[${baseEventName}]].`,
    eventName: baseEventName
  });

  // 2. Create "by year" parent category (e.g., "Eurovision Song Contest by year")
  const byYearCategory = `${baseEventName} by year`;
  if (year) {
    categoriesToCreate.push({
      categoryName: byYearCategory,
      shouldCreate: !isWellKnownEvent, // Don't create if it's a well-known event
      parentCategory: baseEventName,
      description: `[[${baseEventName}]] by year.`,
      eventName: baseEventName
    });
  }

  // 3. Create specific year event category (e.g., "Eurovision Song Contest 2025")
  // Use the categoryExists flag from the event selector if available
  // If undefined, assume it needs creation (manual entry)
  categoriesToCreate.push({
    categoryName: eventName,
    shouldCreate: categoryExists !== true, // Create unless we explicitly know it exists
    parentCategory: year ? byYearCategory : baseEventName,
    description: `${title}${year ? ` ${year}` : ''}.`,
    eventName: title
  });

  // 4. Create WikiPortraits year category (e.g., "WikiPortraits in 2025")
  if (year) {
    const wikiPortraitsYearCategory = `WikiPortraits in ${year}`;
    categoriesToCreate.push({
      categoryName: wikiPortraitsYearCategory,
      shouldCreate: true,
      parentCategory: 'WikiPortraits',
      description: `Images uploaded via [[c:Commons:WikiPortraits|WikiPortraits]] in ${year}.`,
      eventName: 'WikiPortraits'
    });
  }

  // 5. Create WikiPortraits at music events category
  const wikiPortraitsMusicCategory = 'WikiPortraits at music events';
  categoriesToCreate.push({
    categoryName: wikiPortraitsMusicCategory,
    shouldCreate: true,
    parentCategory: 'WikiPortraits',
    description: `Images from music events uploaded via [[c:Commons:WikiPortraits|WikiPortraits]].`,
    eventName: 'WikiPortraits'
  });

  // 6. Create WikiPortraits at Event category with proper format: "WikiPortraits at {year} {event}"
  // e.g., "WikiPortraits at 2025 Jærnåttå" (year first for chronological sorting)
  const wikiPortraitsEventCategory = year
    ? `WikiPortraits at ${year} ${baseEventName}`
    : `WikiPortraits at ${title}`;

  categoriesToCreate.push({
    categoryName: wikiPortraitsEventCategory,
    shouldCreate: true,
    parentCategory: year ? `WikiPortraits in ${year}` : 'WikiPortraits',
    description: `Images from [[${title}]]${year ? ` ${year}` : ''} uploaded via [[c:Commons:WikiPortraits|WikiPortraits]].`,
    eventName: title,
    additionalParents: [wikiPortraitsMusicCategory]
  });

  // 5. Create band-specific categories (e.g., "FordRekord at Jærnåttå 2025")
  // These are created when a band performs at the event
  if (participants && Array.isArray(participants)) {
    participants.forEach((participant: any) => {
      // Check if this is a band/organization (has a band-specific category pattern)
      if (participant.name && participant.type === 'band') {
        const bandAtEventCategory = `${participant.name} at ${eventName}`;

        categoriesToCreate.push({
          categoryName: bandAtEventCategory,
          shouldCreate: true,
          parentCategory: eventName, // Parent is the main event category
          description: `[[${participant.name}]] performing at ${title}${year ? ` ${year}` : ''}.`,
          eventName: title
        });
      }
    });
  }

  // 6. Create participant-specific categories (e.g., "Finland in the Eurovision Song Contest 2025")
  if (participants && Array.isArray(participants)) {
    participants.forEach((participant: any) => {
      if (participant.name && participant.commonsCategory) {
        // Use the pre-generated category name from EventSelector
        const participantCategory = participant.commonsCategory;

        categoriesToCreate.push({
          categoryName: participantCategory,
          shouldCreate: true,
          parentCategory: eventName,
          description: `[[${participant.name}]] at ${title}${year ? ` ${year}` : ''}.`,
          eventName: title
        });

        // Also link to WikiPortraits category
        categoriesToCreate.push({
          categoryName: participantCategory,
          shouldCreate: false, // Already created above
          parentCategory: wikiPortraitsEventCategory,
          description: `[[${participant.name}]] at ${title}${year ? ` ${year}` : ''}.`,
          eventName: title
        });
      }
    });
  }

  return categoriesToCreate;
}

export function generateEventPageCategory(eventData: MusicEventMetadata): string {
  if (eventData.eventType === 'festival' && eventData.festivalData) {
    const { festival } = eventData.festivalData;
    if (festival.name && festival.year) {
      return `${festival.name} ${festival.year}`;
    }
    return festival.name || 'Unnamed Festival';
  } else if (eventData.eventType === 'concert' && eventData.concertData) {
    const { concert } = eventData.concertData;
    const date = concert.date ? new Date(concert.date).toLocaleDateString() : '';
    let categoryName = `${concert.artist.name} concert`;
    
    if (concert.venue) {
      categoryName += ` at ${concert.venue}`;
    }
    
    if (date) {
      categoryName += ` (${date})`;
    }
    
    return categoryName;
  }

  return 'Unnamed Music Event';
}

export function generateEventDescription(eventData: MusicEventMetadata): string {
  if (eventData.eventType === 'festival' && eventData.festivalData) {
    const { festival, selectedBands } = eventData.festivalData;
    let description = `Photos from ${festival.name}`;
    
    if (festival.year) {
      description += ` ${festival.year}`;
    }
    
    if (festival.location) {
      description += ` in ${festival.location}`;
    }
    
    if (selectedBands.length > 0) {
      const bandNames = selectedBands.map(band => band.name).filter(Boolean);
      if (bandNames.length > 0) {
        description += `. Featured band: ${bandNames.join(', ')}`;
      }
    }
    
    description += '.';
    return description;
  } else if (eventData.eventType === 'concert' && eventData.concertData) {
    const { concert } = eventData.concertData;
    let description = `Photos from ${concert.artist.name} concert`;
    
    if (concert.date) {
      const formattedDate = new Date(concert.date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
      description += ` on ${formattedDate}`;
    }
    
    if (concert.venue) {
      description += ` at ${concert.venue}`;
    }
    
    if (concert.city) {
      description += ` in ${concert.city}`;
    }
    
    if (concert.tour) {
      description += ` (${concert.tour} tour)`;
    }
    
    description += '.';
    return description;
  }

  return 'Music event photos.';
}

export function generateImageCategories(
  eventDataOrMusicEventData: any,
  selectedBand?: string
): string[] {
  const categories: Set<string> = new Set();

  // Handle unified format (from EventDetailsForm)
  if (eventDataOrMusicEventData.title && !eventDataOrMusicEventData.eventType) {
    const { title, date, commonsCategory } = eventDataOrMusicEventData;
    const year = date ? new Date(date).getFullYear().toString() : '';
    const eventName = commonsCategory || (year ? `${title} ${year}` : title);

    // Add all three categories for WikiPortraits images:
    // 1. Main event category (e.g., "Jærnåttå 2025")
    categories.add(eventName);

    // 2. WikiPortraits at Event (e.g., "WikiPortraits at Jærnåttå 2025")
    categories.add(`WikiPortraits at ${eventName}`);

    // 3. Band-specific categories if band is selected
    if (selectedBand) {
      // Band at event (e.g., "FordRekord at Jærnåttå 2025")
      categories.add(`${selectedBand} at ${eventName}`);

      // Band in year (e.g., "FordRekord in 2025")
      if (year) {
        categories.add(`${selectedBand} in ${year}`);
      }

      // Note: NOT adding main band category (e.g., "FordRekord") to avoid flooding it
      // That category is for general band info, not every performance photo
    }

    return Array.from(categories).sort();
  }

  // Handle legacy MusicEventMetadata format - keeps WikiPortraits for backward compatibility
  categories.add('WikiPortraits');
  const musicEventData = eventDataOrMusicEventData;

  if (musicEventData.eventType === 'festival' && musicEventData.festivalData) {
    const { festival, addToWikiPortraitsConcerts } = musicEventData.festivalData;

    // WikiPortraits at Concerts integration
    if (addToWikiPortraitsConcerts) {
      categories.add('WikiPortraits at Concerts');
    }

    if (festival.name && festival.year) {
      // Main festival category: "WikiPortraits at Jærnåttå 2025"
      categories.add(`WikiPortraits at ${festival.name} ${festival.year}`);

      // If a band is selected for this image, add band-specific category
      if (selectedBand) {
        // Band at festival category: "FordRekord at Jærnåttå 2025"
        categories.add(`${selectedBand} at ${festival.name} ${festival.year}`);
      }
    }
  } else if (musicEventData.eventType === 'concert' && musicEventData.concertData) {
    const { concert, addToWikiPortraitsConcerts } = musicEventData.concertData;

    // WikiPortraits at Concerts integration
    if (addToWikiPortraitsConcerts) {
      categories.add('WikiPortraits at Concerts');
    }

    // Artist category
    if (concert.artist.name) {
      categories.add(concert.artist.name);
    }
  }

  return Array.from(categories).sort();
}

export function generateArtistDescription(artist: MusicArtist, eventData?: MusicEventMetadata): string {
  let description = artist.name;
  
  if (eventData?.eventType === 'festival' && eventData.festivalData) {
    const festival = eventData.festivalData.festival;
    description += ` performing at ${festival.name}`;
    if (festival.year) {
      description += ` ${festival.year}`;
    }
  } else if (eventData?.eventType === 'concert' && eventData.concertData) {
    const concert = eventData.concertData.concert;
    if (concert.venue) {
      description += ` performing at ${concert.venue}`;
    }
    if (concert.date) {
      const formattedDate = new Date(concert.date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
      description += ` on ${formattedDate}`;
    }
  }
  
  description += '.';
  return description;
}