import {
  PublishAction,
  CategoryAction,
  WikidataAction,
  ImageAction,
  StructuredDataAction,
} from '@/providers/PublishDataProvider';
import { executeCategoryAction } from './category-executor';
import { executeWikidataAction } from './wikidata-executor';
import { executeImageAction, ImageExecutorResult } from './image-executor';
import { executeStructuredDataAction } from './structured-data-executor';

export { executeCategoryAction } from './category-executor';
export { executeWikidataAction } from './wikidata-executor';
export { executeImageAction } from './image-executor';
export type { ImageExecutorResult } from './image-executor';
export { executeStructuredDataAction } from './structured-data-executor';

export interface ExecutorContext {
  people: any[];
  organizations: any[];
  eventDetails: any;
  getImageData: (imageId: string) => any;
}

/**
 * Dispatch and execute any PublishAction based on its type.
 */
export async function executeAction(
  action: PublishAction,
  context: ExecutorContext
): Promise<any> {
  switch (action.type) {
    case 'category':
      return executeCategoryAction(action as CategoryAction);

    case 'wikidata':
      return executeWikidataAction(action as WikidataAction, {
        people: context.people,
        organizations: context.organizations,
        eventDetails: context.eventDetails,
      });

    case 'image':
      return executeImageAction(action as ImageAction, {
        getImageData: context.getImageData,
        organizations: context.organizations,
      });

    case 'structured-data':
      return executeStructuredDataAction(action as StructuredDataAction);

    default:
      throw new Error(`Unknown action type: ${(action as any).type}`);
  }
}
