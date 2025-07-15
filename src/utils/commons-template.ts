import { ImageFile } from '@/app/page';
import { generateTemplateName } from '@/utils/template-generator';
import { UploadType } from '@/components/selectors/UploadTypeSelector';
import { SoccerMatchMetadata } from '@/components/forms/SoccerMatchForm';

interface MetadataTemplate {
  description: string;
  author: string;
  date: string;
  time?: string;
  source: string;
  license: string;
  categories?: string[];
  event?: string;
  location?: string;
}

export function generateCommonsTemplate(metadata: MetadataTemplate): string {
  // Generate WikiPortraits category based on event
  const wikiPortraitsCategory = metadata.event 
    ? `WikiPortraits at ${metadata.event}`
    : 'WikiPortraits';

  // Format license template
  const licenseTemplate = metadata.license.startsWith('CC-') 
    ? `{{${metadata.license}}}`
    : `{{${metadata.license}}}`;

  // Build categories string
  const allCategories = [
    wikiPortraitsCategory,
    ...(metadata.categories || [])
  ].filter(Boolean);

  const categoriesWikitext = allCategories
    .map(cat => `[[Category:${cat}]]`)
    .join('\n');

  const wikitext = `=={{int:filedesc}}==
{{Information
|description={{en|${metadata.description}}}
|author=${metadata.author}
|date=${metadata.date}
|source=${metadata.source}
|permission=
|other_versions=
}}

=={{int:license-header}}==
${licenseTemplate}

${categoriesWikitext}`;

  return wikitext;
}

export function generateCommonsWikitext(image: ImageFile, forceRegenerate = false): string {
  // If user has manually edited wikitext and we're not forcing regeneration, use their version
  if (image.metadata.wikitext && image.metadata.wikitextModified && !forceRegenerate) {
    return image.metadata.wikitext;
  }
  const { metadata } = image;
  
  // Determine upload type from metadata
  let uploadType: UploadType = 'general';
  if (metadata.musicEvent) {
    uploadType = 'music';
  } else if (metadata.soccerMatch || metadata.soccerPlayer) {
    uploadType = 'soccer';
  }

  // Generate template line - use custom template if set, otherwise auto-generate
  let templateLine = '';
  if (metadata.template !== undefined) {
    // User has set a custom template (could be empty string to remove template)
    templateLine = metadata.template.trim() ? `\n{{${metadata.template.trim()}}}\n` : '';
  } else if (uploadType !== 'general') {
    // Auto-generate template for events
    // Convert simplified soccer match to full format for template generation
    let soccerMatchData: SoccerMatchMetadata | null = null;
    if (metadata.soccerMatch) {
      soccerMatchData = {
        homeTeam: { id: '', name: metadata.soccerMatch.homeTeam },
        awayTeam: { id: '', name: metadata.soccerMatch.awayTeam },
        date: metadata.soccerMatch.date,
        venue: metadata.soccerMatch.venue,
        competition: metadata.soccerMatch.competition,
        result: metadata.soccerMatch.result
      } as SoccerMatchMetadata;
    }
    
    const templateName = generateTemplateName(
      uploadType,
      metadata.musicEvent,
      soccerMatchData
    );
    templateLine = `\n{{${templateName}}}\n`;
  }

  // Generate WikiPortraits category based on event
  const wikiPortraitsCategory = metadata.wikiPortraitsEvent 
    ? `WikiPortraits at ${metadata.wikiPortraitsEvent}`
    : 'WikiPortraits';

  // Format license template
  const licenseTemplate = metadata.license.startsWith('CC-') 
    ? `{{${metadata.license}}}`
    : `{{${metadata.license}}}`;

  // Build categories string - avoid duplicates by checking if WikiPortraits category already exists
  const hasWikiPortraitsCategory = metadata.categories.some(cat => cat.startsWith('WikiPortraits at'));
  const allCategories = [
    ...(hasWikiPortraitsCategory ? [] : [wikiPortraitsCategory]),
    ...metadata.categories
  ].filter(Boolean);

  const categoriesWikitext = allCategories
    .map(cat => `[[Category:${cat}]]`)
    .join('\n');

  // Generate location template if GPS coordinates are available
  const locationTemplate = metadata.gps && 
    typeof metadata.gps.latitude === 'number' && 
    typeof metadata.gps.longitude === 'number'
    ? `{{Location|${metadata.gps.latitude}|${metadata.gps.longitude}}}`
    : '';

  const wikitext = `=={{int:filedesc}}==
{{Information
|description={{en|${metadata.description}}}
|author=${metadata.author}
|date=${metadata.date}${metadata.time ? ` ${metadata.time}` : ''}
|source=${metadata.source}
|permission=
|other_versions=
}}${locationTemplate ? `\n${locationTemplate}` : ''}
${templateLine}
=={{int:license-header}}==
${licenseTemplate}

${categoriesWikitext}`;

  return wikitext;
}

export function updateImageWikitext(image: ImageFile, wikitext: string, isUserModified = true): ImageFile {
  return {
    ...image,
    metadata: {
      ...image.metadata,
      wikitext,
      wikitextModified: isUserModified
    }
  };
}

export function regenerateImageWikitext(image: ImageFile): ImageFile {
  const wikitext = generateCommonsWikitext(image, true);
  return updateImageWikitext(image, wikitext, false);
}

