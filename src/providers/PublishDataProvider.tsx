/**
 * PublishDataProvider
 * Centralized management of all publish-ready data
 * Tracks what needs to be created, updated, or is already done
 */

'use client';

import { createContext, useContext, ReactNode, useEffect, useState, useMemo, useRef } from 'react';
import { useUniversalForm } from '@/providers/UniversalFormProvider';
import { generateMusicCategories, getCategoriesToCreate as getMusicCategoriesToCreate } from '@/utils/music-categories';
import { getAllCategoriesFromImages } from '@/utils/category-extractor';
import { getAllBandCategoryStructures, flattenBandCategories } from '@/utils/band-categories';
import { CommonsClient } from '@/lib/api/CommonsClient';

export type ActionStatus = 'pending' | 'ready' | 'in-progress' | 'completed' | 'error' | 'skipped';

export interface CategoryAction {
  type: 'category';
  categoryName: string;
  status: ActionStatus;
  exists: boolean; // Already exists on Commons
  shouldCreate: boolean; // Needs to be created
  parentCategory?: string;
  additionalParents?: string[];
  description?: string;
  error?: string;
}

export interface WikidataAction {
  type: 'wikidata';
  entityId: string; // Q-ID or 'new' for new entities
  entityType: 'person' | 'organization' | 'event' | 'location';
  entityLabel: string;
  status: ActionStatus;
  action: 'create' | 'update' | 'link' | 'verify'; // What needs to be done
  changes?: {
    property: string;
    oldValue?: any;
    newValue: any;
  }[];
  error?: string;
}

export interface ImageAction {
  type: 'image';
  imageId: string;
  filename: string;
  status: ActionStatus;
  action: 'upload' | 'update-metadata' | 'add-depicts' | 'set-main-image';
  commonsPageId?: number; // If already on Commons
  thumbnail?: string; // Thumbnail URL for preview
  metadata?: {
    description?: string;
    categories?: string[];
    depicts?: string[]; // Q-IDs
    date?: string;
    location?: { latitude: number; longitude: number };
  };
  error?: string;
}

export interface StructuredDataAction {
  type: 'structured-data';
  imageId: string;
  commonsPageId: number;
  status: ActionStatus;
  properties: {
    property: string; // P180, P170, P571, etc.
    value: any;
    exists: boolean;
    needsUpdate: boolean;
  }[];
  error?: string;
}

export type PublishAction = CategoryAction | WikidataAction | ImageAction | StructuredDataAction;

interface PublishDataContextType {
  // All actions that need to be performed
  actions: PublishAction[];

  // Counts by status
  totalActions: number;
  pendingActions: number;
  completedActions: number;
  errorActions: number;

  // Category-specific
  categories: CategoryAction[];
  addCategory: (categoryName: string) => void;
  removeCategory: (categoryName: string) => void;

  // Wikidata-specific
  wikidataActions: WikidataAction[];

  // Image-specific
  imageActions: ImageAction[];

  // Structured data-specific
  structuredDataActions: StructuredDataAction[];
  updateStructuredDataPageId: (imageId: string, pageId: number) => void;

  // Update status of an action
  updateActionStatus: (actionId: string, status: ActionStatus, error?: string) => void;

  // Refresh all data
  refresh: () => void;

  // Reload image from Commons to update originalState
  reloadImageFromCommons: (imageId: string) => Promise<void>;

  // Loading state
  isCalculating: boolean;
}

const PublishDataContext = createContext<PublishDataContextType | undefined>(undefined);

