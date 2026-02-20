import { ImageAction } from '@/providers/PublishDataProvider';
import { logger } from '@/utils/logger';

interface ImageExecutorContext {
  /** Function to get image data from form by ID */
  getImageData: (imageId: string) => any;
  organizations: any[];
}

export interface ImageExecutorResult {
  pageId?: number;
  isUpdate: boolean;
}

/**
 * Execute an image action (upload or update metadata).
 */
export async function executeImageAction(
  action: ImageAction,
  context: ImageExecutorContext
): Promise<ImageExecutorResult> {
  const imageData = context.getImageData(action.imageId);

  if (!imageData) {
    throw new Error('Image not found');
  }

  if (action.action === 'update-metadata') {
    return executeMetadataUpdate(action, imageData);
  }

  if (action.action === 'upload') {
    const result = await executeUpload(action, imageData);

    // If this image is marked as main image, add P18 claim
    if (imageData.metadata?.setAsMainImage) {
      await addMainImageClaim(imageData, context.organizations);
    }

    return result;
  }

  throw new Error(`Unknown image action: ${action.action}`);
}

async function executeUpload(action: ImageAction, imageData: any): Promise<ImageExecutorResult> {
  if (!imageData.file) {
    throw new Error('Image file not found for upload');
  }

  const filename = imageData.metadata?.suggestedFilename || imageData.file.name;
  const wikitext = imageData.metadata?.wikitext || '';

  const formData = new FormData();
  formData.append('file', imageData.file);
  formData.append('filename', filename);
  formData.append('text', wikitext);
  formData.append('comment', 'Uploaded via WikiPortraits uploader');

  const response = await fetch('/api/commons/upload', {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to upload image');
  }

  const result = await response.json();
  if (!result.success) {
    throw new Error(result.message || 'Failed to upload image');
  }

  const pageId = result.pageId || result.data?.imageinfo?.pageid;
  logger.info('ImageExecutor', 'Upload completed', { pageId, filename });

  return { pageId, isUpdate: false };
}

async function executeMetadataUpdate(action: ImageAction, imageData: any): Promise<ImageExecutorResult> {
  const wikitext = imageData.metadata?.wikitext;
  if (!wikitext) {
    throw new Error('No wikitext available for update');
  }

  const response = await fetch('/api/commons/edit-page', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      filename: imageData.filename || action.filename,
      wikitext,
      summary: 'Updated file description and metadata via WikiPortraits',
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to update image');
  }

  const result = await response.json();
  if (!result.success) {
    throw new Error(result.error || 'Failed to update image');
  }

  logger.info('ImageExecutor', 'Metadata updated for', action.filename);

  return { pageId: imageData.commonsPageId, isUpdate: true };
}

async function addMainImageClaim(imageData: any, organizations: any[]): Promise<void> {
  const org = organizations.find((o: any) => o.id);
  if (!org?.id) return;

  try {
    const commonsFilename = imageData?.filename || imageData?.metadata?.suggestedFilename || imageData?.file?.name || '';
    const response = await fetch('/api/wikidata/create-claim', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        entityId: org.id,
        propertyId: 'P18',
        value: commonsFilename,
      }),
    });

    if (!response.ok) {
      logger.error('ImageExecutor', 'Failed to add P18 claim', await response.text());
    } else {
      logger.info('ImageExecutor', `Added P18 (main image) to ${org.id}`);
    }
  } catch (error) {
    logger.error('ImageExecutor', 'Error adding P18 claim', error);
    // Don't fail the upload if P18 addition fails
  }
}
