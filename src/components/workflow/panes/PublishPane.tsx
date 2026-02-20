'use client';

import { useState, useEffect } from 'react';
import { Upload, CheckCircle, AlertCircle, Clock, Loader2, FolderPlus, FileText, Database, ImagePlus } from 'lucide-react';
import { logger } from '@/utils/logger';
import { useUniversalForm } from '@/providers/UniversalFormProvider';
import { usePublishData, PublishAction as CentralizedPublishAction, ActionStatus } from '@/providers/PublishDataProvider';
import { lookupCache, CacheType } from '@/utils/lookup-cache';
import { getCategoriesToCreate } from '@/utils/music-categories';
import { getAllBandCategoryStructures, flattenBandCategories } from '@/utils/band-categories';
import { getWikidataEntitiesToCreate } from '@/utils/wikidata-entities';

interface PublishPaneProps {
  onComplete?: () => void;
}

// Legacy interface for backward compatibility
interface PublishAction {
  id: string;
  type: 'category' | 'template' | 'wikidata' | 'image' | 'metadata' | 'structured-data';
  title: string;
  description: string;
  status: ActionStatus;
  error?: string;
  canPublish: boolean;
  dependsOn?: string;
  createdEntityId?: string;
  preview?: string;
}

export default function PublishPane({ onComplete }: PublishPaneProps) {
  const form = useUniversalForm();
  const {
    actions: centralizedActions,
    categories,
    wikidataActions,
    imageActions,
    structuredDataActions,
    totalActions,
    pendingActions,
    completedActions,
    errorActions,
    updateActionStatus,
    updateStructuredDataPageId,
    reloadImageFromCommons
  } = usePublishData();

  const [loading, setLoading] = useState(false);
  const [actions, setActions] = useState<PublishAction[]>([]);
  const [localCompletedCount, setLocalCompletedCount] = useState(0);
  const [localErrorCount, setLocalErrorCount] = useState(0);

  const people = form.watch('entities.people') || [];
  const organizations = form.watch('entities.organizations') || [];
  const eventDetails = form.watch('eventDetails');

  // Convert centralized actions to legacy format for display
  useEffect(() => {
    const publishActions: PublishAction[] = [];

    // Convert category actions
    categories.forEach(cat => {
      if (cat.shouldCreate) {
        publishActions.push({
          id: `category-${cat.categoryName}`,
          type: 'category',
          title: `Create Category: ${cat.categoryName}`,
          description: cat.description || 'Category on Wikimedia Commons',
          status: cat.status,
          error: cat.error,
          canPublish: !cat.exists
        });
      }
    });

    // Convert wikidata actions
    wikidataActions.forEach(wd => {
      publishActions.push({
        id: `wikidata-${wd.entityId}`,
        type: 'wikidata',
        title: wd.action === 'create' ? `Create ${wd.entityType}: ${wd.entityLabel}` : `Update ${wd.entityLabel}`,
        description: wd.changes?.map(c => `${c.property}: ${c.newValue}`).join(', ') || 'Wikidata update',
        status: wd.status,
        error: wd.error,
        canPublish: true,
        createdEntityId: wd.entityId.startsWith('new') ? undefined : wd.entityId
      });
    });

    // Convert image actions
    imageActions.forEach(img => {
      publishActions.push({
        id: `image-${img.imageId}`,
        type: 'image',
        title: img.action === 'upload' ? `Upload: ${img.filename}` : `Update: ${img.filename}`,
        description: img.metadata?.description || 'Image file',
        status: img.status,
        error: img.error,
        canPublish: true,
        preview: img.thumbnail
      });
    });

    // Convert structured data actions (skip completed ones)
    structuredDataActions.forEach(sd => {
      const needsUpdateProps = sd.properties.filter(p => p.needsUpdate);
      if (needsUpdateProps.length > 0 && sd.status !== 'completed') {
        // Find the image (could be in new images or existing images)
        const newImage = form.watch('files.queue')?.find((img: any) => img.id === sd.imageId);
        const existingImage = form.watch('files.existing')?.find((img: any) => img.id === sd.imageId);
        const image = newImage || existingImage;

        // Build a more descriptive property list with actual names
        const propDescriptions: string[] = [];

        needsUpdateProps.forEach(p => {
          if (p.property === 'labels') {
            const captions = Array.isArray(p.value) ? p.value : [];
            propDescriptions.push(`captions in ${captions.length} language${captions.length !== 1 ? 's' : ''}`);
          } else if (p.property === 'P180') {
            const depicts = Array.isArray(p.value) ? p.value : [];
            // Get the actual entity names from people and organizations
            const entityNames: string[] = [];
            depicts.forEach((qid: string) => {
              const person = people.find((p: any) => p.id === qid);
              const org = organizations.find((o: any) => o.id === qid);
              if (person) {
                entityNames.push(person.labels?.en?.value || qid);
              } else if (org) {
                entityNames.push(org.labels?.en?.value || qid);
              } else {
                entityNames.push(qid);
              }
            });
            if (entityNames.length > 0) {
              propDescriptions.push(`depicts: ${entityNames.join(', ')}`);
            }
          } else if (p.property === 'P571') {
            propDescriptions.push('date taken');
          } else if (p.property === 'P1259') {
            propDescriptions.push('GPS coordinates');
          } else {
            propDescriptions.push(p.property);
          }
        });

        const imageAny = image as any;
        const filename = imageAny?.filename || imageAny?.metadata?.suggestedFilename || imageAny?.file?.name || 'Unknown';

        publishActions.push({
          id: `sdc-${sd.imageId}`,
          type: 'structured-data',
          title: `Add structured data: ${filename}`,
          description: propDescriptions.join(', '),
          status: sd.status,
          error: sd.error,
          canPublish: true,
          preview: imageAny?.preview || imageAny?.url
        });
      }
    });

    setActions(publishActions);
    setLocalCompletedCount(completedActions);
    setLocalErrorCount(errorActions);
  }, [centralizedActions, categories, wikidataActions, imageActions, structuredDataActions, completedActions, errorActions, people, organizations, form]);

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
        await handleImageAction(action);
      } else if (action.type === 'metadata') {
        await publishMetadataUpdate(action);
      } else if (action.type === 'structured-data') {
        await publishStructuredData(action);
      }

      // Store the created entity ID if applicable (for dependent actions)
      let createdEntityId: string | undefined;
      if (action.type === 'wikidata' && action.id.startsWith('wikidata-person-')) {
        // Extract QID from result if person was created
        // For now, we'll need to get this from the createPersonEntity response
        // See GitHub issue #5
      }

      // Update centralized action status (this also updates the original state ref)
      updateActionStatus(actionId, 'completed');

      // Small delay to ensure state updates propagate
      await new Promise(resolve => setTimeout(resolve, 50));

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
      setLocalCompletedCount(prev => prev + 1);
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
      setLocalErrorCount(prev => prev + 1);
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

    // Add performer categories
    if (people && people.length > 0) {
      const { getPerformerCategories } = await import('@/utils/performer-categories');
      const performerCategoryInfos = await getPerformerCategories(people);

      for (const info of performerCategoryInfos) {
        if (info.needsCreation) {
          categoriesToCreate.push({
            categoryName: info.commonsCategory,
            shouldCreate: true,
            description: info.description,
            eventName: info.performerName
          });
        }
      }
    }

    const categoryInfo = categoriesToCreate.find(cat => cat.categoryName === categoryName);

    if (!categoryInfo) {
      throw new Error(`Category information not found for: ${categoryName}`);
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
    logger.debug('PublishPane', 'Invalidated cache for category', categoryInfo.categoryName);
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
    // Extract image ID from action ID
    const imageId = action.id.replace('image-', '');

    // Find image in either new images or existing images
    const newImages = form.watch('files.queue') || [];
    const existingImagesArr = form.watch('files.existing') || [];
    const imageData = [...newImages, ...existingImagesArr].find((img: any) => img.id === imageId) as any;

    if (!imageData) {
      throw new Error('Image not found');
    }

    const wikitext = imageData.metadata?.wikitext || '';

    // Check if this is an existing image (update) or new image (upload)
    if (imageData.isExisting) {
      // Update existing Commons file page
      const filename = imageData.filename;

      const response = await fetch('/api/commons/edit-page', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename: filename,
          wikitext: wikitext,
          summary: 'Updated file description and metadata via WikiPortraits'
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update image');
      }

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || 'Failed to update image');
      }

      // Use existing page ID
      const pageId = imageData.commonsPageId;

      return { pageId, isUpdate: true };
    } else {
      // Upload new image
      if (!imageData.file) {
        throw new Error('Image file not found for upload');
      }

      const filename = imageData.metadata?.suggestedFilename || imageData.file.name;

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

      // Get the page ID from the upload result
      const pageId = result.pageId || result.data?.imageinfo?.pageid;

      logger.info('PublishPane', 'Upload completed', { pageId, result });

      return { pageId, isUpdate: false };
    }
  };

  const handleImageAction = async (action: PublishAction) => {
    const { pageId, isUpdate } = await publishImage(action);

    // Extract image ID from action ID
    const imageId = action.id.replace('image-', '');
    const newImagesForAction = form.watch('files.queue') || [];
    const existingImagesForAction = form.watch('files.existing') || [];
    const imageData = [...newImagesForAction, ...existingImagesForAction].find((img: any) => img.id === imageId) as any;

    // If this was a new upload, update any structured data actions with the pageId
    if (!isUpdate && pageId) {
      updateActionStatus(action.id, 'completed');

      // Find and update structured data actions for this image
      const sdActionsForImage = structuredDataActions.filter(sd => sd.imageId === imageId);

      if (sdActionsForImage.length > 0) {
        logger.debug('PublishPane', `Updating structured data actions for image ${imageId} with pageId`, pageId);
        logger.debug('PublishPane', 'Current structured data actions', sdActionsForImage);

        // Update the pageId in the centralized state
        updateStructuredDataPageId(imageId, pageId);

        // Enable the structured data action now that we have a pageId
        setActions(prev => prev.map(a =>
          a.id === `sdc-${imageId}` ? { ...a, canPublish: true } : a
        ));

        logger.debug('PublishPane', `Updated ${sdActionsForImage.length} structured data actions with pageId`, pageId);
      } else {
        logger.warn('PublishPane', `No structured data actions found for image ${imageId}`);
      }
    }

    // Depicts are now handled by the structured data action
    // No need to update them here separately

    // If image should be set as main image (P18), add that claim
    if (imageData?.metadata?.setAsMainImage) {
      const org = organizations.find((o: any) => o.id);
      if (org?.id) {
        try {
          // Determine the Commons filename (without "File:" prefix)
          const commonsFilename = imageData?.filename || imageData?.metadata?.suggestedFilename || imageData?.file?.name || '';
          // Add P18 claim to the band's Wikidata entry
          const p18Response = await fetch('/api/wikidata/create-claim', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              entityId: org.id,
              propertyId: 'P18',
              value: commonsFilename // Commons filename (without "File:" prefix)
            })
          });

          if (!p18Response.ok) {
            logger.error('PublishPane', 'Failed to add P18 claim', await p18Response.text());
            // Don't fail the upload if P18 addition fails
          } else {
            logger.info('PublishPane', `Added P18 (main image) to ${org.id}`);
          }
        } catch (error) {
          logger.error('PublishPane', 'Error adding P18 claim', error);
          // Don't fail the upload
        }
      }
    }
  };

  const publishMetadataUpdate = async (action: PublishAction) => {
    // Extract image ID from action
    const imageId = action.id.replace('metadata-', '');
    const existingImagesForMeta = form.watch('files.existing') || [];
    // Cast to any because metadata may have additional runtime properties (wikitext, etc.)
    const img = existingImagesForMeta.find((i: any) => i.id === imageId) as any;

    if (!img) {
      throw new Error('Image not found for metadata update');
    }

    logger.debug('PublishPane', 'Updating metadata for', img.filename);

    // Get updated wikitext from image metadata
    const updatedWikitext = img.metadata?.wikitext;

    if (!updatedWikitext) {
      throw new Error('No wikitext available for update');
    }

    // Update the Commons file page via API
    const response = await fetch('/api/commons/edit-page', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        filename: img.filename,
        wikitext: updatedWikitext,
        summary: 'Updated categories and metadata via WikiPortraits'
      })
    });

    const result = await response.json();

    if (!result.success) {
      throw new Error(result.error || 'Failed to update page');
    }

    logger.info('PublishPane', 'Page content updated for', img.filename);

    // Depicts are now handled by the structured data action
    // No need to update them here separately

    logger.info('PublishPane', 'Metadata update completed for', img.filename);

    // Reload image from Commons to update originalState
    await reloadImageFromCommons(img.id);
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
      data: (person as any).metadata || {}
    };

    logger.info('PublishPane', 'Creating person entity', personEntity);

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
      logger.error('PublishPane', 'Person creation error', errorText);
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
      // Commons category claim - could be for band or performer
      const org = organizations.find((o: any) => o.id === entityId);
      const person = people.find((p: any) => p.id === entityId);

      if (org) {
        // Band/organization category
        const bandName = org.labels?.en?.value;
        if (!bandName) {
          throw new Error('Band name not found for P373 claim');
        }

        // Check if disambiguation is needed
        const { checkNeedsDisambiguation } = await import('@/utils/band-categories');
        const disambigCheck = await checkNeedsDisambiguation(bandName, entityId);
        claimValue = disambigCheck.suggestedName;
      } else if (person) {
        // Performer category
        const { getPerformerCategory } = await import('@/utils/performer-categories');
        const performerInfo = await getPerformerCategory(person);
        claimValue = performerInfo.commonsCategory;
        logger.info('PublishPane', 'Publishing P373 for performer', { name: person.labels?.en?.value, value: claimValue });
      } else {
        throw new Error('Entity not found for P373 claim');
      }
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
    logger.debug('PublishPane', 'Invalidated Wikidata cache for entity', entityId);
  };

  const publishStructuredData = async (action: PublishAction) => {
    // Extract structured data action info
    const sdActionId = action.id.replace('sdc-', '');
    const sdAction = structuredDataActions.find(sd => sd.imageId === sdActionId);

    logger.debug('PublishPane', 'Looking for structured data action with imageId', sdActionId);
    logger.debug('PublishPane', 'All structured data actions', structuredDataActions.map(sd => ({ imageId: sd.imageId, pageId: sd.commonsPageId })));
    logger.debug('PublishPane', 'Found action', sdAction);

    if (!sdAction) {
      throw new Error('Structured data action not found');
    }

    if (!sdAction.commonsPageId || sdAction.commonsPageId === 0) {
      logger.error('PublishPane', 'PageId is missing or 0. Action details', sdAction);
      throw new Error('Image must be uploaded before adding structured data. pageId is missing.');
    }

    logger.info('PublishPane', 'Publishing structured data for image', { imageId: sdAction.imageId, pageId: sdAction.commonsPageId });

    // Process each property that needs updating
    for (const prop of sdAction.properties.filter(p => p.needsUpdate)) {
      if (prop.property === 'labels') {
        // Update captions
        const captions = Array.isArray(prop.value) ? prop.value : [];
        logger.debug('PublishPane', 'Updating captions', captions);

        const response = await fetch('/api/commons/update-captions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            pageId: sdAction.commonsPageId,
            captions
          })
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Failed to update captions');
        }

        const result = await response.json();
        if (!result.success) {
          throw new Error(result.message || 'Failed to update captions');
        }

        logger.info('PublishPane', 'Updated captions for page ID', sdAction.commonsPageId);
      } else if (prop.property === 'P180') {
        // Update depicts
        const depicts = Array.isArray(prop.value) ? prop.value : [];
        logger.debug('PublishPane', 'Updating depicts', depicts);

        const depictsList = depicts.map(qid => ({
          qid,
          label: qid // We'd need to fetch the label, but for now use QID
        }));

        const response = await fetch('/api/commons/update-depicts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            pageId: sdAction.commonsPageId,
            depicts: depictsList
          })
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Failed to update depicts');
        }

        const result = await response.json();
        if (!result.success) {
          throw new Error(result.message || 'Failed to update depicts');
        }

        logger.info('PublishPane', 'Updated depicts for page ID', sdAction.commonsPageId);
      }
    }

    logger.info('PublishPane', 'Structured data publish completed for', sdAction.imageId);

    // Reload image from Commons to update originalState
    await reloadImageFromCommons(sdAction.imageId);
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
      case 'structured-data':
        return Database;
      default:
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
      case 'ready':
        return CheckCircle;
      case 'skipped':
        return CheckCircle;
      default:
        return Clock;
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
      case 'ready':
        return 'text-blue-500';
      case 'skipped':
        return 'text-gray-400';
      default:
        return 'text-gray-500';
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
              {pendingCount} pending • {localCompletedCount} completed • {localErrorCount} errors
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
                  {/* Show thumbnail for images and structured data (which is image-related) */}
                  {(action.type === 'image' || action.type === 'structured-data') && action.preview ? (
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
      {localCompletedCount === actions.length && actions.length > 0 && (
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
