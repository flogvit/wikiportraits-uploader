import { useState, useCallback, useEffect } from 'react';
import { WikidataEntity, DataConflict, WorkflowItem } from '../types/wikidata';
import { 
  detectConflicts, 
  ConflictResolver, 
  ConflictResolution,
  createWorkflowItem,
  updateWorkflowItem,
  validateNoConflicts
} from '../utils/conflict-resolution';

export interface ConflictResolutionHook {
  // Conflict state
  conflicts: DataConflict[];
  hasConflicts: boolean;
  
  // Workflow item management
  workflowItem: WorkflowItem<WikidataEntity> | null;
  
  // Conflict resolution
  resolveConflicts: (resolutions: Map<string, ConflictResolution>) => void;
  clearConflicts: () => void;
  
  // Data management
  updateData: (newData: WikidataEntity, externalData?: WikidataEntity) => void;
  createNew: (data: WikidataEntity) => void;
  
  // Validation
  isValid: boolean;
  validate: () => { valid: boolean; unresolvedConflicts: DataConflict[] };
}

export function useConflictResolution(
  initialData?: WikidataEntity,
  isNew: boolean = false
): ConflictResolutionHook {
  const [workflowItem, setWorkflowItem] = useState<WorkflowItem<WikidataEntity> | null>(
    initialData ? createWorkflowItem(initialData, isNew) : null
  );

  const conflicts = workflowItem?.conflicts || [];
  const hasConflicts = conflicts.length > 0;

  const resolveConflicts = useCallback((resolutions: Map<string, ConflictResolution>) => {
    if (!workflowItem) return;
    
    const resolvedItem = ConflictResolver.applyResolutions(workflowItem, resolutions);
    setWorkflowItem(resolvedItem);
  }, [workflowItem]);

  const clearConflicts = useCallback(() => {
    if (!workflowItem) return;
    
    setWorkflowItem({
      ...workflowItem,
      conflicts: [],
      lastModified: new Date(),
      version: workflowItem.version + 1
    });
  }, [workflowItem]);

  const updateData = useCallback((newData: WikidataEntity, externalData?: WikidataEntity) => {
    if (!workflowItem) {
      // Create new workflow item if it doesn't exist
      setWorkflowItem(createWorkflowItem(newData, isNew));
      return;
    }
    
    const updatedItem = updateWorkflowItem(workflowItem, newData, externalData);
    setWorkflowItem(updatedItem);
  }, [workflowItem, isNew]);

  const createNew = useCallback((data: WikidataEntity) => {
    setWorkflowItem(createWorkflowItem(data, true));
  }, []);

  const validate = useCallback(() => {
    if (!workflowItem) return { valid: true, unresolvedConflicts: [] };
    return validateNoConflicts(workflowItem);
  }, [workflowItem]);

  const isValid = validate().valid;

  return {
    conflicts,
    hasConflicts,
    workflowItem,
    resolveConflicts,
    clearConflicts,
    updateData,
    createNew,
    isValid,
    validate
  };
}

export interface ConflictResolutionOptions {
  autoResolve?: boolean;
  autoResolveStrategies?: Map<string, ConflictResolution['strategy']>;
  onConflictDetected?: (conflicts: DataConflict[]) => void;
  onConflictResolved?: (resolutions: Map<string, ConflictResolution>) => void;
}

export function useConflictResolutionWithOptions(
  initialData?: WikidataEntity,
  isNew: boolean = false,
  options: ConflictResolutionOptions = {}
): ConflictResolutionHook {
  const hook = useConflictResolution(initialData, isNew);
  
  // Auto-resolve conflicts if enabled
  useEffect(() => {
    if (options.autoResolve && hook.hasConflicts && options.autoResolveStrategies) {
      const resolutions = ConflictResolver.resolveConflicts(
        hook.conflicts,
        options.autoResolveStrategies
      );
      hook.resolveConflicts(resolutions);
      options.onConflictResolved?.(resolutions);
    }
  }, [hook.conflicts, hook.hasConflicts, options, hook]);

  // Notify when conflicts are detected
  useEffect(() => {
    if (hook.hasConflicts && options.onConflictDetected) {
      options.onConflictDetected(hook.conflicts);
    }
  }, [hook.conflicts, hook.hasConflicts, options]);

  return hook;
}

export default useConflictResolution;