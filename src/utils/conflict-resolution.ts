import { WikidataEntity, DataConflict, WorkflowItem } from '../types/wikidata';

/**
 * Utility functions for detecting and resolving conflicts between Wikidata entities
 */

export interface EntityDiff {
  property: string;
  originalValue: any;
  currentValue: any;
  changeType: 'added' | 'removed' | 'modified';
  path: string[];
}

export interface ConflictResolution {
  strategy: 'keep_original' | 'keep_current' | 'merge' | 'manual';
  resolvedValue: any;
  reason?: string;
}

export interface ConflictResolutionResult {
  conflicts: DataConflict[];
  resolutions: Map<string, ConflictResolution>;
  mergedEntity: WikidataEntity;
}

/**
 * Compares two WikidataEntity objects and returns detailed differences
 */
export function diffWikidataEntities(
  original: WikidataEntity,
  current: WikidataEntity
): EntityDiff[] {
  const diffs: EntityDiff[] = [];

  // Compare labels
  const originalLabels = original.labels || {};
  const currentLabels = current.labels || {};
  const allLabelLanguages = new Set([
    ...Object.keys(originalLabels),
    ...Object.keys(currentLabels)
  ]);

  for (const lang of allLabelLanguages) {
    const originalValue = originalLabels[lang]?.value;
    const currentValue = currentLabels[lang]?.value;

    if (originalValue !== currentValue) {
      diffs.push({
        property: `labels.${lang}`,
        originalValue,
        currentValue,
        changeType: !originalValue ? 'added' : !currentValue ? 'removed' : 'modified',
        path: ['labels', lang, 'value']
      });
    }
  }

  // Compare descriptions
  const originalDescriptions = original.descriptions || {};
  const currentDescriptions = current.descriptions || {};
  const allDescLanguages = new Set([
    ...Object.keys(originalDescriptions),
    ...Object.keys(currentDescriptions)
  ]);

  for (const lang of allDescLanguages) {
    const originalValue = originalDescriptions[lang]?.value;
    const currentValue = currentDescriptions[lang]?.value;

    if (originalValue !== currentValue) {
      diffs.push({
        property: `descriptions.${lang}`,
        originalValue,
        currentValue,
        changeType: !originalValue ? 'added' : !currentValue ? 'removed' : 'modified',
        path: ['descriptions', lang, 'value']
      });
    }
  }

  // Compare aliases
  const originalAliases = original.aliases || {};
  const currentAliases = current.aliases || {};
  const allAliasLanguages = new Set([
    ...Object.keys(originalAliases),
    ...Object.keys(currentAliases)
  ]);

  for (const lang of allAliasLanguages) {
    const originalValues = originalAliases[lang]?.map(a => a.value) || [];
    const currentValues = currentAliases[lang]?.map(a => a.value) || [];

    if (JSON.stringify(originalValues) !== JSON.stringify(currentValues)) {
      diffs.push({
        property: `aliases.${lang}`,
        originalValue: originalValues,
        currentValue: currentValues,
        changeType: 'modified',
        path: ['aliases', lang]
      });
    }
  }

  // Compare claims
  const originalClaims = original.claims || {};
  const currentClaims = current.claims || {};
  const allProperties = new Set([
    ...Object.keys(originalClaims),
    ...Object.keys(currentClaims)
  ]);

  for (const property of allProperties) {
    const originalStatements = originalClaims[property] || [];
    const currentStatements = currentClaims[property] || [];

    // Simple comparison - could be enhanced for more sophisticated claim comparison
    if (JSON.stringify(originalStatements) !== JSON.stringify(currentStatements)) {
      diffs.push({
        property: `claims.${property}`,
        originalValue: originalStatements,
        currentValue: currentStatements,
        changeType: originalStatements.length === 0 ? 'added' : 
                   currentStatements.length === 0 ? 'removed' : 'modified',
        path: ['claims', property]
      });
    }
  }

  return diffs;
}

/**
 * Converts EntityDiff objects to DataConflict objects
 */
export function diffsToConflicts(
  diffs: EntityDiff[],
  source: 'user' | 'external' = 'user'
): DataConflict[] {
  return diffs.map(diff => ({
    property: diff.property,
    originalValue: diff.originalValue,
    currentValue: diff.currentValue,
    conflictType: diff.changeType === 'added' ? 'add' : 
                  diff.changeType === 'removed' ? 'delete' : 'edit',
    source
  }));
}

/**
 * Detects conflicts between the original data and external changes
 */
export function detectConflicts(
  workflowItem: WorkflowItem<WikidataEntity>,
  externalEntity: WikidataEntity
): DataConflict[] {
  // If the item is new, there can't be conflicts with external changes
  if (workflowItem.new) {
    return [];
  }

  // Compare original data with external data to detect external changes
  const externalDiffs = diffWikidataEntities(workflowItem.orgData, externalEntity);
  const externalConflicts = diffsToConflicts(externalDiffs, 'external');

  // Compare original data with current data to detect user changes
  const userDiffs = diffWikidataEntities(workflowItem.orgData, workflowItem.data);
  const userConflicts = diffsToConflicts(userDiffs, 'user');

  // Find conflicts where both user and external made changes to the same property
  const conflicts: DataConflict[] = [];
  
  for (const userConflict of userConflicts) {
    const externalConflict = externalConflicts.find(c => c.property === userConflict.property);
    if (externalConflict) {
      // Both user and external modified the same property - this is a conflict
      conflicts.push({
        property: userConflict.property,
        originalValue: userConflict.originalValue,
        currentValue: userConflict.currentValue,
        conflictType: 'edit',
        source: 'user'
      });
    }
  }

  return conflicts;
}

