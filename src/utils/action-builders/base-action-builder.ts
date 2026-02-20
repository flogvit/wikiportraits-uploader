import { CommonsClient } from '@/lib/api/CommonsClient';
import { logger } from '@/utils/logger';
import {
  CategoryAction,
  WikidataAction,
  ImageAction,
  StructuredDataAction,
} from '@/providers/PublishDataProvider';
import { ActionBuilder, ActionBuilderFormData, ActionBuilderContext } from './types';

/**
 * Base ActionBuilder with shared logic used by all workflows.
 * Subclasses override the build methods for workflow-specific logic.
 */
export abstract class BaseActionBuilder implements ActionBuilder {

  // ==========================================
  // Category helpers
  // ==========================================

  /**
   * Check which categories from a list already exist on Commons.
   */
  protected async checkCategoryExistence(
    categoryNames: string[]
  ): Promise<Map<string, boolean>> {
    const results = new Map<string, boolean>();
    const checks = await Promise.all(
      categoryNames.map(async (name) => {
        try {
          const exists = await CommonsClient.categoryExists(name);
          return { name, exists };
        } catch {
          return { name, exists: false };
        }
      })
    );
    checks.forEach(({ name, exists }) => results.set(name, exists));
    return results;
  }

  /**
   * Convert a list of category info objects to CategoryAction[].
   * Checks existence and marks status accordingly.
   */
  protected async buildCategoryActionsFromList(
    categorySet: Set<string>,
    categoriesToCreate: Array<{
      categoryName: string;
      shouldCreate?: boolean;
      parentCategory?: string;
      additionalParents?: string[];
      description?: string;
    }>
  ): Promise<CategoryAction[]> {
    const categoryArray = Array.from(categorySet);
    const existenceMap = await this.checkCategoryExistence(categoryArray);
    const actions: CategoryAction[] = [];

    categoryArray.forEach(categoryName => {
      const exists = existenceMap.get(categoryName) || false;
      const createInfo = categoriesToCreate.find(c => c.categoryName === categoryName);
      const shouldCreate = !!createInfo && !exists;

      actions.push({
        type: 'category',
        categoryName,
        status: exists ? 'completed' : shouldCreate ? 'pending' : 'ready',
        exists,
        shouldCreate,
        parentCategory: createInfo?.parentCategory,
        additionalParents: createInfo?.additionalParents,
        description: createInfo?.description,
      });
    });

    return actions;
  }

  // ==========================================
  // Wikidata helpers
  // ==========================================

  /**
   * Check if an entity has P373 (Commons category) and return
   * a WikidataAction if it's missing.
   */
  protected async checkEntityP373(
    entityId: string,
    entityType: 'person' | 'organization',
    entityLabel: string,
    getCategoryValue: (freshEntity: any) => Promise<string>
  ): Promise<WikidataAction | null> {
    if (!entityId || entityId.startsWith('pending-')) return null;

    try {
      const { getWikidataEntity } = await import('@/utils/wikidata');
      const freshEntity = await getWikidataEntity(entityId, 'en', 'labels|claims');
      const hasP373 = freshEntity.claims?.P373?.length > 0;

      if (!hasP373) {
        const categoryValue = await getCategoryValue(freshEntity);
        return {
          type: 'wikidata',
          entityId,
          entityType,
          entityLabel,
          status: 'pending',
          action: 'update',
          changes: [{ property: 'P373', newValue: categoryValue }],
        };
      }
    } catch (error) {
      logger.error('BaseActionBuilder', `Error checking P373 for ${entityType}`, entityId, error);
    }
    return null;
  }

  // ==========================================
  // Image helpers
  // ==========================================

  /**
   * Build image upload actions for new images.
   */
  protected buildNewImageActions(
    images: any[],
    selectedBandId?: string
  ): ImageAction[] {
    return images.map((img: any) => ({
      type: 'image' as const,
      imageId: img.id,
      filename: img.metadata?.suggestedFilename || img.file?.name || 'Unknown',
      status: 'pending' as const,
      action: 'upload' as const,
      thumbnail: img.preview,
      metadata: {
        description: img.metadata?.description,
        categories: img.metadata?.categories || [],
        depicts: [
          ...(selectedBandId ? [selectedBandId] : []),
          ...(img.metadata?.selectedBandMembers || []),
        ],
        date: img.metadata?.date,
        location: img.metadata?.gps,
      },
    }));
  }

  /**
   * Build image update actions for existing images that have changed.
   */
  protected buildExistingImageActions(
    existingImages: any[],
    context: ActionBuilderContext
  ): ImageAction[] {
    const actions: ImageAction[] = [];

    existingImages.forEach((img: any) => {
      // Capture original state when first seen
      if (!context.originalImageStateRef.current.has(img.id)) {
        const originalFromCommons = img._originalState || {
          wikitext: img.metadata?.wikitext || '',
          selectedBandMembers: img.metadata?.selectedBandMembers || [],
          captions: img.metadata?.captions || [],
        };
        context.originalImageStateRef.current.set(img.id, originalFromCommons);
      }

      const originalState = context.originalImageStateRef.current.get(img.id);
      const currentWikitext = img.metadata?.wikitext || '';
      const wikitextChanged = originalState && currentWikitext !== originalState.wikitext;

      if (img.commonsPageId && wikitextChanged) {
        actions.push({
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
          },
        });
      }
    });

