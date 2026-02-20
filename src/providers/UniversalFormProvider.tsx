'use client';

import React, { createContext, useContext, ReactNode, useEffect, useState } from 'react';
import { useForm, UseFormReturn, FormProvider } from 'react-hook-form';
import { UniversalFormData } from '../types/unified-form';
import { WikidataEntity } from '../types/wikidata';
import { imageCache } from '@/utils/image-cache';
import { logger } from '@/utils/logger';

interface UniversalFormContextType extends UseFormReturn<UniversalFormData> {
  // Additional helper methods
  hasChanges: boolean;
  changedSections: string[];
  resetToOriginal: () => void;
  getChangedFields: () => Partial<Record<keyof UniversalFormData, any>>;
  saveToStorage: () => void;
  loadFromStorage: () => boolean;
  clearStorage: () => void;
}

const UniversalFormContext = createContext<UniversalFormContextType | null>(null);

interface UniversalFormProviderProps {
  children: ReactNode;
  defaultValues?: Partial<UniversalFormData>;
  onSubmitAction?: (data: UniversalFormData) => void;
  sessionId?: string; // Optional session ID for localStorage
  autoSave?: boolean; // Auto-save to localStorage on changes
}

export function UniversalFormProvider({ 
  children, 
  defaultValues,
  onSubmitAction: onSubmit,
  sessionId,
  autoSave = true
}: UniversalFormProviderProps) {
  
  const storageKey = `universal-form-${sessionId || 'default'}`;
  
  // Try to load from localStorage first
  const loadFromStorage = (): UniversalFormData | null => {
    if (typeof window === 'undefined') return null;
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Convert date strings back to Date objects
        if (parsed.eventDetails?.common?.date) {
          parsed.eventDetails.common.date = new Date(parsed.eventDetails.common.date);
        }
        if (parsed.session?.createdAt) {
          parsed.session.createdAt = new Date(parsed.session.createdAt);
        }
        if (parsed.session?.lastModified) {
          parsed.session.lastModified = new Date(parsed.session.lastModified);
        }
        return parsed;
      }
    } catch (error) {
      logger.warn('UniversalFormProvider', 'Failed to load from localStorage', error);
    }
    return null;
  };
  
  // Create default values if none provided
  const createInitialValues = (): UniversalFormData => {
    return {
      workflowType: 'music-event',
    isWikiPortraitsJob: true,
    entities: {
      people: [],
      organizations: [],
      locations: [],
      events: []
    },
    eventDetails: {
      title: '',
      language: 'en'
    },
    computed: {
      categories: {
        auto: [],
        suggested: [],
        manual: [],
        rejected: [],
        all: []
      },
      fileNaming: {
        pattern: '',
        components: {},
        preview: '',
        examples: []
      },
      templates: {
        description: '',
        information: '',
        categories: '',
        license: ''
      },
      summary: {
        title: '',
        peopleCount: 0,
        organizationCount: 0,
        locationCount: 0,
        autoCategories: 0,
        estimatedQuality: 'low'
      }
    },
    files: {
      queue: [],
      uploaded: []
    },
    publishing: {
      status: 'draft',
      actions: []
    },
    ui: {
      currentStep: 0,
      completedSteps: [],
      paneState: {}
    },
    validation: {
      isValid: false,
      errors: [],
      warnings: [],
      completeness: 0
    },
    session: {
      id: crypto.randomUUID(),
      createdAt: new Date(),
      lastModified: new Date(),
      version: 1
    }
    };
  };
  
  // Use stored data, then defaultValues, then defaults
  const storedData = loadFromStorage();
  const finalValues = storedData || {
    ...createInitialValues(),
    ...defaultValues
  };

  const form = useForm<UniversalFormData>({
    defaultValues: finalValues,
    mode: 'onChange'
  });

  // Storage functions
  const saveToStorageFunc = () => {
    if (typeof window === 'undefined') return;
    try {
      const currentData = form.getValues();
      const dataToSave = {
        ...currentData,
        session: {
          ...currentData.session,
          lastModified: new Date(),
          savedAt: new Date()
        }
      };
      localStorage.setItem(storageKey, JSON.stringify(dataToSave));
    } catch (error) {
      logger.warn('UniversalFormProvider', 'Failed to save to localStorage', error);
    }
  };
  
  const loadFromStorageFunc = (): boolean => {
    const stored = loadFromStorage();
    if (stored) {
      form.reset(stored);
      return true;
    }
    return false;
  };
  
  const clearStorageFunc = () => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.removeItem(storageKey);
    } catch (error) {
      logger.warn('UniversalFormProvider', 'Failed to clear localStorage', error);
    }
  };
  
  // Auto-save on form changes (including images)
  useEffect(() => {
    if (!autoSave) return;

    let timeoutId: NodeJS.Timeout;

    const subscription = form.watch((data) => {
      // Clear previous timeout
      if (timeoutId) clearTimeout(timeoutId);

      // Debounce the save operation
      timeoutId = setTimeout(async () => {
        saveToStorageFunc();

        // Also save images to IndexedDB (or clear if empty)
        const files = data.files?.queue || [];
        try {
          if (files.length > 0) {
            await imageCache.saveImages(
              files.map((file: any, index: number) => ({
                id: file.id || `image-${index}`,
                file: file.file,
                preview: file.preview,
                metadata: file.metadata || {},
                timestamp: Date.now() + index // Preserve order
              }))
            );
          } else {
            // No images left - clear the cache
            await imageCache.clearImages();
          }
        } catch (error) {
          logger.warn('UniversalFormProvider', 'Failed to save images to IndexedDB', error);
        }
      }, 1000); // Save 1 second after last change
    });

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      subscription.unsubscribe();
    };
  }, [autoSave, form.watch]);

  // Restore images on mount
  useEffect(() => {
    const restoreImages = async () => {
      try {
        const hasImages = await imageCache.hasImages();
        if (hasImages) {
          const cachedImages = await imageCache.loadImages();
          if (cachedImages.length > 0) {
            // Convert cached images back to the format expected by the form
            // Regenerate preview URLs since blob URLs don't persist across page reloads
            const restoredFiles = cachedImages.map((cached) => {
              // Create a new blob URL from the cached file
              const newPreviewUrl = URL.createObjectURL(cached.file);

              return {
                id: cached.id,
                file: cached.file,
                preview: newPreviewUrl,
                metadata: cached.metadata
              };
            });

            form.setValue('files.queue', restoredFiles as any);
          }
        }
      } catch (error) {
        logger.warn('UniversalFormProvider', 'Failed to restore images from IndexedDB', error);
      }
    };

    restoreImages();
  }, []); // Only run once on mount

  // Automatic updates when image performers change
  useEffect(() => {
    const updateImageMetadata = async () => {
      const filesQueue = form.watch('files.queue') || [];
      const filesExisting = form.watch('files.existing') || [];
      const performers = form.watch('entities.people') || [];
      const organizations = form.watch('entities.organizations') || [];
      const eventDetails = form.watch('eventDetails');
      const isWikiPortraitsJob = form.watch('isWikiPortraitsJob');

      // Find main band
      const selectedBand = organizations.find((org: any) =>
        org.claims?.['P31']?.some((claim: any) =>
          ['Q215380', 'Q5741069'].includes(claim.mainsnak?.datavalue?.value?.id)
        )
      );

      // Process both new and existing images
      const allFilesArrays = [
        { files: filesQueue, key: 'files.queue' },
        { files: filesExisting, key: 'files.existing' }
      ];

      for (const { files, key } of allFilesArrays) {
        if (!files || files.length === 0) continue;

        let hasChanges = false;
        const updatedFiles = await Promise.all(files.map(async (img: any) => {
          // Track what this image had before
          const previousPerformers = img.metadata?.performerCategories || [];
          const currentPerformers = img.metadata?.selectedBandMembers || [];

          // Create a stable key from current performers to detect actual changes
          const currentPerformersKey = [...currentPerformers].sort().join(',');
          const previousPerformersKey = img.metadata?._lastPerformersKey || '';

          // Skip if no performers selected or nothing changed
          if (currentPerformers.length === 0 && previousPerformers.length === 0) {
            return img;
          }

          // Skip if the performers for THIS specific image haven't changed
          if (currentPerformersKey === previousPerformersKey && previousPerformersKey !== '') {
            logger.debug('UniversalFormProvider', 'Skipping image (performers unchanged)', img.filename || img.id);
            return img;
          }

          logger.debug('UniversalFormProvider', 'Updating image metadata', img.filename || img.id, {
            currentPerformersKey,
            previousPerformersKey,
            willUpdate: true
          });

          try {
            const { getPerformerCategory } = await import('@/utils/performer-categories');
            const { generateMultilingualCaptions } = await import('@/utils/caption-generator');
            const { regenerateImageWikitext } = await import('@/utils/commons-template');
            const { generateTemplateParameters, getYearFromDate } = await import('@/utils/wikiportraits-templates');

            // Get selected performers
            const selectedPerformers = performers.filter((p: any) => {
              const performerId = p.id || p.entity?.id;
              return currentPerformers.includes(performerId);
            });

            // Fetch performer categories
            const performerCategoryPromises = selectedPerformers.map(async (performer: any) => {
              const entity = performer.entity || performer;
              const categoryInfo = await getPerformerCategory(entity);
              return categoryInfo.commonsCategory;
            });
            const newPerformerCategories = await Promise.all(performerCategoryPromises);

            // Check if performer categories actually changed
            const categoriesChanged =
              JSON.stringify(previousPerformers.sort()) !== JSON.stringify(newPerformerCategories.sort());

            if (!categoriesChanged) {
              return img; // No changes needed
            }

            hasChanges = true;

            // Remove old performer categories, add new ones
            const currentCategories = img.metadata?.categories || [];
            const nonPerformerCategories = currentCategories.filter((cat: string) =>
              !previousPerformers.includes(cat)
            );
            const finalCategories = [...new Set([...nonPerformerCategories, ...newPerformerCategories])];

            // Generate captions
            const formData = {
              workflowType: 'music-event',
              eventDetails: {
                ...eventDetails,
                date: img.metadata?.date || eventDetails?.date
              },
              entities: {
                people: selectedPerformers.map((p: any) => ({
                  entity: p.entity || p,
                  roles: p.roles || [],
                  isNew: p.isNew || false,
                  metadata: p.metadata || {}
                })),
                organizations: selectedBand ? [{ entity: selectedBand }] : [],
                locations: [],
                events: []
              }
            };
            const newCaptions = generateMultilingualCaptions(
              formData as any,
              eventDetails?.location as any,
              eventDetails?.date as any
            );

            // Ensure WikiPortraits template if needed
            let wikiportraitsTemplate = img.metadata?.wikiportraitsTemplate;
            if (!wikiportraitsTemplate && isWikiPortraitsJob === true && eventDetails?.title) {
              const year = eventDetails?.date ? getYearFromDate(eventDetails.date) : new Date().getFullYear().toString();
              wikiportraitsTemplate = generateTemplateParameters(eventDetails, year);
            }

            // Build updated metadata
            const updatedMetadata = {
              ...img.metadata,
              categories: finalCategories,
              performerCategories: newPerformerCategories,
              captions: newCaptions,
              wikiportraitsTemplate: wikiportraitsTemplate,
              _lastPerformersKey: currentPerformersKey // Track this to prevent unnecessary re-renders
            };

            // Regenerate wikitext with all updated data
            const updatedImage = {
              ...img,
              metadata: updatedMetadata
            };
            const regenerated = regenerateImageWikitext(updatedImage);

            return {
              ...img,
              metadata: {
                ...updatedMetadata,
                wikitext: regenerated.metadata.wikitext
              }
            };

          } catch (error) {
            logger.error('UniversalFormProvider', 'Failed to update image metadata', error);
            return img;
          }
        }));

        // Only update if there were actual changes
        if (hasChanges) {
          form.setValue(key as any, updatedFiles, { shouldDirty: true });
          logger.debug('UniversalFormProvider', 'Auto-updated image metadata for', key);
        }
      }
    };

    updateImageMetadata();
  }, [
    form.watch('files.queue'),
    form.watch('files.existing'),
    form.watch('entities.people'),
    form.watch('entities.organizations'),
    form.watch('eventDetails'),
    form.watch('isWikiPortraitsJob')
  ]);

  // Enhanced context value with helper methods
  const contextValue: UniversalFormContextType = {
    ...form,
    hasChanges: form.formState.isDirty,
    changedSections: Object.keys(form.formState.dirtyFields),
    resetToOriginal: () => form.reset(),
    getChangedFields: () => form.formState.dirtyFields || {},
    saveToStorage: saveToStorageFunc,
    loadFromStorage: loadFromStorageFunc,
    clearStorage: clearStorageFunc
  };

  const handleSubmit = form.handleSubmit((data) => {
    onSubmit?.(data);
  });

  return (
    <UniversalFormContext.Provider value={contextValue}>
      <FormProvider {...form}>
        <form onSubmit={handleSubmit}>
          {children}
        </form>
      </FormProvider>
    </UniversalFormContext.Provider>
  );
}