export function generateFilename(image: ImageFile, imageIndex?: number): string {
  const { metadata } = image;
  const originalName = image.file.name;
  const extension = originalName.split('.').pop();
  
  // Generate context-aware filename for music events
  if (metadata.musicEvent) {
    return generateMusicEventFilename(metadata.musicEvent, metadata, extension, imageIndex);
  }
  
  // Generate context-aware filename for soccer events
  if (metadata.soccerMatch || metadata.soccerPlayer) {
    return generateSoccerEventFilename(metadata, extension, imageIndex);
  }
  
  // Create a descriptive filename based on description (fallback)
  if (metadata.description) {
    // Clean the description for filename use
    const cleanDescription = metadata.description
      .replace(/[^a-zA-Z0-9\s-]/g, '') // Remove special chars
      .replace(/\s+/g, '_') // Replace spaces with underscores
      .substring(0, 100); // Limit length
    
    const counter = imageIndex ? ` ${String(imageIndex).padStart(2, '0')}` : '';
    return `${cleanDescription}${counter}.${extension}`;
  }
  
  return originalName;
}

function generateMusicEventFilename(
  musicEvent: NonNullable<ImageFile['metadata']['musicEvent']>, 
  metadata: ImageFile['metadata'], 
  extension: string | undefined, 
  imageIndex?: number
): string {
  const counter = imageIndex ? ` ${String(imageIndex).padStart(2, '0')}` : '';
  
  if (musicEvent.eventType === 'festival' && musicEvent.festivalData) {
    const { festival } = musicEvent.festivalData;
    
    // Use selected band from metadata if available
    const bandName = metadata.selectedBand || extractArtistFromDescription(metadata.description);
    
    if (bandName && festival.name && festival.year) {
      // Format: "FordRekord at Jærnåttå 2025 15.jpg"
      const filename = sanitizeFilename(`${bandName} at ${festival.name} ${festival.year}${counter}`);
      return `${filename}.${extension}`;
    } else if (festival.name && festival.year) {
      // Format: "Jærnåttå 2025 15.jpg"
      const filename = sanitizeFilename(`${festival.name} ${festival.year}${counter}`);
      return `${filename}.${extension}`;
    }
  } else if (musicEvent.eventType === 'concert' && musicEvent.concertData) {
    const { concert } = musicEvent.concertData;
    
    if (concert.artist.name && concert.venue) {
      // Format: "Emmy at Eurovision 2025 15.jpg" or "Emmy concert at Dublin Arena 15.jpg"
      const eventName = concert.tour || `concert at ${concert.venue}`;
      const filename = sanitizeFilename(`${concert.artist.name} at ${eventName}${counter}`);
      return `${filename}.${extension}`;
    } else if (concert.artist.name) {
      // Format: "Emmy concert 15.jpg"
      const filename = sanitizeFilename(`${concert.artist.name} concert${counter}`);
      return `${filename}.${extension}`;
    }
  }
  
  // Fallback to description-based naming
  if (metadata.description) {
    const filename = sanitizeFilename(metadata.description.substring(0, 80) + counter);
    return `${filename}.${extension}`;
  }
  
  return `music_event${counter}.${extension}`;
}

function generateSoccerEventFilename(
  metadata: ImageFile['metadata'], 
  extension: string | undefined, 
  imageIndex?: number
): string {
  const counter = imageIndex ? ` ${String(imageIndex).padStart(2, '0')}` : '';
  
  if (metadata.soccerPlayer && metadata.soccerMatch) {
    // Format: "Player name at Team vs Team 15.jpg"
    const playerName = metadata.soccerPlayer.name;
    const match = `${metadata.soccerMatch.homeTeam} vs ${metadata.soccerMatch.awayTeam}`;
    const filename = sanitizeFilename(`${playerName} at ${match}${counter}`);
    return `${filename}.${extension}`;
  } else if (metadata.soccerMatch) {
    // Format: "Team vs Team 15.jpg"
    const match = `${metadata.soccerMatch.homeTeam} vs ${metadata.soccerMatch.awayTeam}`;
    const filename = sanitizeFilename(`${match}${counter}`);
    return `${filename}.${extension}`;
  }
  
  return `soccer_match${counter}.${extension}`;
}

function extractArtistFromDescription(description: string): string | null {
  if (!description) return null;
  
  // Common patterns to extract artist/band names from descriptions
  const patterns = [
    // "FordRekord performing at..." or "FordRekord on stage..."
    /^([A-Za-z0-9\s&-]+?)\s+(?:performing|on stage|at|during)/i,
    // "Singer Emmy from..." or "Band FordRekord..."
    /(?:Singer|Band|Artist)\s+([A-Za-z0-9\s&-]+?)\s+(?:from|at|performing)/i,
    // Just the first word/phrase if it looks like a band name
    /^([A-Za-z0-9&-]+(?:\s+[A-Za-z0-9&-]+)?)/
  ];
  
  for (const pattern of patterns) {
    const match = description.match(pattern);
    if (match && match[1]) {
      const artistName = match[1].trim();
      // Filter out common non-artist words
      if (!['Photo', 'Image', 'Picture', 'Concert', 'Festival', 'Performance'].includes(artistName)) {
        return artistName;
      }
    }
  }
  
  return null;
}

function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[^a-zA-Z0-9\s\-æøåÆØÅäöüÄÖÜß]/g, '') // Keep Nordic/Germanic chars
    .replace(/\s+/g, ' ') // Normalize spaces
    .trim()
    .substring(0, 100); // Limit length
}