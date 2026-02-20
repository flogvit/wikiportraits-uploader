import {
  CategoryAction,
  WikidataAction,
  ImageAction,
  StructuredDataAction,
} from '@/providers/PublishDataProvider';
import { ActionBuilderFormData, ActionBuilderContext } from './types';
import { BaseActionBuilder } from './base-action-builder';

/**
 * ActionBuilder for general upload workflows.
 * Handles basic image uploads without event-specific category/wikidata logic.
 */
export class GeneralActionBuilder extends BaseActionBuilder {

  async buildCategoryActions(_formData: ActionBuilderFormData): Promise<CategoryAction[]> {
    // General uploads don't auto-generate categories
    return [];
  }

  async buildWikidataActions(_formData: ActionBuilderFormData): Promise<WikidataAction[]> {
    // General uploads don't create Wikidata entities
    return [];
  }

  async buildImageActions(formData: ActionBuilderFormData, context: ActionBuilderContext): Promise<ImageAction[]> {
    const images = formData.files?.queue || [];
    const existingImages = formData.files?.existing || [];

    return [
      ...this.buildNewImageActions(images),
      ...this.buildExistingImageActions(existingImages, context),
    ];
  }

  async buildStructuredDataActions(formData: ActionBuilderFormData, context: ActionBuilderContext): Promise<StructuredDataAction[]> {
    const images = formData.files?.queue || [];
    const existingImages = formData.files?.existing || [];

    return [
      ...this.buildNewImageStructuredData(images),
      ...this.buildExistingImageStructuredData(existingImages, context),
    ];
  }
}