export function useUniversalForm(): UniversalFormContextType {
  const context = useContext(UniversalFormContext);
  if (!context) {
    throw new Error('useUniversalForm must be used within UniversalFormProvider');
  }
  return context;
}

// Convenience hooks for specific sections
export function useUniversalFormEntities() {
  const form = useUniversalForm();
  return {
    // Return WikidataEntity arrays directly
    people: form.watch('entities.people') as WikidataEntity[],
    organizations: form.watch('entities.organizations') as WikidataEntity[],
    locations: form.watch('entities.locations') as WikidataEntity[],
    events: form.watch('entities.events') as WikidataEntity[],
    addPerson: (person: WikidataEntity) => {
      const current = form.getValues('entities.people') as WikidataEntity[];
      form.setValue('entities.people', [...current, person], { shouldDirty: true });
    },
    removePerson: (index: number) => {
      const current = form.getValues('entities.people') as WikidataEntity[];
      form.setValue('entities.people', current.filter((_, i) => i !== index), { shouldDirty: true });
    },
    addOrganization: (org: WikidataEntity) => {
      const current = form.getValues('entities.organizations') as WikidataEntity[];
      form.setValue('entities.organizations', [...current, org], { shouldDirty: true });
    },
    removeOrganization: (index: number) => {
      const current = form.getValues('entities.organizations') as WikidataEntity[];
      form.setValue('entities.organizations', current.filter((_, i) => i !== index), { shouldDirty: true });
    }
  };
}

