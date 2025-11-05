'use client';

import { useState, useEffect } from 'react';
import { Upload, CheckCircle, AlertCircle, Clock, Loader2, FolderPlus, FileText, Database, ImagePlus } from 'lucide-react';
import { useUniversalForm } from '@/providers/UniversalFormProvider';
import { getCategoriesToCreate, detectBandCategories } from '@/utils/music-categories';
import { getWikidataEntitiesToCreate } from '@/utils/wikidata-entities';
import { getAllBandCategoryStructures, flattenBandCategories } from '@/utils/band-categories';
import { lookupCache, CacheType } from '@/utils/lookup-cache';

interface PublishPaneProps {
  onComplete?: () => void;
}

type ActionStatus = 'pending' | 'in-progress' | 'completed' | 'error';

interface PublishAction {
  id: string;
  type: 'category' | 'template' | 'wikidata' | 'image' | 'metadata';
  title: string;
  description: string;
  status: ActionStatus;
  error?: string;
  canPublish: boolean;
  dependsOn?: string; // ID of action that must complete first
  createdEntityId?: string; // QID of created entity (set after creation)
  preview?: string; // Blob URL for image preview
}

export default function PublishPane({ onComplete }: PublishPaneProps) {
  const form = useUniversalForm();
  const [actions, setActions] = useState<PublishAction[]>([]);
  const [loading, setLoading] = useState(true);
  const [completedCount, setCompletedCount] = useState(0);
  const [errorCount, setErrorCount] = useState(0);

  const eventDetails = form.watch('eventDetails');
  const existingImages = form.watch('files.existing') || [];
  const newImages = form.watch('files.queue') || [];
  const allCategories = form.watch('computed.categories.all') || [];
  const people = form.watch('entities.people') || [];
  const organizations = form.watch('entities.organizations') || [];

  // Build list of publish actions
  useEffect(() => {
    const buildActions = async () => {
      const publishActions: PublishAction[] = [];

      // 1. Categories that need creation
      if (eventDetails) {
        let categoriesToCreate = getCategoriesToCreate(eventDetails);

        // Generate proper band category structures with hierarchy
        const year = eventDetails.date ? new Date(eventDetails.date).getFullYear().toString() : '';
        const eventName = eventDetails.commonsCategory || (year ? `${eventDetails.title} ${year}` : eventDetails.title);

        if (eventName && year && organizations.length > 0) {
          // Get bands from organizations
          const bands = organizations
            .filter((org: any) => org.id && !org.id.startsWith('pending-'))
            .map((org: any) => ({
              name: org.labels?.en?.value,
              qid: org.id
            }))
            .filter((b: any) => b.name);

          if (bands.length > 0) {
            const bandStructures = await getAllBandCategoryStructures(bands, year, eventName);
            const bandCategories = flattenBandCategories(bandStructures);
            categoriesToCreate = [...categoriesToCreate, ...bandCategories];
          }
        }

        const needsCreation = categoriesToCreate.filter(cat => cat.shouldCreate);

        if (needsCreation.length > 0) {
          // Check which categories actually need creation
          const { CommonsClient } = await import('@/lib/api/CommonsClient');

          for (const cat of needsCreation) {
            try {
              const exists = await CommonsClient.categoryExists(cat.categoryName);
              console.log(`Category "${cat.categoryName}" exists:`, exists);

              if (!exists) {
                publishActions.push({
                  id: `category-${cat.categoryName}`,
                  type: 'category',
                  title: `Create Category: ${cat.categoryName}`,
                  description: cat.description || `Category on Wikimedia Commons`,
                  status: 'pending',
                  canPublish: true
                });
              }
            } catch (error) {
              console.error(`Error checking category "${cat.categoryName}":`, error);
              // If we can't check, assume it needs creation
              publishActions.push({
                id: `category-${cat.categoryName}`,
                type: 'category',
                title: `Create Category: ${cat.categoryName}`,
                description: cat.description || `Category on Wikimedia Commons`,
                status: 'pending',
                canPublish: true
              });
            }
          }
        }
      }

      // 2. Check existing bands for missing P373 (Commons category)
      for (const org of organizations) {
        if (org.id && !org.id.startsWith('pending-')) {
          const bandName = org.labels?.en?.value;
          const hasCommonsCategory = org.claims?.P373?.length > 0;

          if (!hasCommonsCategory && bandName) {
            try {
              // Check if disambiguation needed
              const { checkNeedsDisambiguation } = await import('@/utils/band-categories');
              const disambigCheck = await checkNeedsDisambiguation(bandName, org.id);
              const mainCategoryName = disambigCheck.suggestedName;

              publishActions.push({
                id: `wikidata-claim-${org.id}-P373`,
                type: 'wikidata',
                title: `Add Commons category to ${bandName}`,
                description: `Add P373 (Commons category) = "${mainCategoryName}"`,
                status: 'pending',
                canPublish: true
              });
            } catch (error) {
              console.error('Error checking band for P373:', error);
            }
          }
        }
      }

      // 3. Wikidata entities that need creation or updating
      if (eventDetails?.title) {
        try {
          const wikidataEntities = await getWikidataEntitiesToCreate(eventDetails);

          // Also check for P710 (participant) claims for bands
          const eventEdition = wikidataEntities.find(e => e.entityType === 'festival-edition' && e.exists);
          if (eventEdition?.wikidataId && organizations.length > 0) {
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
                  // Find the event entity and add missing claim
                  const eventEntityInList = wikidataEntities.find(e => e.wikidataId === eventEdition.wikidataId);
                  if (eventEntityInList) {
                    if (!eventEntityInList.missingClaims) {
                      eventEntityInList.missingClaims = [];
                    }
                    eventEntityInList.missingClaims.push({
                      property: 'P710',
                      value: org.id,
                      description: `Participant: ${org.labels?.en?.value}`
                    });
                  }
                }
              }
            }
          }

          // Entities that need creation
          const needsCreation = wikidataEntities.filter(entity => entity.shouldCreate);
          needsCreation.forEach((entity, index) => {
            publishActions.push({
              id: `wikidata-create-${entity.entityName}`,
              type: 'wikidata',
              title: `Create Wikidata: ${entity.entityName}`,
              description: entity.description || `${entity.entityType} entity`,
              status: 'pending',
              canPublish: true
            });
          });

          // Existing entities that need claims added
          const needsUpdate = wikidataEntities.filter(entity =>
            entity.exists && entity.missingClaims && entity.missingClaims.length > 0
          );
          needsUpdate.forEach((entity) => {
            entity.missingClaims?.forEach((claim, claimIndex) => {
              publishActions.push({
                id: `wikidata-claim-${entity.wikidataId}-${claim.property}`,
                type: 'wikidata',
                title: `Add ${claim.property} to ${entity.entityName}`,
                description: claim.description,
                status: 'pending',
                canPublish: true
              });
            });
          });
        } catch (error) {
          console.error('Error checking Wikidata entities:', error);
        }
      }

      // Add manually created people/performers - but check if they exist first
      const newPeople = people.filter((p: any) => p.new === true);
      const { checkEntityExists } = await import('@/utils/wikidata');

      for (const person of newPeople) {
        const personName = person.labels?.en?.value || 'Unnamed Artist';
        const personActionId = `wikidata-person-${person.id}`;

        // Check if person already exists on Wikidata
        const personCheck = await checkEntityExists(personName, ['Q5'], 'en');

        // Only add creation action if person doesn't exist
        if (!personCheck.exists) {
          publishActions.push({
            id: personActionId,
            type: 'wikidata',
            title: `Create Wikidata: ${personName}`,
            description: person.metadata?.isBandMember ? 'band member' : 'musician',
            status: 'pending',
            canPublish: true
          });
        }

        // If this person is a member of an existing band, check if P527 needs to be added
        if (person.metadata?.bandId && !person.metadata.bandId.startsWith('pending-')) {
          const bandId = person.metadata.bandId;

          // Check if band already has P527 pointing to this person
          const { getWikidataEntity } = await import('@/utils/wikidata');
          const bandEntity = await getWikidataEntity(bandId, 'en', 'claims');
          const hasParts = bandEntity.claims?.P527 || [];

          // Check if this person is already linked (by QID if exists, or we'll add after creation)
          let personAlreadyLinked = false;
          if (personCheck.exists && personCheck.entity?.id) {
            personAlreadyLinked = hasParts.some((claim: any) =>
              claim.mainsnak?.datavalue?.value?.id === personCheck.entity.id
            );
          }

          // Add action to link person to band if not already linked
          if (!personAlreadyLinked) {
            publishActions.push({
              id: `wikidata-claim-${bandId}-P527-for-${personName.replace(/\s+/g, '_')}`,
              type: 'wikidata',
              title: `Link ${personName} to band`,
              description: `Add P527 (has part) to band ${bandId}`,
              status: 'pending',
              canPublish: personCheck.exists, // Can publish immediately if person already exists
              dependsOn: personCheck.exists ? undefined : personActionId // Only depends on creation if person doesn't exist yet
            });
          }
        }
      }

      // 3. Existing images - metadata updates
      if (existingImages.length > 0) {
        existingImages.forEach((img: any, index: number) => {
          publishActions.push({
            id: `metadata-${index}`,
            type: 'metadata',
            title: `Update Metadata: ${img.filename}`,
            description: `Update metadata on existing Commons image`,
            status: 'pending',
            canPublish: true
          });
        });
      }

      // 4. New images - uploads
      if (newImages.length > 0) {
        newImages.forEach((img: any, index: number) => {
          const suggestedFilename = img.metadata?.suggestedFilename || img.file?.name || 'Unnamed';
          const description = img.metadata?.description || '';
          const performers = img.metadata?.selectedBandMembers || [];
          const categories = img.metadata?.categories || [];

          // Build description preview (remove language template wrapper for display)
          let descPreview = description.replace(/{{en\|1=/g, '').replace(/}}/g, '');
          descPreview = descPreview.length > 80
            ? descPreview.substring(0, 80) + '...'
            : descPreview;

          // Add performer info
          let performerInfo = '';
          if (performers.length > 0) {
            performerInfo = ` • ${performers.length} performer${performers.length > 1 ? 's' : ''}`;
          }

          // Add category count
          const categoryInfo = categories.length > 0 ? ` • ${categories.length} cat${categories.length > 1 ? 's' : ''}` : '';
          const preview = img.preview; // Blob URL for thumbnail

          publishActions.push({
            id: `image-${index}`,
            type: 'image',
            title: `Upload: ${suggestedFilename}`,
            description: `${descPreview}${performerInfo}${categoryInfo}`,
            status: 'pending',
            canPublish: !!img.metadata?.description && !!img.metadata?.author,
            preview
          });
        });
      }

      setActions(publishActions);
      setLoading(false);
    };

    buildActions();
  }, [eventDetails, newImages, allCategories, people, organizations]);

  const handlePublish = async (actionId: string) => {
    const action = actions.find(a => a.id === actionId);
    if (!action) return;

    setActions(prev =>
      prev.map(a =>
        a.id === actionId
          ? { ...a, status: 'in-progress' as ActionStatus }
          : a
      )
    );

    try {
      // Implement actual publish logic based on action type
      if (action.type === 'category') {
        await publishCategory(action);
      } else if (action.type === 'wikidata') {
        await publishWikidata(action);
      } else if (action.type === 'image') {
        await publishImage(action);
      } else if (action.type === 'metadata') {
        await publishMetadataUpdate(action);
      }

      // Store the created entity ID if applicable (for dependent actions)
      let createdEntityId: string | undefined;
      if (action.type === 'wikidata' && action.id.startsWith('wikidata-person-')) {
        // Extract QID from result if person was created
        // For now, we'll need to get this from the createPersonEntity response
        // TODO: Return the QID from createPersonEntity
      }

      // Remove completed actions from list and increment counter
      setActions(prev => {
        // Enable any actions that depended on this one
        return prev
          .filter(a => a.id !== actionId)
          .map(a => {
            if (a.dependsOn === actionId) {
              return { ...a, canPublish: true };
            }
            return a;
          });
      });
      setCompletedCount(prev => prev + 1);
    } catch (error) {
      // Keep action in list but mark as error
      setActions(prev =>
        prev.map(a =>
          a.id === actionId
            ? {
                ...a,
                status: 'error' as ActionStatus,
                error: error instanceof Error ? error.message : 'Unknown error'
              }
            : a
        )
      );
      setErrorCount(prev => prev + 1);
    }
  };

  const publishCategory = async (action: PublishAction) => {
    // Extract category info from the action
    const categoryName = action.title.replace('Create Category: ', '');

    // Get the full category details (including band category hierarchy)
    let categoriesToCreate = getCategoriesToCreate(eventDetails);

    // Add band category structures
    const year = eventDetails.date ? new Date(eventDetails.date).getFullYear().toString() : '';
    const eventName = eventDetails.commonsCategory || (year ? `${eventDetails.title} ${year}` : eventDetails.title);

    if (eventName && year && organizations.length > 0) {
      const bands = organizations
        .filter((org: any) => org.id && !org.id.startsWith('pending-'))
        .map((org: any) => ({
          name: org.labels?.en?.value,
          qid: org.id
        }))
        .filter((b: any) => b.name);

      if (bands.length > 0) {
        const bandStructures = await getAllBandCategoryStructures(bands, year, eventName);
        const bandCategories = flattenBandCategories(bandStructures);
        categoriesToCreate = [...categoriesToCreate, ...bandCategories];
      }
    }

    const categoryInfo = categoriesToCreate.find(cat => cat.categoryName === categoryName);

    if (!categoryInfo) {
      throw new Error('Category information not found');
    }

    // Call the Commons API to create the category
    const response = await fetch('/api/commons/create-category', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        categoryName: categoryInfo.categoryName,
        parentCategory: categoryInfo.parentCategory,
        description: categoryInfo.description,
        teamName: categoryInfo.teamName,
        additionalParents: categoryInfo.additionalParents
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to create category');
    }

    const result = await response.json();
    if (!result.success && !result.exists) {
      throw new Error(result.message || 'Failed to create category');
    }

    // Invalidate cache for this category
    lookupCache.invalidate(CacheType.COMMONS_CATEGORY_EXISTS, `Category:${categoryInfo.categoryName}`);
    console.log('🗑️ Invalidated cache for category:', categoryInfo.categoryName);
  };

  const publishWikidata = async (action: PublishAction) => {
    // Check if this is creating an entity or adding a claim
    const isClaimAddition = action.id.startsWith('wikidata-claim-');
    const isPersonCreation = action.id.startsWith('wikidata-person-');

    if (isClaimAddition) {
      // Handle adding claim to existing entity
      await addClaimToEntity(action);
      return;
    }

    if (isPersonCreation) {
      // Handle manually created person
      await createPersonEntity(action);
      return;
    }

    // Handle entity creation
    const entityName = action.title.replace('Create Wikidata: ', '');

    // Get the full entity details
    const wikidataEntities = await getWikidataEntitiesToCreate(eventDetails);
    const entityInfo = wikidataEntities.find(e => e.entityName === entityName);

    if (!entityInfo) {
      throw new Error('Entity information not found');
    }

    // Check if entity already exists (might have been created elsewhere)
    if (entityInfo.exists && entityInfo.wikidataId) {
      throw new Error(`Entity already exists: ${entityInfo.wikidataId}`);
    }

    // Build the Wikidata entity data
    const entityData: any = {
      labels: {
        en: { language: 'en', value: entityInfo.entityName }
      },
      descriptions: {
        en: { language: 'en', value: entityInfo.description || '' }
      },
      claims: []
    };

    // Add P31 (instance of) claims
    if (entityInfo.instanceOf && entityInfo.instanceOf.length > 0) {
      entityInfo.instanceOf.forEach(qid => {
        entityData.claims.push({
          mainsnak: {
            snaktype: 'value',
            property: 'P31',
            datavalue: {
              value: { 'entity-type': 'item', 'numeric-id': parseInt(qid.replace('Q', '')) },
              type: 'wikibase-entityid'
            }
          },
          type: 'statement',
          rank: 'normal'
        });
      });
    }

    // Add additional claims (like P361 for part of)
    if (entityInfo.claims) {
      Object.entries(entityInfo.claims).forEach(([property, value]) => {
        if (value) {
          entityData.claims.push({
            mainsnak: {
              snaktype: 'value',
              property,
              datavalue: {
                value: { 'entity-type': 'item', 'numeric-id': parseInt((value as string).replace('Q', '')) },
                type: 'wikibase-entityid'
              }
            },
            type: 'statement',
            rank: 'normal'
          });
        }
      });
    }

    // Call the Wikidata creation API
    const response = await fetch('/api/wikidata/create-entity', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ entityData })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to create Wikidata entity');
    }

    const result = await response.json();
    if (!result.success) {
      throw new Error(result.message || 'Failed to create Wikidata entity');
    }

    return result;
  };

  const publishImage = async (action: PublishAction) => {
    // Extract image index from action ID
    const imageIndex = parseInt(action.id.replace('image-', ''));
    const imageData = newImages[imageIndex];

    if (!imageData || !imageData.file) {
      throw new Error('Image file not found');
    }

    // Use suggested filename or fall back to original
    const filename = imageData.metadata?.suggestedFilename || imageData.file.name;
    const wikitext = imageData.metadata?.wikitext || '';

    // Upload via API
    const formData = new FormData();
    formData.append('file', imageData.file);
    formData.append('filename', filename);
    formData.append('text', wikitext);
    formData.append('comment', `Uploaded via WikiPortraits uploader`);

    const response = await fetch('/api/commons/upload', {
      method: 'POST',
      body: formData
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to upload image');
    }

    const result = await response.json();
    if (!result.success) {
      throw new Error(result.message || 'Failed to upload image');
    }

    // If image should be set as main image (P18), add that claim
    if (imageData.metadata?.setAsMainImage) {
      const org = organizations.find((o: any) => o.id);
      if (org?.id) {
        try {
          // Add P18 claim to the band's Wikidata entry
          const p18Response = await fetch('/api/wikidata/create-claim', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              entityId: org.id,
              propertyId: 'P18',
              value: filename // Commons filename (without "File:" prefix)
            })
          });

          if (!p18Response.ok) {
            console.error('Failed to add P18 claim:', await p18Response.text());
            // Don't fail the upload if P18 addition fails
          } else {
            console.log(`✅ Added P18 (main image) to ${org.id}`);
          }
        } catch (error) {
          console.error('Error adding P18 claim:', error);
          // Don't fail the upload
        }
      }
    }

    return result;
  };

  const publishMetadataUpdate = async (action: PublishAction) => {
    // TODO: Implement metadata update for existing images
    throw new Error('Metadata update not yet implemented');
  };

  const createPersonEntity = async (action: PublishAction) => {
    // Extract person ID from action
    const personId = action.id.replace('wikidata-person-', '');
    const person = people.find((p: any) => p.id === personId);

    if (!person) {
      throw new Error('Person not found');
    }

    // Use the existing create-entity endpoint with the old format
    // This ensures it goes through createBandMemberEntity which has the correct structure
    const personEntity = {
      id: person.id,
      name: person.labels?.en?.value || 'Unnamed',
      type: 'band_member',
      status: 'pending',
      new: true,
      description: person.descriptions?.en?.value || 'musician',
      data: person.metadata || {}
    };

    console.log('Creating person entity:', personEntity);

    const response = await fetch('/api/wikidata/create-entity', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        entity: personEntity,
        accessToken: undefined // Will use session token
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Person creation error:', errorText);
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

    return result;
  };

  const addClaimToEntity = async (action: PublishAction) => {
    // Parse the action ID to get entity ID and property
    // Formats:
    // - wikidata-claim-{entityId}-{property} (standard)
    // - wikidata-claim-{entityId}-{property}-for-{personName} (band member link)
    const parts = action.id.split('-');
    const entityId = parts[2]; // The Wikidata QID
    const property = parts[3]; // The property like P527, P373

    // Check if this is a band member link (has 'for' in the ID)
    const forIndex = parts.indexOf('for');
    if (forIndex > 0) {
      // This is linking a person to a band via P527
      const personName = parts.slice(forIndex + 1).join('-').replace(/_/g, ' ');
      const person = people.find((p: any) =>
        p.labels?.en?.value === personName
      );

      if (!person) {
        throw new Error('Person not found');
      }

      // Check if person exists on Wikidata to get their QID
      const { checkEntityExists } = await import('@/utils/wikidata');
      const personCheck = await checkEntityExists(personName, ['Q5'], 'en');

      if (!personCheck.exists || !personCheck.entity?.id) {
        throw new Error('Person needs to be created first. Please create the person entity before linking to band.');
      }

      // Call the API to add P527 to the band pointing to the person
      const response = await fetch('/api/wikidata/create-claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entityId,
          propertyId: property,
          value: personCheck.entity.id // The person's QID
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to add claim');
      }

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.message || 'Failed to add claim');
      }

      return;
    }

    // Standard claim addition - handle different property types
    let claimValue;

    if (property === 'P373') {
      // Commons category claim - get disambiguated band category name
      const org = organizations.find((o: any) => o.id === entityId);
      const bandName = org?.labels?.en?.value;
      if (!bandName) {
        throw new Error('Band name not found for P373 claim');
      }

      // Check if disambiguation is needed
      const { checkNeedsDisambiguation } = await import('@/utils/band-categories');
      const disambigCheck = await checkNeedsDisambiguation(bandName, entityId);
      claimValue = disambigCheck.suggestedName;
    } else if (property === 'P710') {
      // Participant claim - get band QID from organizations
      const bandQid = parts[2]; // Entity ID is the event, but we need to find the band

      // The action description contains the band name - extract it
      const bandName = action.description.replace('Participant: ', '');
      const org = organizations.find((o: any) => o.labels?.en?.value === bandName);

      if (!org?.id) {
        throw new Error('Band QID not found for P710 claim');
      }

      claimValue = org.id;
    } else {
      // Other claims - get from wikidataEntities (with P710 check)
      const wikidataEntities = await getWikidataEntitiesToCreate(eventDetails);

      // Re-check for P710 claims like we do when building actions
      const eventEdition = wikidataEntities.find(e => e.entityType === 'festival-edition' && e.exists);
      if (eventEdition?.wikidataId && organizations.length > 0) {
        const { getWikidataEntity } = await import('@/utils/wikidata');
        const editionEntity = await getWikidataEntity(eventEdition.wikidataId, 'en', 'claims');
        const existingParticipants = editionEntity.claims?.P710?.map((claim: any) =>
          claim.mainsnak?.datavalue?.value?.id
        ) || [];

        for (const org of organizations) {
          if (org.id && !org.id.startsWith('pending-') && !existingParticipants.includes(org.id)) {
            const eventEntityInList = wikidataEntities.find(e => e.wikidataId === eventEdition.wikidataId);
            if (eventEntityInList) {
              if (!eventEntityInList.missingClaims) eventEntityInList.missingClaims = [];
              eventEntityInList.missingClaims.push({
                property: 'P710',
                value: org.id,
                description: `Participant: ${org.labels?.en?.value}`
              });
            }
          }
        }
      }

      const entityInfo = wikidataEntities.find(e => e.wikidataId === entityId);

      if (!entityInfo || !entityInfo.missingClaims) {
        throw new Error('Entity or claim information not found');
      }

      const claimInfo = entityInfo.missingClaims.find(c => c.property === property);
      if (!claimInfo) {
        throw new Error('Claim information not found');
      }

      claimValue = claimInfo.value;
    }

    // Call the API to add the claim
    const response = await fetch('/api/wikidata/create-claim', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        entityId,
        propertyId: property,
        value: claimValue
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to add claim');
    }

    const result = await response.json();
    if (!result.success) {
      throw new Error(result.message || 'Failed to add claim');
    }

    // Invalidate Wikidata cache for this entity so next check gets fresh data
    lookupCache.invalidate(CacheType.WIKIDATA_ENTITY, `${entityId}:en:claims|labels`);
    lookupCache.invalidate(CacheType.WIKIDATA_ENTITY, `${entityId}:en:labels|descriptions|claims`);
    console.log('🗑️ Invalidated Wikidata cache for entity:', entityId);
  };

  const handlePublishAll = async () => {
    // Process actions sequentially, checking for newly enabled actions after each
    let remainingActions = actions.filter(a => a.status === 'pending');

    while (remainingActions.some(a => a.canPublish)) {
      const nextAction = remainingActions.find(a => a.canPublish);
      if (!nextAction) break;

      await handlePublish(nextAction.id);

      // Wait a bit for state to update
      await new Promise(resolve => setTimeout(resolve, 100));

      // Refresh remaining actions list
      remainingActions = remainingActions.filter(a => a.id !== nextAction.id);
    }
  };

  const getActionIcon = (type: PublishAction['type']) => {
    switch (type) {
      case 'category':
        return FolderPlus;
      case 'template':
        return FileText;
      case 'wikidata':
        return Database;
      case 'image':
        return ImagePlus;
      case 'metadata':
        return FileText;
    }
  };

  const getStatusIcon = (status: ActionStatus) => {
    switch (status) {
      case 'pending':
        return Clock;
      case 'in-progress':
        return Loader2;
      case 'completed':
        return CheckCircle;
      case 'error':
        return AlertCircle;
    }
  };

  const getStatusColor = (status: ActionStatus) => {
    switch (status) {
      case 'pending':
        return 'text-gray-500';
      case 'in-progress':
        return 'text-blue-500 animate-spin';
      case 'completed':
        return 'text-green-500';
      case 'error':
        return 'text-red-500';
    }
  };

  const pendingCount = actions.filter(a => a.status === 'pending' && a.canPublish).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
        <span className="ml-3 text-gray-600">Preparing publish actions...</span>
      </div>
    );
  }

  if (actions.length === 0) {
    return (
      <div className="text-center py-12">
        <CheckCircle className="w-16 h-16 mx-auto mb-4 text-green-500" />
        <h3 className="text-xl font-semibold text-gray-900 mb-2">Nothing to Publish</h3>
        <p className="text-gray-500">
          All categories, templates, and Wikidata entities already exist. No new images to upload.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <Upload className="w-12 h-12 mx-auto mb-4 text-primary" />
        <h2 className="text-2xl font-bold text-card-foreground mb-2">Publish to Commons</h2>
        <p className="text-muted-foreground">
          Review and publish all changes
        </p>
      </div>

      {/* Summary */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-gray-900">Publish Summary</h3>
            <div className="text-sm text-gray-600 mt-1">
              {pendingCount} pending • {completedCount} completed • {errorCount} errors
            </div>
          </div>
          {pendingCount > 0 && (
            <button
              onClick={handlePublishAll}
              className="px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium"
            >
              Publish All ({pendingCount})
            </button>
          )}
        </div>
      </div>

      {/* Actions List */}
      <div className="space-y-3">
        {actions.map((action) => {
          const ActionIcon = getActionIcon(action.type);
          const StatusIcon = getStatusIcon(action.status);
          const statusColor = getStatusColor(action.status);

          return (
            <div
              key={action.id}
              className={`bg-card border rounded-lg p-4 ${
                action.status === 'completed'
                  ? 'border-green-200 bg-green-50'
                  : action.status === 'error'
                  ? 'border-red-200 bg-red-50'
                  : action.status === 'in-progress'
                  ? 'border-blue-200 bg-blue-50'
                  : !action.canPublish && action.dependsOn
                  ? 'border-gray-300 bg-gray-100 opacity-60'
                  : 'border-gray-200'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3 flex-1">
                  {/* Show thumbnail for images */}
                  {action.type === 'image' && action.preview ? (
                    <img
                      src={action.preview}
                      alt="Preview"
                      className="w-16 h-16 object-cover rounded flex-shrink-0"
                    />
                  ) : (
                    <ActionIcon className="w-5 h-5 text-gray-600 flex-shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-gray-900">{action.title}</h4>
                    <p className="text-sm text-gray-600 mt-1">{action.description}</p>
                    {action.dependsOn && !action.canPublish && (
                      <p className="text-xs text-gray-500 mt-2">
                        ⏳ Waiting for prerequisite to complete first
                      </p>
                    )}
                    {action.error && (
                      <p className="text-sm text-red-600 mt-2">Error: {action.error}</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3 ml-4">
                  <StatusIcon className={`w-5 h-5 ${statusColor} flex-shrink-0`} />
                  {action.status === 'pending' && action.canPublish && (
                    <button
                      onClick={() => handlePublish(action.id)}
                      className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors text-sm font-medium"
                    >
                      Publish
                    </button>
                  )}
                  {action.status === 'pending' && !action.canPublish && (
                    <span className="text-sm text-gray-500">
                      {action.dependsOn ? 'Waiting...' : 'Not ready'}
                    </span>
                  )}
                  {action.status === 'completed' && (
                    <span className="text-sm text-green-600 font-medium">Done</span>
                  )}
                  {action.status === 'in-progress' && (
                    <span className="text-sm text-blue-600 font-medium">Publishing...</span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Complete Button */}
      {completedCount === actions.length && actions.length > 0 && (
        <div className="text-center">
          <button
            onClick={onComplete}
            className="px-8 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium text-lg"
          >
            All Published - Continue
          </button>
        </div>
      )}
    </div>
  );
}