/**
 * Automatic conflict resolution strategies
 */
export class ConflictResolver {
  /**
   * Resolves conflicts using specified strategies
   */
  static resolveConflicts(
    conflicts: DataConflict[],
    strategies: Map<string, ConflictResolution['strategy']> = new Map()
  ): Map<string, ConflictResolution> {
    const resolutions = new Map<string, ConflictResolution>();

    for (const conflict of conflicts) {
      const strategy = strategies.get(conflict.property) || 'manual';
      const resolution = this.resolveConflict(conflict, strategy);
      resolutions.set(conflict.property, resolution);
    }

    return resolutions;
  }

  /**
   * Resolves a single conflict using the specified strategy
   */
  private static resolveConflict(
    conflict: DataConflict,
    strategy: ConflictResolution['strategy']
  ): ConflictResolution {
    switch (strategy) {
      case 'keep_original':
        return {
          strategy,
          resolvedValue: conflict.originalValue,
          reason: 'Keeping original value'
        };

      case 'keep_current':
        return {
          strategy,
          resolvedValue: conflict.currentValue,
          reason: 'Keeping current value'
        };

      case 'merge':
        return {
          strategy,
          resolvedValue: this.mergeValues(conflict.originalValue, conflict.currentValue),
          reason: 'Merged values'
        };

      case 'manual':
      default:
        return {
          strategy: 'manual',
          resolvedValue: conflict.currentValue,
          reason: 'Manual resolution required'
        };
    }
  }

  /**
   * Attempts to merge two values intelligently
   */
  private static mergeValues(originalValue: any, currentValue: any): any {
    // If either value is null/undefined, prefer the other
    if (!originalValue) return currentValue;
    if (!currentValue) return originalValue;

    // For arrays, merge and deduplicate
    if (Array.isArray(originalValue) && Array.isArray(currentValue)) {
      const merged = [...originalValue, ...currentValue];
      return Array.from(new Set(merged.map(v => JSON.stringify(v)))).map(v => JSON.parse(v));
    }

    // For objects, merge properties
    if (typeof originalValue === 'object' && typeof currentValue === 'object') {
      return { ...originalValue, ...currentValue };
    }

    // For primitives, prefer current value
    return currentValue;
  }

  /**
   * Applies conflict resolutions to a WorkflowItem
   */
  static applyResolutions(
    workflowItem: WorkflowItem<WikidataEntity>,
    resolutions: Map<string, ConflictResolution>
  ): WorkflowItem<WikidataEntity> {
    const resolvedEntity = { ...workflowItem.data };

    for (const [property, resolution] of resolutions) {
      if (resolution.strategy !== 'manual') {
        this.setPropertyValue(resolvedEntity, property, resolution.resolvedValue);
      }
    }

    return {
      ...workflowItem,
      data: resolvedEntity,
      conflicts: workflowItem.conflicts?.filter(c => !resolutions.has(c.property)),
      lastModified: new Date(),
      version: workflowItem.version + 1
    };
  }

  /**
   * Sets a property value on an entity using dot notation
   */
  private static setPropertyValue(entity: WikidataEntity, property: string, value: any): void {
    const path = property.split('.');
    let current: any = entity;

    for (let i = 0; i < path.length - 1; i++) {
      const key = path[i];
      if (!(key in current)) {
        current[key] = {};
      }
      current = current[key];
    }

    current[path[path.length - 1]] = value;
  }
}

/**
 * Validates that a WorkflowItem has no unresolved conflicts
 */
export function validateNoConflicts(workflowItem: WorkflowItem<WikidataEntity>): {
  valid: boolean;
  unresolvedConflicts: DataConflict[];
} {
  const unresolvedConflicts = workflowItem.conflicts || [];
  return {
    valid: unresolvedConflicts.length === 0,
    unresolvedConflicts
  };
}

/**
 * Creates a new WorkflowItem with conflict detection
 */
export function createWorkflowItem<T = WikidataEntity>(
  data: T,
  isNew: boolean = false,
  originalData?: T
): WorkflowItem<T> {
  return {
    orgData: originalData || data,
    data,
    new: isNew,
    dirty: false,
    conflicts: [],
    lastModified: new Date(),
    version: 1
  };
}

/**
 * Updates a WorkflowItem with new data and conflict detection
 */
export function updateWorkflowItem<T = WikidataEntity>(
  workflowItem: WorkflowItem<T>,
  newData: T,
  externalData?: T
): WorkflowItem<T> {
  const updated: WorkflowItem<T> = {
    ...workflowItem,
    data: newData,
    dirty: true,
    lastModified: new Date(),
    version: workflowItem.version + 1
  };

  // Detect conflicts if external data is provided
  if (externalData && !workflowItem.new) {
    const conflicts = detectConflicts(
      workflowItem as WorkflowItem<WikidataEntity>,
      externalData as WikidataEntity
    );
    updated.conflicts = conflicts;
  }

  return updated;
}