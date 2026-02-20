'use client';

import { useState } from 'react';
import { Database, User, Users, Edit3, Trash2, CheckCircle, AlertCircle, ExternalLink, Calendar, RefreshCw } from 'lucide-react';
import { useUniversalForm, useUniversalFormEntities } from '@/providers/UniversalFormProvider';
import { usePublishData } from '@/providers/PublishDataProvider';
import type { PendingWikidataEntity, PendingBandData, PendingBandMemberData } from '@/types/music';

interface WikidataPaneProps {
  onComplete?: () => void;
}

export default function WikidataPane({
  onComplete
}: WikidataPaneProps) {
  const form = useUniversalForm();
  const { people, organizations, removePerson, removeOrganization } = useUniversalFormEntities();
  const {
    wikidataActions,
    isCalculating,
    refresh
  } = usePublishData();

  const eventDetails = form.watch('eventDetails');

  // Convert centralized actions to display format
  const wikidataEntitiesToCreate = wikidataActions.map(action => ({
    entityName: action.entityLabel,
    entityType: action.entityType,
    shouldCreate: action.action === 'create',
    exists: action.action !== 'create',
    wikidataId: action.entityId.startsWith('new') ? undefined : action.entityId,
    wikidataUrl: action.entityId.startsWith('new') ? undefined : `https://www.wikidata.org/wiki/${action.entityId}`,
    description: '',
    instanceOf: [] as string[],
    claims: {} as Record<string, string>,
    parentEntity: undefined as string | undefined,
    missingClaims: action.changes?.map(c => ({
      property: c.property,
      value: c.newValue,
      description: `${c.property}: ${c.newValue}`
    })) || []
  }));

  // Legacy code - should be removed but keeping for now
  /*
  useEffect(() => {
    console.log('🔄 WikidataPane useEffect triggered - refreshKey:', refreshKey);

    const checkEntities = async () => {
      if (!eventDetails?.title && people.length === 0 && organizations.length === 0) {
        console.log('⏭️ Skipping entity check - no data');
        // Reset if no data
        form.setValue('computed.wikidata.checked', false);
        form.setValue('computed.wikidata.entityCount', 0);
        return;
      }

      console.log('🔍 Starting entity check...');
      setLoadingEntities(true);
      // Mark as not checked while loading
      form.setValue('computed.wikidata.checked', false);

      try {
        const entities = [];

        console.log('🎸 WikidataPane - Checking organizations:', {
          count: organizations.length,
          organizations: organizations.map((o: any) => ({
            hasEntity: !!o.entity,
            entityId: o.id,
            directId: o.id,
            labels: o.labels,
            instanceOf: o.claims?.P31?.map((c: any) => c.mainsnak?.datavalue?.value?.id),
            fullOrg: o
          }))
        });

        console.log('👥 WikidataPane - Checking people:', {
          count: people.length,
          people: people.map((p: any) => ({
            entityId: p.id,
            labels: p.labels,
            instanceOf: p.claims?.P31?.map((c: any) => c.mainsnak?.datavalue?.value?.id)
          }))
        });

        // Check if existing bands need P373 (Commons category) added
        for (const org of organizations) {
          console.log('🎸 Checking org:', org.id, 'has claims:', !!org.claims);

          // Organizations are WikidataEntity objects directly, not wrapped in .entity
          if (org.id && !org.id.startsWith('pending-')) {
            const bandName = org.labels?.en?.value;

            // Check if band has P373 (Commons category) - org already has claims
            const hasCommonsCategory = org.claims?.P373?.length > 0;

            console.log('🎸 Band check:', {
              id: org.id,
              bandName,
              hasCommonsCategory,
              claimsKeys: Object.keys(org.claims || {})
            });

            if (bandName) {
              // Always add band to show in UI (even if P373 exists)
              const missingClaims = [];

              if (!hasCommonsCategory) {
                // Check if disambiguation is needed for the main category
                const { checkNeedsDisambiguation } = await import('@/utils/band-categories');
                const disambigCheck = await checkNeedsDisambiguation(bandName, org.id);
                const mainCategoryName = disambigCheck.suggestedName;

                missingClaims.push({
                  property: 'P373',
                  value: mainCategoryName,
                  description: `Commons category: ${mainCategoryName}${disambigCheck.needsDisambiguation ? ' (disambiguated)' : ''}`
                });

                console.log('✅ Band needs P373:', mainCategoryName, disambigCheck);
              } else {
                console.log('✅ Band already has P373');
              }

              // Add to entities list
              entities.push({
                entityName: bandName,
                entityType: 'band',
                shouldCreate: false,
                exists: true,
                wikidataId: org.id,
                wikidataUrl: `https://www.wikidata.org/wiki/${org.id}`,
                description: 'musical group',
                instanceOf: [],
                claims: {},
                missingClaims
              });
            }
          }
        }

        // Get event-related entities if we have event details
        if (eventDetails?.title) {
          const eventEntities = await getWikidataEntitiesToCreate(eventDetails);
          entities.push(...eventEntities);

          // Check if event editions need P710 (participant) for bands
          const eventEdition = eventEntities.find(e => e.entityType === 'festival-edition' && e.exists);
          if (eventEdition?.wikidataId && organizations.length > 0) {
            // Check which bands are not yet listed as participants
            const { getWikidataEntity } = await import('@/utils/wikidata');
            const editionEntity = await getWikidataEntity(eventEdition.wikidataId, 'en', 'claims');
            const existingParticipants = editionEntity.claims?.P710?.map((claim: any) =>
              claim.mainsnak?.datavalue?.value?.id
            ) || [];

            // Check each band
            for (const org of organizations) {
              if (org.id && !org.id.startsWith('pending-')) {
                const bandAlreadyLinked = existingParticipants.includes(org.id);

                if (!bandAlreadyLinked) {
                  // Find the event entity in our list and add missing claim
                  const eventEntityInList = entities.find(e => e.wikidataId === eventEdition.wikidataId);
                  if (eventEntityInList) {
                    if (!eventEntityInList.missingClaims) {
                      eventEntityInList.missingClaims = [];
                    }
                    eventEntityInList.missingClaims.push({
                      property: 'P710',
                      value: org.id,
                      description: `Participant: ${org.labels?.en?.value}`
                    });

                    console.log(`📋 Event needs P710 for band: ${org.labels?.en?.value}`);
                  }
                }
              }
            }
          }
        }

        // Check existing performers for missing P373 (Commons category)
        const existingPeople = people.filter((p: any) => p.id && !p.id.startsWith('pending-'));
        for (const person of existingPeople) {
          const personName = person.labels?.en?.value;
          if (!personName) continue;

          // Re-fetch fresh entity data to check for P373 (in case it was added recently)
          const { getWikidataEntity } = await import('@/utils/wikidata');
          let freshEntity = person;
          try {
            freshEntity = await getWikidataEntity(person.id, 'en', 'labels|claims');
          } catch (error) {
            console.warn('Could not fetch fresh entity data for', person.id);
          }

          // Check if person has P373 (Commons category)
          const hasCommonsCategory = freshEntity.claims?.P373?.length > 0;
          const existingP373 = freshEntity.claims?.P373?.[0]?.mainsnak?.datavalue?.value;

          console.log('👤 Checking performer:', personName, 'has P373:', hasCommonsCategory, 'value:', existingP373);

          // Always show performers, but only mark P373 as missing if they don't have it
          const missingClaims = [];

          if (!hasCommonsCategory) {
            // Determine the correct Commons category for this performer
            const { getPerformerCategory } = await import('@/utils/performer-categories');
            const performerInfo = await getPerformerCategory(person);

            missingClaims.push({
              property: 'P373',
              value: performerInfo.commonsCategory,
              description: `Commons category: ${performerInfo.commonsCategory}${performerInfo.source === 'disambiguated' ? ' (disambiguated)' : ''}`
            });

            console.log('✅ Performer needs P373:', personName, '->', performerInfo.commonsCategory);
          } else {
            console.log('✅ Performer already has P373:', personName, '->', existingP373);
          }

          // Add all performers to the list (whether they have P373 or not)
          entities.push({
            entityName: personName,
            entityType: 'performer',
            shouldCreate: false,
            exists: true,
            wikidataId: person.id,
            wikidataUrl: `https://www.wikidata.org/wiki/${person.id}`,
            description: 'musician/performer',
            instanceOf: ['Q5'],
            claims: {},
            missingClaims
          });
        }

        // Add manually created performers from entities.people
        const newPeople = people.filter((p: any) => p.new === true);
        for (const person of newPeople) {
          const personName = person.labels?.en?.value || 'Unnamed Artist';

          // Check if this person already exists on Wikidata
          const { checkEntityExists } = await import('@/utils/wikidata');
          const personCheck = await checkEntityExists(
            personName,
            ['Q5'], // human
            'en'
          );

          const personEntity: any = {
            entityName: personName,
            entityType: 'performer',
            shouldCreate: !personCheck.exists,
            exists: personCheck.exists,
            wikidataId: personCheck.entity?.id,
            wikidataUrl: personCheck.entity ? `https://www.wikidata.org/wiki/${personCheck.entity.id}` : undefined,
            description: person.metadata?.isBandMember ? 'band member' : 'musician',
            instanceOf: ['Q5'], // human
            claims: {},
            missingClaims: [],
            metadata: person.metadata // Include metadata for display
          };
          entities.push(personEntity);

          // If this person is a member of an existing band, check if band needs P527
          if (person.metadata?.bandId && !person.metadata.bandId.startsWith('pending-')) {
            const bandId = person.metadata.bandId;
            const personName = person.labels?.en?.value || 'Unnamed Artist';

            // Check if band already has P527 pointing to this person
            const { getWikidataEntity } = await import('@/utils/wikidata');
            const bandEntity = await getWikidataEntity(bandId, 'en', 'claims|labels');
            const hasParts = bandEntity.claims?.P527 || [];

            let personAlreadyLinked = false;
            if (personCheck.exists && personCheck.entity?.id) {
              personAlreadyLinked = hasParts.some((claim: any) =>
                claim.mainsnak?.datavalue?.value?.id === personCheck.entity.id
              );
            }

            if (!personAlreadyLinked) {
              // Find or create band entity in the list
              let bandEntityInfo = entities.find((e: any) => e.wikidataId === bandId);

              if (!bandEntityInfo) {
                // Add band entity to the list
                bandEntityInfo = {
                  entityName: bandEntity.labels?.en?.value || bandId,
                  entityType: 'band',
                  shouldCreate: false,
                  exists: true,
                  wikidataId: bandId,
                  wikidataUrl: `https://www.wikidata.org/wiki/${bandId}`,
                  description: 'musical group',
                  instanceOf: [],
                  claims: {},
                  missingClaims: []
                };
                entities.push(bandEntityInfo);
              }

              // Add missing P527 claim to band
              if (!bandEntityInfo.missingClaims) {
                bandEntityInfo.missingClaims = [];
              }

              if (personCheck.exists && personCheck.entity?.id) {
                bandEntityInfo.missingClaims.push({
                  property: 'P527',
                  value: personCheck.entity.id,
                  description: `Has part: ${personName}`
                });
              } else {
                // Person doesn't exist yet - show as post-creation action
                personEntity.postCreationActions = [{
                  action: 'add-claim',
                  entityId: bandId,
                  property: 'P527',
                  description: `After creating this person, add P527 (has part) to band to create bidirectional link`
                }];
              }
            }
          }
        }

        console.log('📊 Wikidata entities to create/update:', entities);
        console.log('📊 Entity types:', entities.map(e => ({ name: e.entityName, type: e.entityType, exists: e.exists, hasMissingClaims: e.missingClaims?.length })));
        setWikidataEntitiesToCreate(entities);

        // Store entity count and mark as checked
        form.setValue('computed.wikidata.entityCount', entities.length);
        form.setValue('computed.wikidata.checked', true);
      } catch (error) {
        console.error('Error checking Wikidata entities:', error);
        form.setValue('computed.wikidata.checked', false);
      } finally {
        setLoadingEntities(false);
      }
    };

    checkEntities();
  }, [eventDetails?.title, eventDetails?.date, eventDetails?.participants, people, organizations, refreshKey]);
  */

  // Convert UniversalForm entities to old format for compatibility
  // WikidataEntity objects are stored directly; "new" entities have IDs starting with 'pending-'
  const isNewEntity = (entity: { id: string }) => entity.id?.startsWith('pending-');
  const pendingWikidataEntities: PendingWikidataEntity[] = [
    ...people.filter(p => isNewEntity(p)).map((person, index) => ({
      id: person.id || `person-${index}`,
      name: person.labels?.en?.value || 'Unknown',
      type: 'band_member' as const,
      status: 'created' as const,
      new: true,
      data: {
        name: person.labels?.en?.value || 'Unknown',
      } as PendingBandMemberData
    })),
    ...organizations.filter(o => isNewEntity(o)).map((org, index) => ({
      id: org.id || `org-${index}`,
      name: org.labels?.en?.value || 'Unknown',
      type: 'band' as const,
      status: 'created' as const,
      new: true,
      data: {
        name: org.labels?.en?.value || 'Unknown'
      } as PendingBandData
    }))
  ];
  
  const performers = people;
  const [editingEntity, setEditingEntity] = useState<string | null>(null);

  const handleEntityUpdate = (entityId: string, updates: Partial<PendingWikidataEntity>) => {
    // Find and update the entity in people or organizations
    const personIndex = people.findIndex(p => p.id === entityId);
    if (personIndex >= 0) {
      const person = people[personIndex];
      const updatedPerson = {
        ...person,
        labels: {
          ...person.labels,
          en: {
            language: 'en',
            value: updates.name || person.labels?.en?.value || 'Unknown'
          }
        },
      };

      // Update directly through form setValue instead of using hooks
      const currentPeople = form.getValues('entities.people');
      const newPeople = [...currentPeople];
      newPeople[personIndex] = updatedPerson;
      form.setValue('entities.people', newPeople, { shouldDirty: true });
    }

    const orgIndex = organizations.findIndex(o => o.id === entityId);
    if (orgIndex >= 0) {
      const org = organizations[orgIndex];
      const updatedOrg = {
        ...org,
        labels: {
          ...org.labels,
          en: {
            language: 'en',
            value: updates.name || org.labels?.en?.value || 'Unknown'
          }
        },
      };

      // Update directly through form setValue instead of using hooks
      const currentOrgs = form.getValues('entities.organizations');
      const newOrgs = [...currentOrgs];
      newOrgs[orgIndex] = updatedOrg;
      form.setValue('entities.organizations', newOrgs, { shouldDirty: true });
    }

    setEditingEntity(null);
  };

  const handleEntityDelete = (entityId: string) => {
    // Find and remove the entity from people or organizations
    const personIndex = people.findIndex(p => p.id === entityId);
    if (personIndex >= 0) {
      removePerson(personIndex);
      return;
    }

    const orgIndex = organizations.findIndex(o => o.id === entityId);
    if (orgIndex >= 0) {
      removeOrganization(orgIndex);
    }
  };

  const bandEntities = pendingWikidataEntities.filter((entity: PendingWikidataEntity) => entity.type === 'band');
  const memberEntities = pendingWikidataEntities.filter((entity: PendingWikidataEntity) => entity.type === 'band_member');

  const eventEntities = wikidataEntitiesToCreate.filter(e =>
    e.entityType === 'event' || e.entityType === 'location'
  );
  const performerEntities = wikidataEntitiesToCreate.filter(e =>
    e.entityType === 'person' || e.entityType === 'organization'
  );

  // Show all organizations and people (both new and existing)
  const allOrganizations = organizations || [];
  const allPeople = people || [];
  const totalEntities = allOrganizations.length + allPeople.length + wikidataActions.length;

  return (
    <div className="space-y-6">

      {/* Loading State */}
      {isCalculating && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-800">Checking Wikidata for existing entities...</p>
        </div>
      )}

      {/* Organizations/Bands Section */}
      {!isCalculating && allOrganizations.length > 0 && (
        <div className="bg-card rounded-lg border border-border p-6">
          <h3 className="text-lg font-semibold text-card-foreground mb-4 flex items-center gap-2">
            <Users className="w-5 h-5" />
            Organizations ({allOrganizations.length})
          </h3>
          <div className="space-y-3">
            {allOrganizations.map((org: any, index: number) => {
              const orgName = org.labels?.en?.value || org.entity?.labels?.en?.value || 'Unknown';
              const orgId = org.id || org.entity?.id;
              const isNew = org.isNew || false;

              // Check if centralized provider says P373 is missing
              const needsP373Action = wikidataActions.find(
                action => action.entityId === orgId &&
                         action.changes?.some(c => c.property === 'P373')
              );
              const missingP373 = !!needsP373Action;

              return (
                <div key={orgId || index} className="flex items-start justify-between p-4 bg-muted rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium text-card-foreground">{orgName}</h4>
                      {isNew && (
                        <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">NEW</span>
                      )}
                      {!isNew && (
                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">EXISTS</span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Type: Organization/Band
                      {orgId && <span className="ml-2">• ID: {orgId}</span>}
                      {missingP373 && <span className="ml-2 text-orange-600">• Missing P373 (Commons category)</span>}
                    </p>
                  </div>
                  {orgId && !isNew && (
                    <a
                      href={`https://www.wikidata.org/wiki/${orgId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 ml-2"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* People/Performers Section */}
      {!isCalculating && allPeople.length > 0 && (
        <div className="bg-card rounded-lg border border-border p-6">
          <h3 className="text-lg font-semibold text-card-foreground mb-4 flex items-center gap-2">
            <User className="w-5 h-5" />
            People ({allPeople.length})
          </h3>
          <div className="space-y-3">
            {allPeople.map((person: any, index: number) => {
              const personName = person.labels?.en?.value || person.entity?.labels?.en?.value || 'Unknown';
              const personId = person.id || person.entity?.id;
              const isNew = person.isNew || false;

              // Check if centralized provider says P373 is missing
              const needsP373Action = wikidataActions.find(
                action => action.entityId === personId &&
                         action.changes?.some(c => c.property === 'P373')
              );
              const missingP373 = !!needsP373Action;

              return (
                <div key={personId || index} className="flex items-start justify-between p-4 bg-muted rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium text-card-foreground">{personName}</h4>
                      {isNew && (
                        <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">NEW</span>
                      )}
                      {!isNew && (
                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">EXISTS</span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Type: Person
                      {personId && <span className="ml-2">• ID: {personId}</span>}
                      {missingP373 && <span className="ml-2 text-orange-600">• Missing P373 (Commons category)</span>}
                    </p>
                  </div>
                  {personId && !isNew && (
                    <a
                      href={`https://www.wikidata.org/wiki/${personId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 ml-2"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Wikidata Actions (from centralized provider) */}
      {!isCalculating && wikidataActions.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-amber-600" />
            Actions Needed ({wikidataActions.length})
          </h3>
          <div className="space-y-3">
            {wikidataActions.map((action, index) => (
              <div key={index} className="flex items-start justify-between p-4 bg-white rounded-lg border border-amber-300">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium text-gray-900">{action.entityLabel}</h4>
                    <span className={`text-xs px-2 py-0.5 rounded ${
                      action.action === 'create' ? 'bg-green-100 text-green-700' :
                      action.action === 'update' ? 'bg-blue-100 text-blue-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {action.action.toUpperCase()}
                    </span>
                  </div>
                  <p className="text-xs text-gray-600 mt-1">
                    {action.entityType} • {action.changes?.length || 0} changes needed
                  </p>
                  {action.changes && action.changes.length > 0 && (
                    <ul className="text-xs text-gray-500 mt-2 space-y-1">
                      {action.changes.map((change, cIndex) => (
                        <li key={cIndex}>• {change.property}: {JSON.stringify(change.newValue)}</li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Event Entities */}
      {!isCalculating && eventEntities.length > 0 && (
        <div className="bg-card rounded-lg border border-border p-6">
          <h3 className="text-lg font-semibold text-card-foreground mb-4 flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Event Entities ({eventEntities.length})
          </h3>
          <div className="space-y-3">
            {eventEntities.map((entity, index) => (
              <div
                key={index}
                className={`flex items-start justify-between p-4 rounded-lg border ${
                  entity.exists
                    ? 'bg-green-50 border-green-200'
                    : 'bg-amber-50 border-amber-200'
                }`}
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    {entity.exists ? (
                      <CheckCircle className="w-5 h-5 text-green-600" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-amber-600" />
                    )}
                    <h4 className="font-medium text-gray-900">{entity.entityName}</h4>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">
                    {entity.description}
                    {entity.parentEntity && (
                      <span className="text-blue-600 ml-2">
                        → Part of: {entity.parentEntity}
                      </span>
                    )}
                  </p>

                  {/* Show missing claims for existing entities */}
                  {entity.exists && entity.missingClaims && entity.missingClaims.length > 0 && (
                    <div className="mt-3 bg-yellow-50 border border-yellow-200 rounded p-3 text-xs">
                      <p className="font-semibold text-yellow-800 mb-2">⚠️ Missing claims to add:</p>
                      <div className="space-y-1 text-gray-600 font-mono">
                        {entity.missingClaims.map((claim, i) => (
                          <p key={i}>
                            <strong>{claim.property}:</strong> {claim.description}
                          </p>
                        ))}
                      </div>
                      <p className="text-yellow-700 mt-2 text-xs">
                        These will be added when you publish in the Publish pane
                      </p>
                    </div>
                  )}

                  {/* Show what will be created for new entities */}
                  {!entity.exists && (
                    <div className="mt-3 bg-white border border-amber-200 rounded p-3 text-xs">
                      <p className="font-semibold text-gray-700 mb-2">Will create with:</p>
                      <div className="space-y-1 text-gray-600 font-mono">
                        <p><strong>Label (en):</strong> {entity.entityName}</p>
                        <p><strong>Description (en):</strong> {entity.description}</p>
                        <p>
                          <strong>P31 (instance of):</strong>{' '}
                          {entity.instanceOf.map((qid, i) => (
                            <span key={qid}>
                              {i > 0 && ', '}
                              <a
                                href={`https://www.wikidata.org/wiki/${qid}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:underline"
                              >
                                {qid}
                              </a>
                            </span>
                          ))}
                        </p>
                        {entity.claims && Object.entries(entity.claims).map(([property, value]) => {
                          if (!value) return null;
                          return (
                            <p key={property}>
                              <strong>{property}:</strong>{' '}
                              <a
                                href={`https://www.wikidata.org/wiki/${value}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:underline"
                              >
                                {value as string}
                              </a>
                              {property === 'P361' && entity.parentEntity && (
                                <span className="text-gray-500"> (part of {entity.parentEntity})</span>
                              )}
                              {property === 'P373' && (
                                <span className="text-gray-500"> (Commons category)</span>
                              )}
                            </p>
                          );
                        })}
                        {eventDetails?.location && (
                          <p className="text-gray-500 italic">+ Location: {eventDetails.location.labels?.en?.value || eventDetails.location.id}</p>
                        )}
                        {eventDetails?.country && (
                          <p className="text-gray-500 italic">+ Country: {eventDetails.country.labels?.en?.value || eventDetails.country.id}</p>
                        )}
                      </div>
                    </div>
                  )}

                  {entity.wikidataUrl && (
                    <a
                      href={entity.wikidataUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 mt-2"
                    >
                      View on Wikidata
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
                <div className="text-sm font-medium">
                  {entity.exists ? (
                    <span className="text-green-600">Exists</span>
                  ) : (
                    <span className="text-amber-600">Needs Creation</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Performer/Band Entities */}
      {!isCalculating && performerEntities.length > 0 && (
        <div className="bg-card rounded-lg border border-border p-6">
          <h3 className="text-lg font-semibold text-card-foreground mb-4 flex items-center gap-2">
            <Users className="w-5 h-5" />
            Performer Entities ({performerEntities.length})
          </h3>
          <div className="space-y-3">
            {performerEntities.map((entity, index) => (
              <div
                key={index}
                className={`flex items-start justify-between p-4 rounded-lg border ${
                  entity.exists
                    ? 'bg-green-50 border-green-200'
                    : 'bg-amber-50 border-amber-200'
                }`}
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    {entity.exists ? (
                      <CheckCircle className="w-5 h-5 text-green-600" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-amber-600" />
                    )}
                    <h4 className="font-medium text-gray-900">{entity.entityName}</h4>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">{entity.description}</p>

                  {/* Show missing claims for existing performer/band entities */}
                  {entity.exists && entity.missingClaims && entity.missingClaims.length > 0 && (
                    <div className="mt-3 bg-yellow-50 border border-yellow-200 rounded p-3 text-xs">
                      <p className="font-semibold text-yellow-800 mb-2">⚠️ Missing claims to add:</p>
                      <div className="space-y-1 text-gray-600 font-mono">
                        {entity.missingClaims.map((claim, i) => (
                          <p key={i}>
                            <strong>{claim.property}:</strong> {claim.description}
                          </p>
                        ))}
                      </div>
                      <p className="text-yellow-700 mt-2 text-xs">
                        These will be added when you publish in the Publish pane
                      </p>
                    </div>
                  )}

                  {/* Show what will be created for new entities */}
                  {!entity.exists && (
                    <div className="mt-3 bg-white border border-amber-200 rounded p-3 text-xs">
                      <p className="font-semibold text-gray-700 mb-2">Will create with:</p>
                      <div className="space-y-1 text-gray-600 font-mono">
                        <p><strong>Label (en):</strong> {entity.entityName}</p>
                        <p><strong>Description (en):</strong> {entity.description}</p>
                        <p>
                          <strong>P31 (instance of):</strong>{' '}
                          {entity.instanceOf.map((qid, i) => (
                            <span key={qid}>
                              {i > 0 && ', '}
                              <a
                                href={`https://www.wikidata.org/wiki/${qid}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:underline"
                              >
                                {qid}
                              </a>
                            </span>
                          ))}
                        </p>
                        {(entity as any).metadata?.instruments && (entity as any).metadata.instruments.length > 0 && (
                          <p><strong>P1303 (instrument):</strong> {(entity as any).metadata.instruments.join(', ')}</p>
                        )}
                        {(entity as any).metadata?.nationality && (
                          <p><strong>P27 (nationality):</strong> {(entity as any).metadata.nationality}</p>
                        )}
                        {(entity as any).metadata?.gender && (
                          <p><strong>P21 (gender):</strong> {(entity as any).metadata.gender}</p>
                        )}
                        {(entity as any).metadata?.birthDate && (
                          <p><strong>P569 (birth date):</strong> {(entity as any).metadata.birthDate}</p>
                        )}
                        {(entity as any).metadata?.legalName && (
                          <p><strong>Also known as:</strong> {(entity as any).metadata.legalName}</p>
                        )}
                        {(entity as any).metadata?.bandId && !(entity as any).metadata.bandId.startsWith('pending-') && (
                          <p>
                            <strong>P463 (member of):</strong>{' '}
                            <a
                              href={`https://www.wikidata.org/wiki/${(entity as any).metadata.bandId}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:underline"
                            >
                              {(entity as any).metadata.bandId}
                            </a>
                          </p>
                        )}
                        {(entity as any).metadata?.bandId && (entity as any).metadata.bandId.startsWith('pending-') && (
                          <p className="text-yellow-600">
                            <strong>P463 (member of):</strong> Will be linked after band is created
                          </p>
                        )}
                      </div>
                      {(entity as any).postCreationActions && (entity as any).postCreationActions.length > 0 && (
                        <div className="mt-2 pt-2 border-t border-amber-300">
                          <p className="text-xs font-semibold text-yellow-700 mb-1">📋 After creation:</p>
                          {(entity as any).postCreationActions.map((action: any, i: number) => (
                            <p key={i} className="text-xs text-gray-600">
                              • {action.description}
                            </p>
                          ))}
                          <p className="text-xs text-yellow-600 mt-1 italic">
                            This will create a bidirectional relationship
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {entity.wikidataUrl && (
                    <a
                      href={entity.wikidataUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 mt-2"
                    >
                      View on Wikidata
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
                <div className="text-sm font-medium">
                  {entity.exists ? (
                    <span className="text-green-600">Exists</span>
                  ) : (
                    <span className="text-amber-600">Needs Creation</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* No entities message */}
      {pendingWikidataEntities.length === 0 && !isCalculating && wikidataEntitiesToCreate.length === 0 && allPeople.length === 0 && allOrganizations.length === 0 && wikidataActions.length === 0 && (
        <div className="text-center py-8">
          <AlertCircle className="w-16 h-16 mx-auto mb-4 text-gray-400" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Entities Yet</h3>
          <p className="text-gray-500">
            Select event participants, bands, and performers to see them here.
          </p>
        </div>
      )}

      {pendingWikidataEntities.length > 0 && (
        <div className="space-y-6">
          {/* Bands to Create */}
          {bandEntities.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-card-foreground mb-4 flex items-center gap-2">
                <Users className="w-5 h-5" />
                Bands to Create ({bandEntities.length})
              </h3>
              <div className="space-y-3">
                {bandEntities.map((entity: PendingWikidataEntity) => (
                  <BandEntityCard
                    key={entity.id}
                    entity={entity}
                    isEditing={editingEntity === entity.id}
                    onEdit={() => setEditingEntity(entity.id)}
                    onUpdate={(updates) => handleEntityUpdate(entity.id, updates)}
                    onDelete={() => handleEntityDelete(entity.id)}
                    onCancelEdit={() => setEditingEntity(null)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Band Members to Create */}
          {memberEntities.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-card-foreground mb-4 flex items-center gap-2">
                <User className="w-5 h-5" />
                Band Members to Create ({memberEntities.length})
              </h3>
              <div className="space-y-3">
                {memberEntities.map((entity: PendingWikidataEntity) => (
                  <BandMemberEntityCard
                    key={entity.id}
                    entity={entity}
                    isEditing={editingEntity === entity.id}
                    onEdit={() => setEditingEntity(entity.id)}
                    onUpdate={(updates) => handleEntityUpdate(entity.id, updates)}
                    onDelete={() => handleEntityDelete(entity.id)}
                    onCancelEdit={() => setEditingEntity(null)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Summary */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="w-5 h-5 text-blue-600" />
              <h4 className="font-medium text-blue-900 dark:text-blue-100">Creation Summary</h4>
            </div>
            <div className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
              <p>• {bandEntities.length} band{bandEntities.length !== 1 ? 's' : ''} will be created</p>
              <p>• {memberEntities.length} band member{memberEntities.length !== 1 ? 's' : ''} will be created</p>
              <p>• Relationships will be established between bands and members</p>
            </div>
          </div>

          {/* Continue Button */}
          <div className="text-center">
            <button
              onClick={() => onComplete?.()}
              className="px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
            >
              Continue to Publishing - Create {pendingWikidataEntities.length} Entities
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

interface EntityCardProps {
  entity: PendingWikidataEntity;
  isEditing: boolean;
  onEdit: () => void;
  onUpdate: (updates: Partial<PendingWikidataEntity>) => void;
  onDelete: () => void;
  onCancelEdit: () => void;
}

function BandEntityCard({ entity, isEditing, onEdit, onUpdate, onDelete, onCancelEdit }: EntityCardProps) {
  const [editName, setEditName] = useState(entity.name);
  const [editDescription, setEditDescription] = useState(entity.description || '');

  const handleSave = () => {
    onUpdate({
      name: editName,
      description: editDescription,
      data: {
        ...entity.data,
        name: editName,
      } as PendingBandData
    });
  };

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-white dark:bg-gray-800">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-gray-400" />
          <span className="font-medium text-gray-900 dark:text-gray-100">{entity.name}</span>
          <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">Band</span>
        </div>
        <div className="flex gap-2">
          <button
            onClick={onEdit}
            className="p-1 text-gray-400 hover:text-gray-600"
          >
            <Edit3 className="w-4 h-4" />
          </button>
          <button
            onClick={onDelete}
            className="p-1 text-gray-400 hover:text-red-600"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {isEditing ? (
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Band Name
            </label>
            <input
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Description
            </label>
            <input
              type="text"
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
              placeholder="e.g., Norwegian rock band"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700"
            >
              Save
            </button>
            <button
              onClick={onCancelEdit}
              className="px-3 py-1 text-sm bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="text-sm text-gray-600 dark:text-gray-400">
          <p>{entity.description || 'No description'}</p>
        </div>
      )}
    </div>
  );
}

function BandMemberEntityCard({ entity, isEditing, onEdit, onUpdate, onDelete, onCancelEdit }: EntityCardProps) {
  const [editName, setEditName] = useState(entity.name);
  const [editInstruments, setEditInstruments] = useState(
    ((entity.data as PendingBandMemberData).instruments || []).join(', ')
  );

  const handleSave = () => {
    onUpdate({
      name: editName,
      data: {
        ...entity.data,
        name: editName,
        instruments: editInstruments.trim() ? editInstruments.split(',').map(i => i.trim()) : undefined,
      } as PendingBandMemberData
    });
  };

  const memberData = entity.data as PendingBandMemberData;

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-white dark:bg-gray-800">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <User className="w-5 h-5 text-gray-400" />
          <span className="font-medium text-gray-900 dark:text-gray-100">{entity.name}</span>
          <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full">Member</span>
        </div>
        <div className="flex gap-2">
          <button
            onClick={onEdit}
            className="p-1 text-gray-400 hover:text-gray-600"
          >
            <Edit3 className="w-4 h-4" />
          </button>
          <button
            onClick={onDelete}
            className="p-1 text-gray-400 hover:text-red-600"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {isEditing ? (
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Member Name
            </label>
            <input
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Instruments
            </label>
            <input
              type="text"
              value={editInstruments}
              onChange={(e) => setEditInstruments(e.target.value)}
              placeholder="e.g., vocals, guitar, bass"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700"
            >
              Save
            </button>
            <button
              onClick={onCancelEdit}
              className="px-3 py-1 text-sm bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
          <p>
            <strong>Gender:</strong> {memberData.gender || 'Not specified'}
          </p>
          <p>
            <strong>Instruments:</strong> {memberData.instruments && memberData.instruments.length > 0
              ? memberData.instruments.join(', ')
              : 'Not specified'
            }
          </p>
          <p>
            <strong>Nationality:</strong> {memberData.nationalityName || 'Not specified'}
            {memberData.nationality && (
              <span className="text-xs text-muted-foreground ml-1">({memberData.nationality})</span>
            )}
          </p>
          <p>
            <strong>Birth Date:</strong> {memberData.birthDate || 'Not specified'}
          </p>
          {memberData.legalName && (
            <p>
              <strong>Legal Name:</strong> {memberData.legalName}
            </p>
          )}
        </div>
      )}
    </div>
  );
}