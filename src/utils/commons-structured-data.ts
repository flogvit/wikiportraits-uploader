/**
 * Utilities for managing Structured Data on Commons (SDC)
 * Handles depicts (P180) statements for images
 */

import { WikidataEntity } from '@/types/wikidata';

export interface DepictsStatement {
  entityId: string;
  entityLabel: string;
  entityType: 'person' | 'organization' | 'event' | 'location';
}

/**
 * Build structured data JSON for depicts statements
 * Used with wbeditentity API action
 */
export function buildDepictsStatements(depicts: DepictsStatement[]): any {
  const claims = depicts.map(item => {
    // Extract numeric ID from Q-ID (e.g., Q12345 -> 12345)
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

  return {
    claims: {
      P180: claims
    }
  };
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
 * by fetching its MediaInfo entity
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

    return entity.statements.P180.map((statement: any) => ({
      entityId: statement.mainsnak.datavalue.value.id,
      entityLabel: '', // Would need to fetch labels separately
      entityType: 'unknown' as any
    }));
  } catch (error) {
    console.error('Error fetching existing depicts:', error);
    return [];
  }
}
