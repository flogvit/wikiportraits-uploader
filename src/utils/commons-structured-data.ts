/**
 * Utilities for managing Structured Data on Commons (SDC)
 * Handles depicts (P180) and other structured data statements for images
 */

import { WikidataEntity } from '@/types/wikidata';
import { Caption } from '@/types/upload';
import { logger } from '@/utils/logger';

export interface DepictsStatement {
  entityId: string;
  entityLabel: string;
  entityType: 'person' | 'organization' | 'event' | 'location';
}

export interface StructuredDataInput {
  depicts?: DepictsStatement[]; // P180
  creator?: string; // P170 - Wikidata Q-ID of photographer
  inceptionDate?: string; // P571 - Date photo was taken (ISO 8601)
  coordinates?: { latitude: number; longitude: number }; // P1259 - GPS coordinates
  locationOfCreation?: string; // P1071 - Place/venue Q-ID
  copyrightLicense?: string; // P275 - License Q-ID (e.g., Q18199165 for CC-BY-SA-4.0)
  mainSubject?: string; // P921 - Main subject Q-ID (event or band)
  captions?: Caption[]; // Multilingual captions (labels in MediaInfo)
}

/**
 * Build structured data JSON for all supported properties
 * Used with wbeditentity API action
 */
export function buildStructuredData(data: StructuredDataInput): any {
  const claims: any = {};
  const labels: any = {};

  // P180 - Depicts (people, organizations, etc.)
  if (data.depicts && data.depicts.length > 0) {
    claims.P180 = data.depicts.map(item => {
      const numericId = parseInt(item.entityId.replace('Q', ''));
      return {
        mainsnak: {
          snaktype: 'value',
          property: 'P180',
          datavalue: {
            type: 'wikibase-entityid',
            value: {
              'numeric-id': numericId,
              'id': item.entityId
            }
          }
        },
        type: 'statement',
        rank: 'normal'
      };
    });
  }

  // P170 - Creator (photographer)
  if (data.creator) {
    const numericId = parseInt(data.creator.replace('Q', ''));
    claims.P170 = [{
      mainsnak: {
        snaktype: 'value',
        property: 'P170',
        datavalue: {
          type: 'wikibase-entityid',
          value: {
            'numeric-id': numericId,
            'id': data.creator
          }
        }
      },
      type: 'statement',
      rank: 'normal'
    }];
  }

  // P571 - Inception (date photo was taken)
  if (data.inceptionDate) {
    claims.P571 = [{
      mainsnak: {
        snaktype: 'value',
        property: 'P571',
        datavalue: {
          type: 'time',
          value: {
            time: convertToWikidataTime(data.inceptionDate),
            timezone: 0,
            before: 0,
            after: 0,
            precision: 11, // day precision
            calendarmodel: 'http://www.wikidata.org/entity/Q1985727' // Gregorian calendar
          }
        }
      },
      type: 'statement',
      rank: 'normal'
    }];
  }

  // P1259 - Coordinates of point of view (GPS location)
  if (data.coordinates) {
    claims.P1259 = [{
      mainsnak: {
        snaktype: 'value',
        property: 'P1259',
        datavalue: {
          type: 'globecoordinate',
          value: {
            latitude: data.coordinates.latitude,
            longitude: data.coordinates.longitude,
            precision: 0.0001, // ~10 meters
            globe: 'http://www.wikidata.org/entity/Q2' // Earth
          }
        }
      },
      type: 'statement',
      rank: 'normal'
    }];
  }

  // P1071 - Location of creation (venue/place)
  if (data.locationOfCreation) {
    const numericId = parseInt(data.locationOfCreation.replace('Q', ''));
    claims.P1071 = [{
      mainsnak: {
        snaktype: 'value',
        property: 'P1071',
        datavalue: {
          type: 'wikibase-entityid',
          value: {
            'numeric-id': numericId,
            'id': data.locationOfCreation
          }
        }
      },
      type: 'statement',
      rank: 'normal'
    }];
  }

  // P275 - Copyright license
  if (data.copyrightLicense) {
    const numericId = parseInt(data.copyrightLicense.replace('Q', ''));
    claims.P275 = [{
      mainsnak: {
        snaktype: 'value',
        property: 'P275',
        datavalue: {
          type: 'wikibase-entityid',
          value: {
            'numeric-id': numericId,
            'id': data.copyrightLicense
          }
        }
      },
      type: 'statement',
      rank: 'normal'
    }];
  }

  // P921 - Main subject (event or band)
  if (data.mainSubject) {
    const numericId = parseInt(data.mainSubject.replace('Q', ''));
    claims.P921 = [{
      mainsnak: {
        snaktype: 'value',
        property: 'P921',
        datavalue: {
          type: 'wikibase-entityid',
          value: {
            'numeric-id': numericId,
            'id': data.mainSubject
          }
        }
      },
      type: 'statement',
      rank: 'normal'
    }];
  }

  // Captions (labels in MediaInfo)
  if (data.captions && data.captions.length > 0) {
    data.captions.forEach(caption => {
      labels[caption.language] = {
        language: caption.language,
        value: caption.text
      };
    });
  }

  return {
    claims,
    ...(Object.keys(labels).length > 0 && { labels })
  };
}

