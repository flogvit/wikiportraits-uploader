import { checkEntityExists } from './wikidata';
import { logger } from '@/utils/logger';

export interface WikidataEntityCreationInfo {
  entityName: string;
  entityType: 'festival-base' | 'festival-edition' | 'band' | 'performer' | 'event';
  shouldCreate: boolean;
  exists?: boolean;
  wikidataId?: string;
  wikidataUrl?: string;
  description?: string;
  instanceOf: string[]; // Wikidata QIDs for P31 (instance of)
  claims?: Record<string, any>; // Additional claims to add
  parentEntity?: string; // For linking entities (e.g., festival edition to base festival)
  participants?: string[]; // Entity names that participate in this event
  commonsCategory?: string; // Commons category name for P373
  missingClaims?: Array<{ property: string; value: any; description: string }>; // Claims that should be added to existing entities
}

/**
 * Generate Wikidata entities that need to be created for a music event
 */
export async function getWikidataEntitiesToCreate(eventData: any): Promise<WikidataEntityCreationInfo[]> {
  const entitiesToCreate: WikidataEntityCreationInfo[] = [];
  const { title, date, participants, eventWikidataId, wikidataId } = eventData;

  if (!title) {
    return entitiesToCreate;
  }

  const year = date ? new Date(date).getFullYear().toString() : '';
  const baseEventName = title.replace(/\s+\d{4}$/, ''); // Remove year if in title
  const fullEventName = year && !title.includes(year) ? `${title} ${year}` : title;

  // Use the Wikidata ID from the event selection if available
  const selectedEventWikidataId = eventWikidataId || wikidataId;

  // 1. Check if base festival exists (e.g., "Jærnåttå" or "Eurovision Song Contest")
  let baseFestivalCheck;

  // If we have a selected event with Wikidata ID, check for parent entity
  if (selectedEventWikidataId && year && fullEventName !== baseEventName) {
    try {
      const { getWikidataEntity } = await import('./wikidata');
      const selectedEntity = await getWikidataEntity(selectedEventWikidataId, 'en', 'claims|labels');

      // Check for parent using P361 (part of) or P179 (part of the series)
      const partOfClaim = selectedEntity.claims?.P361?.[0] || selectedEntity.claims?.P179?.[0];
      const parentId = partOfClaim?.mainsnak?.datavalue?.value?.id;

      if (parentId) {
        const parentEntity = await getWikidataEntity(parentId, 'en', 'labels');
        baseFestivalCheck = {
          exists: true,
          entity: {
            id: parentId,
            labels: parentEntity.labels
          }
        };
      } else {
        // No parent found, search for it
        baseFestivalCheck = await checkEntityExists(
          baseEventName,
          ['Q868557', 'Q1656682', 'Q27020041'],
          'en'
        );
      }
    } catch (error) {
      logger.error('wikidata-entities', 'Error fetching parent entity', error);
      baseFestivalCheck = await checkEntityExists(
        baseEventName,
        ['Q868557', 'Q1656682', 'Q27020041'],
        'en'
      );
    }
  } else if (selectedEventWikidataId && fullEventName === baseEventName) {
    // The selected event IS the base festival
    baseFestivalCheck = {
      exists: true,
      entity: { id: selectedEventWikidataId }
    };
  } else {
    // No selected event, search for base festival
    baseFestivalCheck = await checkEntityExists(
      baseEventName,
      ['Q868557', 'Q1656682', 'Q27020041'],
      'en'
    );
  }

  // Prepare base festival entity info
  const baseFestivalInfo: WikidataEntityCreationInfo = {
    entityName: baseEventName,
    entityType: 'festival-base',
    shouldCreate: !baseFestivalCheck.exists,
    exists: baseFestivalCheck.exists,
    wikidataId: baseFestivalCheck.entity?.id,
    wikidataUrl: baseFestivalCheck.entity ? `https://www.wikidata.org/wiki/${baseFestivalCheck.entity.id}` : undefined,
    description: `music festival`,
    instanceOf: ['Q868557'], // music festival
    claims: {},
    commonsCategory: baseEventName,
    missingClaims: []
  };

  // If base festival exists, check for missing claims
  if (baseFestivalCheck.exists && baseFestivalCheck.entity) {
    const { getWikidataEntity } = await import('./wikidata');
    const fullEntity = await getWikidataEntity(baseFestivalCheck.entity.id, 'en', 'claims');

    // Check for P373 (Commons category)
    if (!fullEntity.claims?.P373) {
      baseFestivalInfo.missingClaims?.push({
        property: 'P373',
        value: baseEventName,
        description: `Commons category: ${baseEventName}`
      });
    }
  } else {
    // Will create with P373
    baseFestivalInfo.claims = {
      P373: baseEventName // Commons category
    };
  }

  entitiesToCreate.push(baseFestivalInfo);

  // 2. Check if yearly festival edition exists (e.g., "Jærnåttå 2025" or "Eurovision Song Contest 2025")
  if (year) {
    let yearlyEditionCheck;

    // If we selected this specific event, use its Wikidata ID
    if (selectedEventWikidataId && (fullEventName === title || title.includes(year))) {
      yearlyEditionCheck = { exists: true, entity: { id: selectedEventWikidataId } };
    } else {
      yearlyEditionCheck = await checkEntityExists(
        fullEventName,
        ['Q1569406', 'Q27020041', 'Q868557'], // festival edition, edition of recurring event, or music festival
        'en'
      );
    }

    // Prepare yearly edition entity info
    const yearlyEditionInfo: WikidataEntityCreationInfo = {
      entityName: fullEventName,
      entityType: 'festival-edition',
      shouldCreate: !yearlyEditionCheck.exists,
      exists: yearlyEditionCheck.exists,
      wikidataId: yearlyEditionCheck.entity?.id,
      wikidataUrl: yearlyEditionCheck.entity ? `https://www.wikidata.org/wiki/${yearlyEditionCheck.entity.id}` : undefined,
      description: `${year} edition of ${baseEventName}`,
      instanceOf: ['Q1569406'], // festival edition
      claims: {},
      parentEntity: baseEventName,
      commonsCategory: fullEventName,
      missingClaims: []
    };

    // If creating, add claims directly
    if (!yearlyEditionCheck.exists) {
      yearlyEditionInfo.claims = {
        P361: baseFestivalCheck.entity?.id, // part of (base festival)
        P373: fullEventName // Commons category
      };

      // Add date claims based on whether it's single-day or multi-day
      const endDate = eventData.endDate;

      if (date) {
        const formatDate = (d: Date | string) => {
          const dateObj = typeof d === 'string' ? new Date(d) : d;
          const yyyy = dateObj.getFullYear();
          const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
          const dd = String(dateObj.getDate()).padStart(2, '0');
          return `${yyyy}-${mm}-${dd}`;
        };

        const startDate = formatDate(date);

        if (endDate && endDate !== date) {
          // Multi-day event: use P580 (start) + P582 (end)
          const endDateFormatted = formatDate(endDate);
          yearlyEditionInfo.claims.P580 = startDate;
          yearlyEditionInfo.claims.P582 = endDateFormatted;
          logger.debug('wikidata-entities', `Multi-day event - P580: ${startDate}, P582: ${endDateFormatted}`);
        } else {
          // Single-day event: use P585 (point in time)
          yearlyEditionInfo.claims.P585 = startDate;
          logger.debug('wikidata-entities', `Single-day event - P585: ${startDate}`);
        }
      } else {
        logger.debug('wikidata-entities', 'No date provided - skipping date claims');
      }
    } else {
      // If exists, check for missing claims
      const { getWikidataEntity } = await import('./wikidata');
      const fullEntity = await getWikidataEntity(yearlyEditionCheck.entity.id, 'en', 'claims');

      // Check for P361 (part of)
      if (!fullEntity.claims?.P361 && baseFestivalCheck.entity?.id) {
        yearlyEditionInfo.missingClaims?.push({
          property: 'P361',
          value: baseFestivalCheck.entity.id,
          description: `Part of: ${baseEventName}`
        });
      }

      // Check for date claims (P585, P580, P582)
      const endDate = eventData.endDate;
      const hasDateClaims = fullEntity.claims?.P585 || fullEntity.claims?.P580 || fullEntity.claims?.P582;

      if (!hasDateClaims && date) {
        const formatDate = (d: Date | string) => {
          const dateObj = typeof d === 'string' ? new Date(d) : d;
          const yyyy = dateObj.getFullYear();
          const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
          const dd = String(dateObj.getDate()).padStart(2, '0');
          return `${yyyy}-${mm}-${dd}`;
        };

        const startDate = formatDate(date);

        if (endDate && endDate !== date) {
          // Multi-day event
          const endDateFormatted = formatDate(endDate);
          yearlyEditionInfo.missingClaims?.push({
            property: 'P580',
            value: startDate,
            description: `Start time: ${startDate}`
          });
          yearlyEditionInfo.missingClaims?.push({
            property: 'P582',
            value: endDateFormatted,
            description: `End time: ${endDateFormatted}`
          });
        } else {
          // Single-day event
          yearlyEditionInfo.missingClaims?.push({
            property: 'P585',
            value: startDate,
            description: `Point in time: ${startDate}`
          });
        }
      }

      // Check for P373 (Commons category)
      if (!fullEntity.claims?.P373) {
        yearlyEditionInfo.missingClaims?.push({
          property: 'P373',
          value: fullEventName,
          description: `Commons category: ${fullEventName}`
        });
      }

      // Check for P276 (location) and P17 (country) from eventData
      if (!fullEntity.claims?.P276 && eventData.locationQid) {
        yearlyEditionInfo.missingClaims?.push({
          property: 'P276',
          value: eventData.locationQid,
          description: `Location: ${eventData.location}`
        });
      }

      if (!fullEntity.claims?.P17 && eventData.countryQid) {
        yearlyEditionInfo.missingClaims?.push({
          property: 'P17',
          value: eventData.countryQid,
          description: `Country: ${eventData.country}`
        });
      }

      // Check for P710 (participant) - add bands that performed
      // We'll need to pass this from the context - for now mark as TODO
      // See GitHub issue #7
    }

    entitiesToCreate.push(yearlyEditionInfo);

    // Also check if base festival needs P527 (has part) pointing to this edition
    if (baseFestivalCheck.exists && yearlyEditionCheck.entity?.id) {
      const { getWikidataEntity } = await import('./wikidata');
      const baseFestivalEntity = await getWikidataEntity(baseFestivalCheck.entity.id, 'en', 'claims');

      // Check if P527 already points to this edition
      const hasParts = baseFestivalEntity.claims?.P527 || [];
      const hasThisEdition = hasParts.some((claim: any) =>
        claim.mainsnak?.datavalue?.value?.id === yearlyEditionCheck.entity.id
      );

      if (!hasThisEdition) {
        // Base festival needs P527 added
        const existingBaseFestival = entitiesToCreate.find(e => e.wikidataId === baseFestivalCheck.entity.id);
        if (existingBaseFestival && existingBaseFestival.missingClaims) {
          existingBaseFestival.missingClaims.push({
            property: 'P527',
            value: yearlyEditionCheck.entity.id,
            description: `Has part: ${fullEventName}`
          });
        }
      }
    }
  }

  // 3. Check if participating bands exist
  if (participants && Array.isArray(participants)) {
    for (const participant of participants) {
      if (participant.wikidataId) {
        // Participant already has a Wikidata ID (found via search)
        entitiesToCreate.push({
          entityName: participant.name,
          entityType: 'performer',
          shouldCreate: false,
          exists: true,
          wikidataId: participant.wikidataId,
          wikidataUrl: participant.wikidataUrl,
          description: participant.name,
          instanceOf: [],
          claims: {}
        });
      } else {
        // Check if band exists in Wikidata
        const bandCheck = await checkEntityExists(
          participant.name,
          ['Q215380', 'Q2088357', 'Q5741069'], // band, musical ensemble, musical group
          'en'
        );

        entitiesToCreate.push({
          entityName: participant.name,
          entityType: 'band',
          shouldCreate: !bandCheck.exists,
          exists: bandCheck.exists,
          wikidataId: bandCheck.entity?.id,
          wikidataUrl: bandCheck.entity ? `https://www.wikidata.org/wiki/${bandCheck.entity.id}` : undefined,
          description: `musical group`,
          instanceOf: ['Q215380'], // band
          claims: {}
        });
      }
    }
  }

  return entitiesToCreate;
}