    return actions;
  }

  // ==========================================
  // Structured data helpers
  // ==========================================

  /**
   * Build structured data actions for new image uploads.
   */
  protected buildNewImageStructuredData(
    images: any[],
    selectedBandId?: string
  ): StructuredDataAction[] {
    return images.map((img: any) => {
      const depicts = [
        ...(selectedBandId ? [selectedBandId] : []),
        ...(img.metadata?.selectedBandMembers || []),
      ];

      const properties = [
        { property: 'P180', value: depicts, exists: false, needsUpdate: depicts.length > 0 },
        { property: 'P571', value: img.metadata?.date, exists: false, needsUpdate: !!img.metadata?.date },
        { property: 'P1259', value: img.metadata?.gps, exists: false, needsUpdate: !!img.metadata?.gps },
      ];

      if (img.metadata?.captions && img.metadata.captions.length > 0) {
        properties.push({
          property: 'labels',
          value: img.metadata.captions,
          exists: false,
          needsUpdate: true,
        });
      }

      return {
        type: 'structured-data' as const,
        imageId: img.id,
        commonsPageId: 0, // Will be set after upload
        status: 'pending' as const,
        properties,
      };
    });
  }

  /**
   * Build structured data actions for existing images that have changed.
   */
  protected buildExistingImageStructuredData(
    existingImages: any[],
    context: ActionBuilderContext,
    selectedBandId?: string
  ): StructuredDataAction[] {
    const actions: StructuredDataAction[] = [];

    existingImages.forEach((img: any) => {
      const originalState = context.originalImageStateRef.current.get(img.id);
      if (!img.commonsPageId || !originalState) return;

      const currentDepicts = [
        ...(selectedBandId ? [selectedBandId] : []),
        ...(img.metadata?.selectedBandMembers || []),
      ].sort();
      const originalDepicts = [
        ...(selectedBandId ? [selectedBandId] : []),
        ...(originalState.selectedBandMembers || []),
      ].sort();
      const depictsChanged = JSON.stringify(currentDepicts) !== JSON.stringify(originalDepicts);

      const currentCaptions = img.metadata?.captions || [];
      const captionsChanged = JSON.stringify(currentCaptions) !== JSON.stringify(originalState.captions);

      const wikitextChanged = (img.metadata?.wikitext || '') !== originalState.wikitext;
      const shouldUpdate = depictsChanged || captionsChanged || wikitextChanged;

      if (shouldUpdate) {
        const sdProperties = [];
        if (currentDepicts.length > 0) {
          sdProperties.push({ property: 'P180', value: currentDepicts, exists: false, needsUpdate: true });
        }
        if (currentCaptions.length > 0) {
          sdProperties.push({ property: 'labels', value: currentCaptions, exists: false, needsUpdate: true });
        }
        if (sdProperties.length > 0) {
          actions.push({
            type: 'structured-data',
            imageId: img.id,
            commonsPageId: img.commonsPageId,
            status: 'pending',
            properties: sdProperties,
          });
        }
      }
    });

    return actions;
  }

  /**
   * Build P18 (main image) Wikidata action if an image is marked as main image.
   */
  protected buildMainImageActions(
    images: any[],
    existingImages: any[],
    selectedBand: any
  ): WikidataAction[] {
    if (!selectedBand?.id) return [];
    const actions: WikidataAction[] = [];
    const bandName = selectedBand?.labels?.en?.value ||
                     selectedBand?.entity?.labels?.en?.value || 'Band';

    [...images, ...existingImages].forEach((img: any) => {
      if (img.metadata?.setAsMainImage) {
        const filename = img.metadata?.suggestedFilename || img.filename || img.file?.name || 'Unknown';
        actions.push({
          type: 'wikidata',
          entityId: selectedBand.id,
          entityType: 'organization',
          entityLabel: bandName,
          status: 'pending',
          action: 'update',
          changes: [{ property: 'P18', newValue: filename }],
        });
      }
    });

    return actions;
  }

  // ==========================================
  // Abstract methods - subclasses must implement
  // ==========================================

  abstract buildCategoryActions(formData: ActionBuilderFormData): Promise<CategoryAction[]>;
  abstract buildWikidataActions(formData: ActionBuilderFormData): Promise<WikidataAction[]>;
  abstract buildImageActions(formData: ActionBuilderFormData, context: ActionBuilderContext): Promise<ImageAction[]>;
  abstract buildStructuredDataActions(formData: ActionBuilderFormData, context: ActionBuilderContext): Promise<StructuredDataAction[]>;
}