/**
 * Convert ISO date string to Wikidata time format
 * @param isoDate - ISO 8601 date string (e.g., "2025-05-24T22:30:13" or "2025-05-24")
 * @returns Wikidata time string (e.g., "+2025-05-24T00:00:00Z")
 */
function convertToWikidataTime(isoDate: string): string {
  // Parse date and add timezone Z if not present
  const date = new Date(isoDate);
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');

  // Wikidata time format: +YYYY-MM-DDT00:00:00Z
  return `+${year}-${month}-${day}T00:00:00Z`;
}

/**
 * Build structured data JSON for depicts statements only
 * Legacy function - use buildStructuredData for new code
 * @deprecated Use buildStructuredData instead
 */
export function buildDepictsStatements(depicts: DepictsStatement[]): any {
  return buildStructuredData({ depicts });
}

/**
 * Add depicts statements to a Commons file
 *
 * @param pageId - The Commons page ID (from file.pageid)
 * @param depicts - Array of entities to add as depicts
 * @param csrfToken - CSRF token for authentication
 * @param accessToken - Wikimedia access token
 */
export async function addDepictsToFile(
  pageId: number,
  depicts: DepictsStatement[],
  csrfToken: string,
  accessToken: string
): Promise<{ success: boolean; message?: string }> {
  // MediaInfo entity ID is M{pageId}
  const mediaInfoId = `M${pageId}`;

  // Build the structured data
  const data = buildDepictsStatements(depicts);

  const formData = new FormData();
  formData.append('action', 'wbeditentity');
  formData.append('format', 'json');
  formData.append('id', mediaInfoId);
  formData.append('data', JSON.stringify(data));
  formData.append('token', csrfToken);

  try {
    const response = await fetch('https://commons.wikimedia.org/w/api.php', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`
      },
      body: formData
    });

    const result = await response.json();

    if (result.error) {
      return {
        success: false,
        message: result.error.info || 'Failed to add depicts statements'
      };
    }

    if (result.success) {
      return {
        success: true,
        message: `Added ${depicts.length} depicts statement${depicts.length > 1 ? 's' : ''}`
      };
    }

    return {
      success: false,
      message: 'Unknown error adding depicts statements'
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to add depicts statements'
    };
  }
}

/**
 * License name to Wikidata Q-ID mapping
 */
export const LICENSE_QID_MAP: Record<string, string> = {
  'CC-BY-SA-4.0': 'Q18199165',
  'CC-BY-4.0': 'Q20007257',
  'CC-BY-SA-3.0': 'Q14946043',
  'CC-BY-3.0': 'Q14947546',
  'CC0': 'Q6938433',
  'Public domain': 'Q19652',
};

/**
 * Get structured data from image metadata
 * Extracts all structured data that should be added to Commons
 */
export function getStructuredDataFromImage(
  image: any,
  bandEntity?: WikidataEntity,
  performers?: WikidataEntity[],
  eventEntity?: WikidataEntity,
  photographerQid?: string
): StructuredDataInput {
  const structuredData: StructuredDataInput = {};

  // P180 - Depicts
  const depicts = getDepictsFromImage(image, bandEntity, performers);
  if (depicts.length > 0) {
    structuredData.depicts = depicts;
  }

  // P170 - Creator (photographer)
  if (photographerQid) {
    structuredData.creator = photographerQid;
  }

  // P571 - Inception (date taken)
  if (image.metadata?.date) {
    structuredData.inceptionDate = image.metadata.date;
  }

  // P1259 - Coordinates
  if (image.metadata?.gps) {
    structuredData.coordinates = {
      latitude: image.metadata.gps.latitude,
      longitude: image.metadata.gps.longitude
    };
  }

  // P1071 - Location of creation (event venue)
  if (eventEntity?.id) {
    // Check if event has a location (P276)
    const locationClaim = eventEntity.claims?.['P276']?.[0];
    if (locationClaim?.mainsnak?.datavalue?.value?.id) {
      structuredData.locationOfCreation = locationClaim.mainsnak.datavalue.value.id;
    }
  }

  // P275 - Copyright license
  if (image.metadata?.license) {
    const licenseQid = LICENSE_QID_MAP[image.metadata.license];
    if (licenseQid) {
      structuredData.copyrightLicense = licenseQid;
    }
  }

  // P921 - Main subject (prefer event, fallback to band)
  if (eventEntity?.id) {
    structuredData.mainSubject = eventEntity.id;
  } else if (bandEntity?.id) {
    structuredData.mainSubject = bandEntity.id;
  }

  return structuredData;
}

/**
 * Get depicts statements from image metadata
 * Extracts entities that should be depicted based on:
 * - Selected band/organization
 * - Tagged performers (selectedBandMembers)
 */
export function getDepictsFromImage(
  image: any,
  bandEntity?: WikidataEntity,
  performers?: WikidataEntity[]
): DepictsStatement[] {
  const depicts: DepictsStatement[] = [];

  // Add the band/organization if present
  if (bandEntity) {
    depicts.push({
      entityId: bandEntity.id,
      entityLabel: bandEntity.labels?.en?.value || bandEntity.id,
      entityType: 'organization'
    });
  }

  // Add tagged performers
  if (image.metadata?.selectedBandMembers && performers) {
    const selectedMemberIds = image.metadata.selectedBandMembers;
    const selectedPerformers = performers.filter(p =>
      selectedMemberIds.includes(p.id)
    );

    selectedPerformers.forEach(performer => {
      depicts.push({
        entityId: performer.id,
        entityLabel: performer.labels?.en?.value || performer.id,
        entityType: 'person'
      });
    });
  }

  return depicts;
}

/**
 * Check if an image already has depicts statements
 * by fetching its MediaInfo entity and resolving labels
 */
export async function getExistingDepicts(pageId: number): Promise<DepictsStatement[]> {
  const mediaInfoId = `M${pageId}`;

  try {
    const response = await fetch(
      `https://commons.wikimedia.org/w/api.php?` +
      new URLSearchParams({
        action: 'wbgetentities',
        ids: mediaInfoId,
        format: 'json',
        origin: '*'
      })
    );

    const data = await response.json();
    const entity = data.entities?.[mediaInfoId];

    if (!entity?.statements?.P180) {
      return [];
    }

    // Extract all entity IDs
    const entityIds = entity.statements.P180
      .map((statement: any) => statement.mainsnak?.datavalue?.value?.id)
      .filter(Boolean);

    if (entityIds.length === 0) {
      return [];
    }

    // Fetch labels for all entities in one request
    const labelsResponse = await fetch(
      `https://www.wikidata.org/w/api.php?` +
      new URLSearchParams({
        action: 'wbgetentities',
        ids: entityIds.join('|'),
        props: 'labels|claims',
        languages: 'en',
        format: 'json',
        origin: '*'
      })
    );

    const labelsData = await labelsResponse.json();
    const entities = labelsData.entities || {};

    // Map entity IDs to their labels and types
    return entity.statements.P180.map((statement: any) => {
      const entityId = statement.mainsnak?.datavalue?.value?.id;
      const entityData = entities[entityId];
      const entityLabel = entityData?.labels?.en?.value || entityId;

      // Determine entity type from P31 (instance of)
      let entityType: 'person' | 'organization' | 'event' | 'location' = 'person';
      const instanceOf = entityData?.claims?.P31?.[0]?.mainsnak?.datavalue?.value?.id;

      if (instanceOf === 'Q5') {
        entityType = 'person';
      } else if (['Q215380', 'Q5741069', 'Q43229'].includes(instanceOf)) {
        // musical group, music band, organization
        entityType = 'organization';
      } else if (['Q1656682', 'Q1190554'].includes(instanceOf)) {
        // event, occurrence
        entityType = 'event';
      } else if (['Q618123', 'Q2221906'].includes(instanceOf)) {
        // geographic location, place
        entityType = 'location';
      }

      return {
        entityId,
        entityLabel,
        entityType
      };
    });
  } catch (error) {
    logger.error('commons-structured-data', 'Error fetching existing depicts', error);
    return [];
  }
}

/**
 * Fetch existing captions (labels) from a Commons file's structured data
 */
export async function getExistingCaptions(pageId: number): Promise<Caption[]> {
  const mediaInfoId = `M${pageId}`;

  try {
    const response = await fetch(
      `https://commons.wikimedia.org/w/api.php?` +
      new URLSearchParams({
        action: 'wbgetentities',
        ids: mediaInfoId,
        format: 'json',
        origin: '*'
      })
    );

    const data = await response.json();
    const entity = data.entities?.[mediaInfoId];

    if (!entity?.labels) {
      return [];
    }

    // Convert labels object to Caption array
    const captions: Caption[] = [];
    for (const [language, labelData] of Object.entries(entity.labels)) {
      const label = labelData as { language: string; value: string };
      captions.push({
        language: label.language,
        text: label.value
      });
    }

    return captions;
  } catch (error) {
    logger.error('commons-structured-data', 'Error fetching existing captions', error);
    return [];
  }
}
