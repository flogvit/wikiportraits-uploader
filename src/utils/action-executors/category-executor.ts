import { CategoryAction } from '@/providers/PublishDataProvider';
import { lookupCache, CacheType } from '@/utils/lookup-cache';
import { logger } from '@/utils/logger';

/**
 * Execute a category creation action on Wikimedia Commons.
 * All needed data is taken directly from the action object.
 */
export async function executeCategoryAction(action: CategoryAction): Promise<void> {
  const response = await fetch('/api/commons/create-category', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      categoryName: action.categoryName,
      parentCategory: action.parentCategory,
      description: action.description,
      additionalParents: action.additionalParents,
    }),
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
  lookupCache.invalidate(CacheType.COMMONS_CATEGORY_EXISTS, `Category:${action.categoryName}`);
  logger.debug('CategoryExecutor', 'Created category and invalidated cache', action.categoryName);
}
