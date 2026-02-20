/**
 * Centralized category generation hook
 * Handles all category calculation and updates in one place
 * All panes should read from and update through this hook
 */

import { useEffect, useState } from 'react';
import { useUniversalForm } from '@/providers/UniversalFormProvider';
import { generateMusicCategories, getCategoriesToCreate as getMusicCategoriesToCreate } from '@/utils/music-categories';
import { getAllCategoriesFromImages } from '@/utils/category-extractor';
import { getAllBandCategoryStructures, flattenBandCategories } from '@/utils/band-categories';
import { lookupCache, CacheType } from '@/utils/lookup-cache';

export interface CategoryCreationInfo {
  categoryName: string;
  shouldCreate: boolean;
  parentCategory?: string;
  additionalParents?: string[];
  description?: string;
  eventName?: string;
  teamName?: string;
}

export function useCategoryGeneration() {
  const { watch, setValue, getValues } = useUniversalForm();
  const [isGenerating, setIsGenerating] = useState(false);
  const [categoriesToCreate, setCategoriesToCreate] = useState<CategoryCreationInfo[]>([]);

  // Watch all dependencies
  const workflowType = watch('workflowType');
  const uploadType = workflowType === 'music-event' ? 'music' : 'general';
  const images = watch('files.queue') || [];
  const eventDetails = watch('eventDetails');
  const organizations = watch('entities.organizations') || [];
  const people = watch('entities.people') || [];

  // Get the main band
  const selectedBand = organizations.length > 0 ? organizations[0] : null;
  const selectedBandName = selectedBand?.entity?.labels?.en?.value ||
                          selectedBand?.labels?.en?.value ||
                          selectedBand?.labels?.en ||
                          selectedBand?.entity?.labels?.en ||
                          null;

  // Current categories from form
  const allCategories = (watch('computed.categories') as any)?.all || [];

  // Generate categories whenever dependencies change
  useEffect(() => {
    const generateCategories = async () => {
      console.log('🔄 Starting category generation...');
      setIsGenerating(true);

      try {
        // Get categories from images if they exist
        let imageCategories: string[] = [];
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
              permission: imgData.permission,
              otherVersions: imgData.otherVersions,
              additionalCategories: imgData.additionalCategories,
              template: imgData.template,
              templateModified: imgData.templateModified,
            }
          }));

          imageCategories = getAllCategoriesFromImages(imageFiles as any);
        }

        // Get event-specific categories
        let eventCategories: string[] = [];
        if (uploadType === 'music' && eventDetails) {
          const year = eventDetails.date ? new Date(eventDetails.date).getFullYear().toString() : '';
          const eventName = eventDetails.commonsCategory || (year ? `${eventDetails.title} ${year}` : eventDetails.title);

          // Generate base event categories
          eventCategories = generateMusicCategories(eventDetails as any);

          // Add band-at-event category if band is selected
          if (selectedBandName && eventName) {
            const bandCategory = `${selectedBandName} at ${eventName}`;
            eventCategories.push(bandCategory);
            console.log('📁 Adding band category:', bandCategory);
          }
        }

        // Combine all categories
        const combinedCategories = new Set([...imageCategories, ...eventCategories]);

        // Get categories that need creation
        let toCreate: CategoryCreationInfo[] = [];
        if (uploadType === 'music' && eventDetails) {
          toCreate = getMusicCategoriesToCreate(eventDetails as any);
        }

        // Generate band category structures
        const year = eventDetails?.date ? new Date(eventDetails.date).getFullYear().toString() : '';
        const eventName = eventDetails?.commonsCategory ||
                         (year ? `${eventDetails.title} ${year}` : eventDetails?.title);

        // AWAIT all async operations
        if (eventName && year && selectedBandName) {
          const bandStructures = await getAllBandCategoryStructures(
            [{ name: selectedBandName, qid: selectedBand?.id || '' }],
            year,
            eventName
          );

          const bandCategories = flattenBandCategories(bandStructures);
          console.log('📁 Generated band category structure:', bandStructures);

          toCreate = [...toCreate, ...bandCategories];
          bandCategories.forEach(cat => combinedCategories.add(cat.categoryName));
        }

        // Generate performer categories
        if (people && people.length > 0) {
          console.log('🎤 Generating categories for', people.length, 'performers');

          try {
            const { getPerformerCategories } = await import('@/utils/performer-categories');
            const performerCategoryInfos = await getPerformerCategories(people);

            performerCategoryInfos.forEach(info => {
              console.log('🎤 Adding performer category:', info.commonsCategory);
              combinedCategories.add(info.commonsCategory);

              if (info.needsCreation) {
                toCreate.push({
                  categoryName: info.commonsCategory,
                  shouldCreate: true,
                  description: info.description,
                  eventName: info.performerName
                });
              }
            });
          } catch (error) {
            console.error('Error generating performer categories:', error);
          }
        }

        // Add categories that need creation
        toCreate.forEach((cat: CategoryCreationInfo) => combinedCategories.add(cat.categoryName));

        // Update state ONCE after all async operations complete
        const finalCategories = Array.from(combinedCategories).sort();
        console.log('✅ Category generation complete:', finalCategories.length, 'categories');

        setValue('computed.categories.all' as any, finalCategories);
        setCategoriesToCreate(toCreate);
      } catch (error) {
        console.error('❌ Error generating categories:', error);
      } finally {
        setIsGenerating(false);
      }
    };

    // Only generate if we have minimum required data
    if (eventDetails?.title || images.length > 0) {
      generateCategories();
    } else {
      // Clear categories if we don't have data
      setValue('computed.categories.all' as any, []);
      setCategoriesToCreate([]);
    }
  }, [uploadType, eventDetails, images, organizations, people, selectedBandName, selectedBand, setValue]);

  // API for components to use
  const addCategory = (categoryName: string) => {
    const trimmed = categoryName.trim();
    if (trimmed && !allCategories.includes(trimmed)) {
      const updated = [...allCategories, trimmed].sort();
      setValue('computed.categories.all' as any, updated);
      lookupCache.invalidate(CacheType.COMMONS_CATEGORY_EXISTS, `Category:${trimmed}`);
      return true;
    }
    return false;
  };

  const removeCategory = (categoryName: string) => {
    const updated = allCategories.filter((cat: string) => cat !== categoryName);
    setValue('computed.categories.all' as any, updated);
    return true;
  };

  const refreshCategories = () => {
    // Trigger regeneration by incrementing a counter or similar
    setValue('computed.categories.all' as any, []);
    // The useEffect will automatically regenerate
  };

  return {
    categories: allCategories,
    categoriesToCreate,
    isGenerating,
    addCategory,
    removeCategory,
    refreshCategories
  };
}