export function PublishDataProvider({ children }: { children: ReactNode }) {
  const form = useUniversalForm();
  const { watch, setValue, getValues } = form;
  const [actions, setActions] = useState<PublishAction[]>([]);
  const [isCalculating, setIsCalculating] = useState(false);
  const calculatingRef = useRef(false);

  // Store original state of images when first loaded (keyed by image ID)
  const originalImageStateRef = useRef<Map<string, {
    wikitext: string;
    selectedBandMembers: string[];
    captions: any[];
  }>>(new Map());

  // Watch all dependencies
  const workflowType = watch('workflowType');
  const uploadType = workflowType === 'music-event' ? 'music' : 'general';
  const images = watch('files.queue') || [];
  const existingImages = watch('files.existing') || [];
  const eventDetails = watch('eventDetails');
  const organizations = watch('entities.organizations') || [];
  const people = watch('entities.people') || [];

  // Get main band
  const selectedBand = organizations.length > 0 ? organizations[0] : null;
  const selectedBandName = selectedBand?.entity?.labels?.en?.value ||
                          selectedBand?.labels?.en?.value ||
                          null;

  // Create stable dependency keys to prevent infinite loops
  const depsKey = useMemo(() => {
    return JSON.stringify({
      uploadType,
      eventTitle: eventDetails?.title,
      eventDate: eventDetails?.date,
      eventCategory: eventDetails?.commonsCategory,
      imagesCount: images.length,
      imagesMetadata: images.map((img: any) => ({
        id: img.id,
        setAsMainImage: img.metadata?.setAsMainImage,
        wikitextModified: img.metadata?.wikitextModified,
        selectedBandMembers: img.metadata?.selectedBandMembers?.join(',')
      })),
      existingImagesCount: existingImages.length,
      existingImagesMetadata: existingImages.map((img: any) => ({
        id: img.id,
        setAsMainImage: img.metadata?.setAsMainImage,
        wikitextModified: img.metadata?.wikitextModified,
        selectedBandMembers: img.metadata?.selectedBandMembers?.join(','),
        captions: img.metadata?.captions?.map((c: any) => `${c.language}:${c.text}`).join('|') || ''
      })),
      organizationsIds: organizations.map((o: any) => o.id).join(','),
      peopleIds: people.map((p: any) => p.id).join(','),
      selectedBandName
    });
  }, [uploadType, eventDetails?.title, eventDetails?.date, eventDetails?.commonsCategory, images, existingImages, organizations, people, selectedBandName]);

  // Calculate all actions whenever dependencies change
  useEffect(() => {
    // Prevent concurrent calculations
    if (calculatingRef.current) {
      return;
    }

    const calculateActions = async () => {
      calculatingRef.current = true;
      setIsCalculating(true);

      try {
        const newActions: PublishAction[] = [];

        // ==========================================
        // 1. CATEGORY ACTIONS
        // ==========================================
        const categorySet = new Set<string>();
        const categoriesToCreateList: any[] = [];

        // Get categories from images
        if (images && images.length > 0) {
          const imageFiles = images.map((imgData: any, index: number) => ({
            id: `image-${index}`,
            file: new File([], `image-${index}`),
            preview: '',
            metadata: {
              description: imgData.description,
              categories: imgData.categories,
              date: imgData.date,
              author: imgData.author,
              source: imgData.source,
              license: imgData.license,
            }
          }));
          const imgCategories = getAllCategoriesFromImages(imageFiles as any);
          imgCategories.forEach(cat => categorySet.add(cat));
        }

        // Get event categories
        if (uploadType === 'music' && eventDetails) {
          const year = eventDetails.date ? new Date(eventDetails.date).getFullYear().toString() : '';
          const eventName = eventDetails.commonsCategory || (year ? `${eventDetails.title} ${year}` : eventDetails.title);

          const eventCategories = generateMusicCategories(eventDetails as any);
          eventCategories.forEach(cat => categorySet.add(cat));

          if (selectedBandName && eventName) {
            categorySet.add(`${selectedBandName} at ${eventName}`);
          }

          categoriesToCreateList.push(...getMusicCategoriesToCreate(eventDetails as any));
        }

        // Get band categories
        const year = eventDetails?.date ? new Date(eventDetails.date).getFullYear().toString() : '';
        const eventName = eventDetails?.commonsCategory ||
                         (year ? `${eventDetails.title} ${year}` : eventDetails?.title);

        if (eventName && year && selectedBandName) {
          const bandStructures = await getAllBandCategoryStructures(
            [{ name: selectedBandName, qid: selectedBand?.id || '' }],
            year,
            eventName
          );
          const bandCategories = flattenBandCategories(bandStructures);
          categoriesToCreateList.push(...bandCategories);
          bandCategories.forEach(cat => categorySet.add(cat.categoryName));
        }

        // Get performer categories
        if (people && people.length > 0) {
          const { getPerformerCategories } = await import('@/utils/performer-categories');
          const performerCategoryInfos = await getPerformerCategories(people);
          performerCategoryInfos.forEach(info => {
            categorySet.add(info.commonsCategory);
            if (info.needsCreation) {
              categoriesToCreateList.push({
                categoryName: info.commonsCategory,
                shouldCreate: true,
                description: info.description,
              });
            }
          });
        }

        // Check which categories exist on Commons
        const categoryArray = Array.from(categorySet);
        const categoryExistenceChecks = await Promise.all(
          categoryArray.map(async (categoryName) => {
            try {
              const exists = await CommonsClient.categoryExists(categoryName);
              return { categoryName, exists };
            } catch {
              return { categoryName, exists: false };
            }
          })
        );

        // Create category actions
        categoryArray.forEach(categoryName => {
          const existenceCheck = categoryExistenceChecks.find(c => c.categoryName === categoryName);
          const exists = existenceCheck?.exists || false;
          const shouldCreate = categoriesToCreateList.some(c => c.categoryName === categoryName);

          const categoryAction: CategoryAction = {
            type: 'category',
            categoryName,
            status: exists ? 'completed' : shouldCreate ? 'pending' : 'ready',
            exists,
            shouldCreate: shouldCreate && !exists,
            parentCategory: categoriesToCreateList.find(c => c.categoryName === categoryName)?.parentCategory,
            additionalParents: categoriesToCreateList.find(c => c.categoryName === categoryName)?.additionalParents,
            description: categoriesToCreateList.find(c => c.categoryName === categoryName)?.description,
          };

          newActions.push(categoryAction);
        });

        // ==========================================
        // 2. WIKIDATA ACTIONS
        // ==========================================

        // Check if event needs to be created on Wikidata
        if (eventDetails?.title && !eventDetails?.wikidataId) {
          newActions.push({
            type: 'wikidata',
            entityId: 'new-event',
            entityType: 'event',
            entityLabel: eventDetails.title,
            status: 'pending',
            action: 'create',
            changes: [
              { property: 'P31', newValue: 'Q132241' }, // instance of: music festival
              { property: 'P585', newValue: eventDetails.date }, // point in time
            ]
          });
        }

        // Check people/performers for missing P373
        const { getWikidataEntity } = await import('@/utils/wikidata');
        for (const person of people) {
          if (person.id && !person.id.startsWith('pending-') && !person.isNew) {
            // Fetch fresh entity data to check for P373
            try {
              const freshPerson = await getWikidataEntity(person.id, 'en', 'labels|claims');
              const hasP373 = freshPerson.claims?.P373?.length > 0;

              if (!hasP373) {
                // This person needs P373 added
                const { getPerformerCategory } = await import('@/utils/performer-categories');
                const performerInfo = await getPerformerCategory(freshPerson);

                newActions.push({
                  type: 'wikidata',
                  entityId: person.id,
                  entityType: 'person',
                  entityLabel: person.labels?.en?.value || 'Unknown',
                  status: 'pending',
                  action: 'update',
                  changes: [{
                    property: 'P373',
                    newValue: performerInfo.commonsCategory,
                  }]
                });
              }
            } catch (error) {
              console.error('Error checking P373 for person', person.id, error);
            }
          }
        }

        // Check organizations for missing P373
        for (const org of organizations) {
          if (org.id && !org.id.startsWith('pending-') && !org.isNew) {
            // Fetch fresh entity data to check for P373
            try {
              const freshOrg = await getWikidataEntity(org.id, 'en', 'labels|claims');
              const hasP373 = freshOrg.claims?.P373?.length > 0;

              if (!hasP373) {
                const { checkNeedsDisambiguation } = await import('@/utils/band-categories');
                const disambigCheck = await checkNeedsDisambiguation(
                  org.labels?.en?.value || 'Unknown',
                  org.id
                );

                newActions.push({
                  type: 'wikidata',
                  entityId: org.id,
                  entityType: 'organization',
                  entityLabel: org.labels?.en?.value || 'Unknown',
                  status: 'pending',
                  action: 'update',
                  changes: [{
                    property: 'P373',
                    newValue: disambigCheck.suggestedName,
                  }]
                });
              }
            } catch (error) {
              console.error('Error checking P373 for organization', org.id, error);
            }
          }
        }

        // ==========================================
        // 3. IMAGE ACTIONS
        // ==========================================

        // New images to upload
        images.forEach((img: any) => {
          const depicts = [
            ...(selectedBand?.id ? [selectedBand.id] : []),
            ...(img.metadata?.selectedBandMembers || [])
          ];

          newActions.push({
            type: 'image',
            imageId: img.id,
            filename: img.metadata?.suggestedFilename || img.file?.name || 'Unknown',
            status: 'pending',
            action: 'upload',
            thumbnail: img.preview,
            metadata: {
              description: img.metadata?.description,
              categories: img.metadata?.categories || [],
              depicts,
              date: img.metadata?.date,
              location: img.metadata?.gps,
            }
          });

          // If this image is set as main image for the band, create Wikidata action
          if (img.metadata?.setAsMainImage && selectedBand?.id) {
            const bandName = selectedBand?.labels?.en?.value || selectedBand?.entity?.labels?.en?.value || 'Band';
            const filename = img.metadata?.suggestedFilename || img.file?.name || 'Unknown';

            newActions.push({
              type: 'wikidata',
              entityId: selectedBand.id,
              entityType: 'organization',
              entityLabel: bandName,
              status: 'pending',
              action: 'update',
              changes: [{
                property: 'P18',
                newValue: filename,
              }]
            });
          }

          // Structured data action for new upload
          const sdProperties = [
            { property: 'P180', value: depicts, exists: false, needsUpdate: depicts.length > 0 }, // depicts
            { property: 'P571', value: img.metadata?.date, exists: false, needsUpdate: !!img.metadata?.date }, // inception
            { property: 'P1259', value: img.metadata?.gps, exists: false, needsUpdate: !!img.metadata?.gps }, // coordinates
          ];

          // Add captions if present
          if (img.metadata?.captions && img.metadata.captions.length > 0) {
            sdProperties.push({
              property: 'labels',
              value: img.metadata.captions,
              exists: false,
              needsUpdate: true
            });
          }

          newActions.push({
            type: 'structured-data',
            imageId: img.id,
            commonsPageId: 0, // Will be set after upload
            status: 'pending',
            properties: sdProperties
          });
        });

        // Existing images to update
        existingImages.forEach((img: any) => {
          // Capture original state when image is first seen
          // NOTE: We need to capture the state from when the image was initially loaded from Commons
          // NOT from the form state which may already have user edits
          if (!originalImageStateRef.current.has(img.id)) {
            // For existing images, check if they have a special _originalState marker
            // This would be set when initially loading from Commons
            const originalFromCommons = img._originalState || {
              wikitext: img.metadata?.wikitext || '',
              selectedBandMembers: img.metadata?.selectedBandMembers || [],
              captions: img.metadata?.captions || []
            };

            originalImageStateRef.current.set(img.id, originalFromCommons);
          }

          // Get original state for comparison
          const originalState = originalImageStateRef.current.get(img.id);

          // Check if wikitext has actually changed from original
          const currentWikitext = img.metadata?.wikitext || '';
          const wikitextChanged = originalState && currentWikitext !== originalState.wikitext;

          if (img.commonsPageId && wikitextChanged) {
            newActions.push({
              type: 'image',
              imageId: img.id,
              filename: img.filename,
              status: 'pending',
              action: 'update-metadata',
              commonsPageId: img.commonsPageId,
              thumbnail: img.thumbUrl || img.preview,
              metadata: {
                description: img.metadata?.description,
                categories: img.metadata?.categories || [],
              }
            });
          }

          // Check if structured data needs update
          if (img.commonsPageId && originalState) {
            const sdProperties = [];

            // Check if depicts (selectedBandMembers) has changed
            const currentDepicts = [
              ...(selectedBand?.id ? [selectedBand.id] : []),
              ...(img.metadata?.selectedBandMembers || [])
            ].sort();
            const originalDepicts = [
              ...(selectedBand?.id ? [selectedBand.id] : []),
              ...(originalState.selectedBandMembers || [])
            ].sort();
            const depictsChanged = JSON.stringify(currentDepicts) !== JSON.stringify(originalDepicts);

            // Check if captions have changed
            const currentCaptions = img.metadata?.captions || [];
            const captionsChanged = JSON.stringify(currentCaptions) !== JSON.stringify(originalState.captions);

            // Check if wikitext changed (for existing images, this triggers metadata updates)
            const wikitextChanged = originalState && (img.metadata?.wikitext || '') !== originalState.wikitext;

            // If wikitext changed, it means description/categories changed, so we should update structured data too
            // This ensures depicts and captions stay in sync with the page content
            const shouldUpdateStructuredData = depictsChanged || captionsChanged || wikitextChanged;

            if (shouldUpdateStructuredData) {
              // Always include depicts if there are any
              if (currentDepicts.length > 0) {
                sdProperties.push({ property: 'P180', value: currentDepicts, exists: false, needsUpdate: true });
              }

              // Always include captions if there are any
              if (currentCaptions.length > 0) {
                sdProperties.push({
                  property: 'labels',
                  value: currentCaptions,
                  exists: false,
                  needsUpdate: true
                });
              }
            }

            if (sdProperties.length > 0) {
              newActions.push({
                type: 'structured-data',
                imageId: img.id,
                commonsPageId: img.commonsPageId,
                status: 'pending',
                properties: sdProperties
              });
            }
          }

          // If this image is set as main image for the band, create Wikidata action
          if (img.metadata?.setAsMainImage && selectedBand?.id) {
            const bandName = selectedBand?.labels?.en?.value || selectedBand?.entity?.labels?.en?.value || 'Band';
            const filename = img.filename || 'Unknown';

            newActions.push({
              type: 'wikidata',
              entityId: selectedBand.id,
              entityType: 'organization',
              entityLabel: bandName,
              status: 'pending',
              action: 'update',
              changes: [{
                property: 'P18',
                newValue: filename,
              }]
            });
          }
        });

        // ==========================================
        // Update state
        // ==========================================
        setActions(newActions);

        // Also update the form's computed.categories.all for backward compatibility
        // Use a ref check to avoid infinite loops
        const currentCategories = getValues('computed.categories.all' as any) || [];
        const newCategoriesStr = JSON.stringify(categoryArray.sort());
        const currentCategoriesStr = JSON.stringify(currentCategories);

        if (newCategoriesStr !== currentCategoriesStr) {
          setValue('computed.categories.all' as any, categoryArray.sort(), { shouldDirty: false });
        }

      } catch (error) {
        console.error('❌ Error calculating actions:', error);
      } finally {
        setIsCalculating(false);
        calculatingRef.current = false;
      }
    };

    // Only calculate if we have minimum data
    if (eventDetails?.title || images.length > 0 || existingImages.length > 0) {
      calculateActions();
    } else {
      setActions([]);
      const currentCategories = getValues('computed.categories.all' as any) || [];
      if (currentCategories.length > 0) {
        setValue('computed.categories.all' as any, [], { shouldDirty: false });
      }
      calculatingRef.current = false;
    }
  }, [depsKey, getValues]);

  // Helper functions
  const categories = actions.filter(a => a.type === 'category') as CategoryAction[];
  const wikidataActions = actions.filter(a => a.type === 'wikidata') as WikidataAction[];
  const imageActions = actions.filter(a => a.type === 'image') as ImageAction[];
  const structuredDataActions = actions.filter(a => a.type === 'structured-data') as StructuredDataAction[];

  const totalActions = actions.length;
  const pendingActions = actions.filter(a => a.status === 'pending').length;
  const completedActions = actions.filter(a => a.status === 'completed').length;
  const errorActions = actions.filter(a => a.status === 'error').length;

  // Store counts in form for workflow stepper
  useEffect(() => {
    setValue('computed.publish.totalActions' as any, totalActions, { shouldDirty: false });
    setValue('computed.publish.pendingActions' as any, pendingActions, { shouldDirty: false });
    setValue('computed.publish.completedActions' as any, completedActions, { shouldDirty: false });
    setValue('computed.publish.errorActions' as any, errorActions, { shouldDirty: false });
  }, [totalActions, pendingActions, completedActions, errorActions, setValue]);

  const addCategory = (categoryName: string) => {
    const trimmed = categoryName.trim();
    if (!trimmed || categories.some(c => c.categoryName === trimmed)) return;

    const newAction: CategoryAction = {
      type: 'category',
      categoryName: trimmed,
      status: 'pending',
      exists: false,
      shouldCreate: true,
    };

    setActions(prev => [...prev, newAction]);
  };

  const removeCategory = (categoryName: string) => {
    setActions(prev => prev.filter(a =>
      a.type !== 'category' || (a as CategoryAction).categoryName !== categoryName
    ));
  };

  const updateActionStatus = (actionId: string, status: ActionStatus, error?: string) => {
    // Extract the actual ID based on the prefix
    // PublishPane uses prefixes like 'sdc-' for structured data
    let actualId = actionId;
    if (actionId.startsWith('sdc-')) {
      actualId = actionId.replace('sdc-', '');
    }

    setActions(prev => prev.map(action => {
      // Create a unique ID for comparison
      const id = action.type === 'category' ? (action as CategoryAction).categoryName :
                 action.type === 'wikidata' ? (action as WikidataAction).entityId :
                 action.type === 'image' ? (action as ImageAction).imageId :
                 (action as StructuredDataAction).imageId;

      if (id === actualId) {
        return { ...action, status, error };
      }
      return action;
    }));

    // If completing a structured data action, update the original state ref
    // so future calculations don't think it still needs updating
    if (status === 'completed') {
      const action = actions.find(a => {
        const id = a.type === 'category' ? (a as CategoryAction).categoryName :
                   a.type === 'wikidata' ? (a as WikidataAction).entityId :
                   a.type === 'image' ? (a as ImageAction).imageId :
                   (a as StructuredDataAction).imageId;
        return id === actualId;
      });

      if (action?.type === 'structured-data') {
        const sdAction = action as StructuredDataAction;
        const img = existingImages.find((i: any) => i.id === sdAction.imageId);

        if (img && originalImageStateRef.current.has(img.id)) {
          // Update the original state to match current state
          originalImageStateRef.current.set(img.id, {
            wikitext: img.metadata?.wikitext || '',
            selectedBandMembers: img.metadata?.selectedBandMembers || [],
            captions: img.metadata?.captions || []
          });
        }
      }
    }
  };

  const refresh = () => {
    // Trigger recalculation by clearing actions
    setActions([]);
  };

  const updateStructuredDataPageId = (imageId: string, pageId: number) => {
    setActions(prev => prev.map(action => {
      if (action.type === 'structured-data') {
        const sdAction = action as StructuredDataAction;
        if (sdAction.imageId === imageId) {
          return { ...sdAction, commonsPageId: pageId };
        }
      }
      return action;
    }));
  };

  // Reload image data from Commons to update originalState
  const reloadImageFromCommons = async (imageId: string) => {
    const img = existingImages.find((i: any) => i.id === imageId);
    if (!img || !img.commonsPageId) {
      return;
    }

    try {
      const { getExistingDepicts, getExistingCaptions } = await import('@/utils/commons-structured-data');

      // Fetch fresh data from Commons
      const depictsStatements = await getExistingDepicts(img.commonsPageId);
      const captions = await getExistingCaptions(img.commonsPageId);

      // Extract member QIDs (exclude the band)
      const selectedBandMembers: string[] = [];
      const bandQid = selectedBand?.id;
      for (const depicts of depictsStatements) {
        if (depicts.entityId !== bandQid) {
          selectedBandMembers.push(depicts.entityId);
        }
      }

      // Fetch fresh wikitext from Commons
      const response = await fetch(
        `https://commons.wikimedia.org/w/api.php?` +
        new URLSearchParams({
          action: 'query',
          titles: `File:${img.filename}`,
          prop: 'revisions',
          rvprop: 'content',
          format: 'json',
          origin: '*'
        })
      );
      const data = await response.json();
      const pages = data.query?.pages;
      const page = pages ? Object.values(pages)[0] as any : null;
      const wikitext = page?.revisions?.[0]?.['*'] || '';

      // Update the originalState with fresh data from Commons
      originalImageStateRef.current.set(imageId, {
        wikitext,
        selectedBandMembers,
        captions
      });

      console.log('🔄 Reloaded image from Commons:', img.filename);
    } catch (error) {
      console.error('Error reloading image from Commons:', error);
    }
  };

  const contextValue: PublishDataContextType = {
    actions,
    totalActions,
    pendingActions,
    completedActions,
    errorActions,
    categories,
    addCategory,
    removeCategory,
    wikidataActions,
    imageActions,
    structuredDataActions,
    updateStructuredDataPageId,
    updateActionStatus,
    refresh,
    isCalculating,
    reloadImageFromCommons,
  };

  return (
    <PublishDataContext.Provider value={contextValue}>
      {children}
    </PublishDataContext.Provider>
  );
}

export function usePublishData() {
  const context = useContext(PublishDataContext);
  if (context === undefined) {
    throw new Error('usePublishData must be used within PublishDataProvider');
  }
  return context;
}
