/**
 * PublishDataProvider
 * Centralized management of all publish-ready data
 * Tracks what needs to be created, updated, or is already done
 *
 * Delegates action calculation to workflow-specific ActionBuilders.
 */

'use client';

import { createContext, useContext, ReactNode, useEffect, useState, useMemo, useRef } from 'react';
import { useUniversalForm } from '@/providers/UniversalFormProvider';
import { logger } from '@/utils/logger';
import { getActionBuilder } from '@/utils/action-builders';

export type ActionStatus = 'pending' | 'ready' | 'in-progress' | 'completed' | 'error' | 'skipped';

export interface CategoryAction {
  type: 'category';
  categoryName: string;
  status: ActionStatus;
  exists: boolean;
  shouldCreate: boolean;
  parentCategory?: string;
  additionalParents?: string[];
  description?: string;
  error?: string;
}

export interface WikidataAction {
  type: 'wikidata';
  entityId: string;
  entityType: 'person' | 'organization' | 'event' | 'location';
  entityLabel: string;
  status: ActionStatus;
  action: 'create' | 'update' | 'link' | 'verify';
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
  commonsPageId?: number;
  thumbnail?: string;
  metadata?: {
    description?: string;
    categories?: string[];
    depicts?: string[];
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
    property: string;
    value: any;
    exists: boolean;
    needsUpdate: boolean;
  }[];
  error?: string;
}

export type PublishAction = CategoryAction | WikidataAction | ImageAction | StructuredDataAction;

interface PublishDataContextType {
  actions: PublishAction[];
  totalActions: number;
  pendingActions: number;
  completedActions: number;
  errorActions: number;
  categories: CategoryAction[];
  addCategory: (categoryName: string) => void;
  removeCategory: (categoryName: string) => void;
  wikidataActions: WikidataAction[];
  imageActions: ImageAction[];
  structuredDataActions: StructuredDataAction[];
  updateStructuredDataPageId: (imageId: string, pageId: number) => void;
  updateActionStatus: (actionId: string, status: ActionStatus, error?: string) => void;
  refresh: () => void;
  reloadImageFromCommons: (imageId: string) => Promise<void>;
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

  const selectedBand = organizations.length > 0 ? organizations[0] : null;
  const selectedBandName = (selectedBand as any)?.entity?.labels?.en?.value ||
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

  // Calculate all actions via ActionBuilder whenever dependencies change
  useEffect(() => {
    if (calculatingRef.current) return;

    const calculateActions = async () => {
      calculatingRef.current = true;
      setIsCalculating(true);

      try {
        const builder = getActionBuilder(uploadType);
        const formData = {
          workflowType,
          eventDetails,
          entities: { people, organizations },
          files: { queue: images, existing: existingImages },
        };
        const context = { originalImageStateRef };

        const [categoryActions, wikidataActions, imageActions, structuredDataActions] = await Promise.all([
          builder.buildCategoryActions(formData),
          builder.buildWikidataActions(formData),
          builder.buildImageActions(formData, context),
          builder.buildStructuredDataActions(formData, context),
        ]);

        const newActions: PublishAction[] = [
          ...categoryActions,
          ...wikidataActions,
          ...imageActions,
          ...structuredDataActions,
        ];

        setActions(newActions);

        // Update form's computed.categories.all for backward compatibility
        const allCategories = categoryActions.map(c => c.categoryName).sort();
        const currentCategories = getValues('computed.categories.all' as any) || [];
        if (JSON.stringify(allCategories) !== JSON.stringify(currentCategories)) {
          setValue('computed.categories.all' as any, allCategories, { shouldDirty: false });
        }
      } catch (error) {
        logger.error('PublishDataProvider', 'Error calculating actions', error);
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

  // Derived state
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

    setActions(prev => [...prev, {
      type: 'category' as const,
      categoryName: trimmed,
      status: 'pending' as const,
      exists: false,
      shouldCreate: true,
    }]);
  };

  const removeCategory = (categoryName: string) => {
    setActions(prev => prev.filter(a =>
      a.type !== 'category' || (a as CategoryAction).categoryName !== categoryName
    ));
  };

  const updateActionStatus = (actionId: string, status: ActionStatus, error?: string) => {
    let actualId = actionId;
    if (actionId.startsWith('sdc-')) {
      actualId = actionId.replace('sdc-', '');
    }

    setActions(prev => prev.map(action => {
      const id = action.type === 'category' ? (action as CategoryAction).categoryName :
                 action.type === 'wikidata' ? (action as WikidataAction).entityId :
                 action.type === 'image' ? (action as ImageAction).imageId :
                 (action as StructuredDataAction).imageId;

      if (id === actualId) {
        return { ...action, status, error };
      }
      return action;
    }));

    // Update original state ref when structured data completes
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
          const imgMeta = img.metadata as any;
          originalImageStateRef.current.set(img.id, {
            wikitext: imgMeta?.wikitext || '',
            selectedBandMembers: imgMeta?.selectedBandMembers || [],
            captions: imgMeta?.captions || [],
          });
        }
      }
    }
  };

  const refresh = () => {
    setActions([]);
  };

  const updateStructuredDataPageId = (imageId: string, pageId: number) => {
    setActions(prev => prev.map(action => {
      if (action.type === 'structured-data' && (action as StructuredDataAction).imageId === imageId) {
        return { ...action, commonsPageId: pageId } as StructuredDataAction;
      }
      return action;
    }));
  };

  const reloadImageFromCommons = async (imageId: string) => {
    const img = existingImages.find((i: any) => i.id === imageId);
    if (!img || !img.commonsPageId) return;

    try {
      const { getExistingDepicts, getExistingCaptions } = await import('@/utils/commons-structured-data');

      const depictsStatements = await getExistingDepicts(img.commonsPageId);
      const captions = await getExistingCaptions(img.commonsPageId);

      const selectedBandMembers: string[] = [];
      const bandQid = selectedBand?.id;
      for (const depicts of depictsStatements) {
        if (depicts.entityId !== bandQid) {
          selectedBandMembers.push(depicts.entityId);
        }
      }

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

      originalImageStateRef.current.set(imageId, {
        wikitext,
        selectedBandMembers,
        captions,
      });

      logger.info('PublishDataProvider', 'Reloaded image from Commons', img.filename);
    } catch (error) {
      logger.error('PublishDataProvider', 'Error reloading image from Commons', error);
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
