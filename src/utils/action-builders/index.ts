import { ActionBuilder } from './types';
import { MusicActionBuilder } from './music-action-builder';
import { GeneralActionBuilder } from './general-action-builder';

export type { ActionBuilder, ActionBuilderFormData, ActionBuilderContext } from './types';

const builderCache = new Map<string, ActionBuilder>();

/**
 * Factory function that returns the appropriate ActionBuilder for a workflow type.
 * Builders are cached to avoid re-creation.
 */
export function getActionBuilder(workflowType: string): ActionBuilder {
  if (builderCache.has(workflowType)) {
    return builderCache.get(workflowType)!;
  }

  let builder: ActionBuilder;
  switch (workflowType) {
    case 'music':
      builder = new MusicActionBuilder();
      break;
    default:
      builder = new GeneralActionBuilder();
      break;
  }

  builderCache.set(workflowType, builder);
  return builder;
}
