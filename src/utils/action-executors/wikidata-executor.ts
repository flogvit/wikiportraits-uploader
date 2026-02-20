import { WikidataAction } from '@/providers/PublishDataProvider';
import { lookupCache, CacheType } from '@/utils/lookup-cache';
import { logger } from '@/utils/logger';

interface WikidataExecutorContext {
  people: any[];
  organizations: any[];
  eventDetails: any;
}

/**
 * Execute a Wikidata action (create entity, update claims, etc.).
 */
export async function executeWikidataAction(
  action: WikidataAction,
  context: WikidataExecutorContext
): Promise<{ entityId?: string }> {
  const { people, organizations, eventDetails } = context;

  // Person creation
  if (action.entityId.startsWith('wikidata-person-') || action.action === 'create' && action.entityType === 'person') {
    return executeCreatePerson(action, people);
  }

  // Claim addition (P373, P527, P710 etc.)
  if (action.action === 'update' && action.changes?.length) {
    return executeUpdateClaims(action, context);
  }

  // Entity creation (event, etc.)
  if (action.action === 'create') {
    return executeCreateEntity(action, eventDetails);
  }

  throw new Error(`Unknown wikidata action: ${action.action} for ${action.entityId}`);
}

async function executeCreatePerson(action: WikidataAction, people: any[]): Promise<{ entityId?: string }> {
  const person = people.find((p: any) => p.id === action.entityId);
  if (!person && !action.entityLabel) {
    throw new Error('Person not found');
  }

  const personEntity = {
    id: person?.id || action.entityId,
    name: person?.labels?.en?.value || action.entityLabel,
    type: 'band_member',
    status: 'pending',
    new: true,
    description: person?.descriptions?.en?.value || 'musician',
    data: person?.metadata || {},
  };

  const response = await fetch('/api/wikidata/create-entity', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ entity: personEntity }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    let errorJson;
    try {
      errorJson = JSON.parse(errorText);
    } catch {
      throw new Error(`Failed to create person entity: ${errorText.substring(0, 200)}`);
    }
    throw new Error(errorJson.error || 'Failed to create person entity');
  }

  const result = await response.json();
  if (!result.success && !result.wikidataId) {
    throw new Error(result.message || 'Failed to create person entity');
  }

  return { entityId: result.wikidataId };
}

async function executeCreateEntity(action: WikidataAction, eventDetails: any): Promise<{ entityId?: string }> {
  const { getWikidataEntitiesToCreate } = await import('@/utils/wikidata-entities');
  const wikidataEntities = await getWikidataEntitiesToCreate(eventDetails);
  const entityInfo = wikidataEntities.find(e => e.entityName === action.entityLabel);

  if (entityInfo?.exists && entityInfo?.wikidataId) {
    throw new Error(`Entity already exists: ${entityInfo.wikidataId}`);
  }

  const entityData: any = {
    labels: { en: { language: 'en', value: action.entityLabel } },
    descriptions: { en: { language: 'en', value: entityInfo?.description || '' } },
    claims: [],
  };

  // Add P31 (instance of) claims
  if (entityInfo?.instanceOf?.length) {
    entityInfo.instanceOf.forEach(qid => {
      entityData.claims.push({
        mainsnak: {
          snaktype: 'value',
          property: 'P31',
          datavalue: {
            value: { 'entity-type': 'item', 'numeric-id': parseInt(qid.replace('Q', '')) },
            type: 'wikibase-entityid',
          },
        },
        type: 'statement',
        rank: 'normal',
      });
    });
  }

  // Add additional claims
  if (entityInfo?.claims) {
    Object.entries(entityInfo.claims).forEach(([property, value]) => {
      if (value) {
        entityData.claims.push({
          mainsnak: {
            snaktype: 'value',
            property,
            datavalue: {
              value: { 'entity-type': 'item', 'numeric-id': parseInt((value as string).replace('Q', '')) },
              type: 'wikibase-entityid',
            },
          },
          type: 'statement',
          rank: 'normal',
        });
      }
    });
  }

  const response = await fetch('/api/wikidata/create-entity', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ entityData }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to create Wikidata entity');
  }

  const result = await response.json();
  if (!result.success) {
    throw new Error(result.message || 'Failed to create Wikidata entity');
  }

  return { entityId: result.entityId };
}

async function executeUpdateClaims(
  action: WikidataAction,
  context: WikidataExecutorContext
): Promise<{ entityId?: string }> {
  const { people, organizations, eventDetails } = context;

  for (const change of action.changes || []) {
    let claimValue = change.newValue;

    // For P373, resolve the category name
    if (change.property === 'P373') {
      const org = organizations.find((o: any) => o.id === action.entityId);
      const person = people.find((p: any) => p.id === action.entityId);

      if (org) {
        const { checkNeedsDisambiguation } = await import('@/utils/band-categories');
        const disambigCheck = await checkNeedsDisambiguation(
          org.labels?.en?.value || 'Unknown',
          org.id
        );
        claimValue = disambigCheck.suggestedName;
      } else if (person) {
        const { getPerformerCategory } = await import('@/utils/performer-categories');
        const performerInfo = await getPerformerCategory(person);
        claimValue = performerInfo.commonsCategory;
        logger.info('WikidataExecutor', 'Publishing P373 for performer', { name: person.labels?.en?.value, value: claimValue });
      }
    }

    // For P710 (participant) - resolve band QID
    if (change.property === 'P710') {
      const org = organizations.find((o: any) => o.labels?.en?.value === change.newValue || o.id === change.newValue);
      if (org?.id) {
        claimValue = org.id;
      }
    }

    // For P527 (has part) with person linking - resolve person QID
    if (change.property === 'P527' && typeof change.newValue === 'string') {
      const { checkEntityExists } = await import('@/utils/wikidata');
      const personCheck = await checkEntityExists(change.newValue, ['Q5'], 'en');
      if (personCheck.exists && personCheck.entity?.id) {
        claimValue = personCheck.entity.id;
      } else {
        throw new Error('Person needs to be created first. Please create the person entity before linking to band.');
      }
    }

    const response = await fetch('/api/wikidata/create-claim', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        entityId: action.entityId,
        propertyId: change.property,
        value: claimValue,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to add claim');
    }

    const result = await response.json();
    if (!result.success) {
      throw new Error(result.message || 'Failed to add claim');
    }
  }

  // Invalidate Wikidata cache for this entity
  lookupCache.invalidate(CacheType.WIKIDATA_ENTITY, `${action.entityId}:en:claims|labels`);
  lookupCache.invalidate(CacheType.WIKIDATA_ENTITY, `${action.entityId}:en:labels|descriptions|claims`);
  logger.debug('WikidataExecutor', 'Invalidated Wikidata cache for entity', action.entityId);

  return { entityId: action.entityId };
}
