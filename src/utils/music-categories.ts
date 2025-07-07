import { MusicEventMetadata, FestivalMetadata, ConcertMetadata, MusicArtist } from '@/types/music';

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

export interface CategoryCreationInfo {
  categoryName: string;
  shouldCreate: boolean;
  parentCategory?: string;
  description?: string;
  eventName?: string;
}

export function generateMusicCategories({
  eventData,
  includeBandCategories = true,
  includeEventCategories = true,
  includeWikiPortraitsIntegration = true
}: MusicCategoryOptions): string[] {
  const categories: Set<string> = new Set();

  // Base WikiPortraits category
  categories.add('WikiPortraits');

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

        // Genre-based category
        if (band.genre) {
          categories.add(`${band.genre} bands`);
        }

        // Country-based band category
        if (band.country) {
          categories.add(`Musical groups from ${band.country}`);
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

    // Genre-based category
    if (concert.artist.genre) {
      categories.add(`${concert.artist.genre} concerts`);
    }

    // Country-based artist category
    if (concert.artist.country) {
      categories.add(`Musical groups from ${concert.artist.country}`);
    }
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

export function getCategoriesToCreate(eventData: MusicEventMetadata): CategoryCreationInfo[] {
  const categoriesToCreate: CategoryCreationInfo[] = [];

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
          description: `[[${bandWikipediaName}]]${band.genre ? `, ${band.genre} band` : ''}${band.country ? ` from ${band.country}` : ''}.`,
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
      description: `[[${artistWikipediaName}]]${concert.artist.genre ? `, ${concert.artist.genre} artist` : ''}${concert.artist.country ? ` from ${concert.artist.country}` : ''}.`,
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
        description += `. Featured bands: ${bandNames.join(', ')}`;
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

export function generateArtistDescription(artist: MusicArtist, eventData?: MusicEventMetadata): string {
  let description = artist.name;
  
  if (artist.genre) {
    description += `, ${artist.genre} artist`;
  }
  
  if (artist.country) {
    description += ` from ${artist.country}`;
  }
  
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