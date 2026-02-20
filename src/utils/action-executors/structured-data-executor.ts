import { StructuredDataAction } from '@/providers/PublishDataProvider';
import { logger } from '@/utils/logger';

/**
 * Execute a structured data action (update depicts, captions, etc.)
 * on Wikimedia Commons.
 */
export async function executeStructuredDataAction(
  action: StructuredDataAction
): Promise<void> {
  if (!action.commonsPageId || action.commonsPageId === 0) {
    throw new Error('Image must be uploaded before adding structured data. pageId is missing.');
  }

  logger.info('StructuredDataExecutor', 'Publishing structured data for image', {
    imageId: action.imageId,
    pageId: action.commonsPageId,
  });

  // Process each property that needs updating
  for (const prop of action.properties.filter(p => p.needsUpdate)) {
    if (prop.property === 'labels') {
      await updateCaptions(action.commonsPageId, prop.value);
    } else if (prop.property === 'P180') {
      await updateDepicts(action.commonsPageId, prop.value);
    }
  }

  logger.info('StructuredDataExecutor', 'Structured data completed for', action.imageId);
}

async function updateCaptions(pageId: number, captions: any[]): Promise<void> {
  const captionsList = Array.isArray(captions) ? captions : [];
  logger.debug('StructuredDataExecutor', 'Updating captions', captionsList);

  const response = await fetch('/api/commons/update-captions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pageId, captions: captionsList }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to update captions');
  }

  const result = await response.json();
  if (!result.success) {
    throw new Error(result.message || 'Failed to update captions');
  }

  logger.info('StructuredDataExecutor', 'Updated captions for page ID', pageId);
}

async function updateDepicts(pageId: number, depicts: any[]): Promise<void> {
  const depictsList = (Array.isArray(depicts) ? depicts : []).map(qid => ({
    qid,
    label: qid,
  }));
  logger.debug('StructuredDataExecutor', 'Updating depicts', depictsList);

  const response = await fetch('/api/commons/update-depicts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pageId, depicts: depictsList }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to update depicts');
  }

  const result = await response.json();
  if (!result.success) {
    throw new Error(result.message || 'Failed to update depicts');
  }

  logger.info('StructuredDataExecutor', 'Updated depicts for page ID', pageId);
}