export function useUniversalFormEventDetails() {
  const form = useUniversalForm();
  const eventDetails = form.watch('eventDetails');
  return {
    common: eventDetails,
    musicEvent: eventDetails,
    soccerMatch: eventDetails,
    portraitSession: eventDetails,
    generalUpload: eventDetails,
    custom: eventDetails,
    setTitle: (title: string) => form.setValue('eventDetails.title' as any, title, { shouldDirty: true }),
    setDate: (date: Date) => form.setValue('eventDetails.date' as any, date, { shouldDirty: true })
  };
}

export function useUniversalFormFiles() {
  const form = useUniversalForm();
  return {
    queue: form.watch('files.queue'),
    uploaded: form.watch('files.uploaded'),
    addToQueue: (files: any) => {
      const current = form.getValues('files.queue');
      const filesToAdd = Array.isArray(files) ? files : [files];

      form.setValue('files.queue', [...current, ...filesToAdd], { shouldDirty: true });
    },
    removeFromQueue: (id: string) => {
      const current = form.getValues('files.queue');
      form.setValue('files.queue', current.filter(f => f.id !== id), { shouldDirty: true });
    }
  };
}

export function useUniversalFormCategories() {
  const form = useUniversalForm();
  return {
    all: form.watch('computed.categories.all'),
    manual: form.watch('computed.categories.manual'),
    auto: form.watch('computed.categories.auto'),
    suggested: form.watch('computed.categories.suggested'),
    rejected: form.watch('computed.categories.rejected'),
    addManual: (category: string) => {
      const current = form.getValues('computed.categories.manual');
      if (!current.includes(category)) {
        form.setValue('computed.categories.manual', [...current, category], { shouldDirty: true });
        // Update 'all' categories
        const allCurrent = form.getValues('computed.categories.all');
        form.setValue('computed.categories.all', [...allCurrent, category], { shouldDirty: true });
      }
    },
    removeManual: (category: string) => {
      const current = form.getValues('computed.categories.manual');
      form.setValue('computed.categories.manual', current.filter(c => c !== category), { shouldDirty: true });
      // Update 'all' categories
      const allCurrent = form.getValues('computed.categories.all');
      form.setValue('computed.categories.all', allCurrent.filter(c => c !== category), { shouldDirty: true });
    },
    rejectSuggestion: (category: string) => {
      const rejected = form.getValues('computed.categories.rejected');
      form.setValue('computed.categories.rejected', [...rejected, category], { shouldDirty: true });
      const suggested = form.getValues('computed.categories.suggested');
      form.setValue('computed.categories.suggested', suggested.filter(s => s.name !== category), { shouldDirty: true });
    }
  };
}