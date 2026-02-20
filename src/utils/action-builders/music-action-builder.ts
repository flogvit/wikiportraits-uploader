import { generateMusicCategories, getCategoriesToCreate as getMusicCategoriesToCreate } from '@/utils/music-categories';
import { getAllCategoriesFromImages } from '@/utils/category-extractor';
import { getAllBandCategoryStructures, flattenBandCategories } from '@/utils/band-categories';
import { logger } from '@/utils/logger';
import {
  CategoryAction,
  WikidataAction,
  ImageAction,
  StructuredDataAction,
} from '@/providers/PublishDataProvider';
import { ActionBuilderFormData, ActionBuilderContext } from './types';
import { BaseActionBuilder } from './base-action-builder';

/**
 * ActionBuilder for music-event workflows.
 * Handles music-specific category generation, band/performer entities,
 * and related Wikidata actions.
 */
export class MusicActionBuilder extends BaseActionBuilder {

  async buildCategoryActions(formData: ActionBuilderFormData): Promise<CategoryAction[]> {
    const categorySet = new Set<string>();
    const categoriesToCreate: any[] = [];

    const images = formData.files?.queue || [];
    const existingImages = formData.files?.existing || [];
    const eventDetails = formData.eventDetails;
    const organizations = formData.entities?.organizations || [];
    const people = formData.entities?.people || [];

    const selectedBand = organizations.length > 0 ? organizations[0] : null;
    const selectedBandName = selectedBand?.entity?.labels?.en?.value ||
                             selectedBand?.labels?.en?.value || null;

    // Categories from images
    if (images.length > 0) {
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
        },
      }));
      const imgCategories = getAllCategoriesFromImages(imageFiles as any);
      imgCategories.forEach(cat => categorySet.add(cat));
    }

    // Music-specific event categories
    if (eventDetails) {
      const year = eventDetails.date ? new Date(eventDetails.date).getFullYear().toString() : '';
      const eventName = eventDetails.commonsCategory || (year ? `${eventDetails.title} ${year}` : eventDetails.title);

      const eventCategories = generateMusicCategories(eventDetails as any);
      eventCategories.forEach(cat => categorySet.add(cat));

      if (selectedBandName && eventName) {
        categorySet.add(`${selectedBandName} at ${eventName}`);
      }

      categoriesToCreate.push(...getMusicCategoriesToCreate(eventDetails as any));

      // Band categories
      if (eventName && year && selectedBandName) {
        const bandStructures = await getAllBandCategoryStructures(
          [{ name: selectedBandName, qid: selectedBand?.id || '' }],
          year,
          eventName
        );
        const bandCategories = flattenBandCategories(bandStructures);
        categoriesToCreate.push(...bandCategories);
        bandCategories.forEach(cat => categorySet.add(cat.categoryName));
      }
    }

    // Performer categories
    if (people.length > 0) {
      const { getPerformerCategories } = await import('@/utils/performer-categories');
      const performerCategoryInfos = await getPerformerCategories(people);
      performerCategoryInfos.forEach(info => {
        categorySet.add(info.commonsCategory);
        if (info.needsCreation) {
          categoriesToCreate.push({
            categoryName: info.commonsCategory,
            shouldCreate: true,
            description: info.description,
          });
        }
      });
    }

    return this.buildCategoryActionsFromList(categorySet, categoriesToCreate);
  }

  async buildWikidataActions(formData: ActionBuilderFormData): Promise<WikidataAction[]> {
    const actions: WikidataAction[] = [];
    const eventDetails = formData.eventDetails;
    const people = formData.entities?.people || [];
    const organizations = formData.entities?.organizations || [];

    // Event creation
    if (eventDetails?.title && !eventDetails?.wikidataId) {
      actions.push({
        type: 'wikidata',
        id: 'wikidata-new-event',
        entityId: 'new-event',
        entityType: 'event',
        entityLabel: eventDetails.title,
        status: 'pending',
        action: 'create',
        changes: [
          { property: 'P31', newValue: 'Q132241' }, // instance of: music festival
          { property: 'P585', newValue: eventDetails.date }, // point in time
        ],
      });
    }

    // People missing P373
    for (const person of people) {
      if (person.id && !person.id.startsWith('pending-') && !person.isNew) {
        const action = await this.checkEntityP373(
          person.id,
          'person',
          person.labels?.en?.value || 'Unknown',
          async () => {
            const { getPerformerCategory } = await import('@/utils/performer-categories');
            const info = await getPerformerCategory(person);
            return info.commonsCategory;
          }
        );
        if (action) actions.push(action);
      }
    }

    // Organizations missing P373
    for (const org of organizations) {
      if (org.id && !org.id.startsWith('pending-') && !org.isNew) {
        const action = await this.checkEntityP373(
          org.id,
          'organization',
          org.labels?.en?.value || 'Unknown',
          async () => {
            const { checkNeedsDisambiguation } = await import('@/utils/band-categories');
            const disambigCheck = await checkNeedsDisambiguation(
              org.labels?.en?.value || 'Unknown',
              org.id
            );
            return disambigCheck.suggestedName;
          }
        );
        if (action) actions.push(action);
      }
    }

    // P18 (main image) actions
    const selectedBand = organizations.length > 0 ? organizations[0] : null;
    const images = formData.files?.queue || [];
    const existingImages = formData.files?.existing || [];
    actions.push(...this.buildMainImageActions(images, existingImages, selectedBand));

    return actions;
  }

  async buildImageActions(formData: ActionBuilderFormData, context: ActionBuilderContext): Promise<ImageAction[]> {
    const images = formData.files?.queue || [];
    const existingImages = formData.files?.existing || [];
    const organizations = formData.entities?.organizations || [];
    const selectedBandId = organizations.length > 0 ? organizations[0]?.id : undefined;

    return [
      ...this.buildNewImageActions(images, selectedBandId),
      ...this.buildExistingImageActions(existingImages, context),
    ];
  }

  async buildStructuredDataActions(formData: ActionBuilderFormData, context: ActionBuilderContext): Promise<StructuredDataAction[]> {
    const images = formData.files?.queue || [];
    const existingImages = formData.files?.existing || [];
    const organizations = formData.entities?.organizations || [];
    const selectedBandId = organizations.length > 0 ? organizations[0]?.id : undefined;

    return [
      ...this.buildNewImageStructuredData(images, selectedBandId),
      ...this.buildExistingImageStructuredData(existingImages, context, selectedBandId),
    ];
  }
}
