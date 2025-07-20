import { useState, useCallback, useEffect, useMemo } from 'react';
import { WikidataEntity, WorkflowItem } from '../types/wikidata';
import { 
  PublishAction, 
  PublishActionGroup, 
  PublishPlan, 
  PublishActionStatus,
  PublishActionBuilder 
} from '../utils/publish-actions';

export interface UsePublishActionsOptions {
  autoSave?: boolean;
  onActionComplete?: (action: PublishAction) => void;
  onActionFailed?: (action: PublishAction, error: string) => void;
  onPlanComplete?: (plan: PublishPlan) => void;
  onPlanFailed?: (plan: PublishPlan, error: string) => void;
}

export interface UsePublishActionsReturn {
  // Current state
  plan: PublishPlan | null;
  actions: PublishAction[];
  groups: PublishActionGroup[];
  
  // Status
  isBuilding: boolean;
  isExecuting: boolean;
  totalActions: number;
  completedActions: number;
  failedActions: number;
  progress: number;
  
  // Plan management
  buildPlan: (
    workflowItems: WorkflowItem<WikidataEntity>[],
    files?: any[],
    categories?: string[],
    wikipediaUpdates?: any[]
  ) => void;
  clearPlan: () => void;
  
  // Action management
  executeAction: (actionId: string) => Promise<void>;
  cancelAction: (actionId: string) => void;
  retryAction: (actionId: string) => Promise<void>;
  
  // Bulk operations
  executeAll: () => Promise<void>;
  executePlan: () => Promise<void>;
  cancelAll: () => void;
  
  // Action filtering
  getActionsByStatus: (status: PublishActionStatus) => PublishAction[];
  getActionsByType: (type: string) => PublishAction[];
  getActionsByEntity: (entityId: string) => PublishAction[];
  
  // Dependencies
  getExecutableActions: () => PublishAction[];
  getBlockedActions: () => PublishAction[];
  
  // Persistence
  savePlan: () => void;
  loadPlan: (planId: string) => boolean;
  exportPlan: () => string;
  importPlan: (data: string) => boolean;
}

export function usePublishActions(
  options: UsePublishActionsOptions = {}
): UsePublishActionsReturn {
  const {
    autoSave = true,
    onActionComplete,
    onActionFailed,
    onPlanComplete,
    onPlanFailed
  } = options;

  // State
  const [plan, setPlan] = useState<PublishPlan | null>(null);
  const [isBuilding, setIsBuilding] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);

  // Memoized values
  const actions = useMemo(() => plan?.actions || [], [plan]);
  const groups = useMemo(() => plan?.groups || [], [plan]);
  const totalActions = useMemo(() => actions.length, [actions]);
  const completedActions = useMemo(() => 
    actions.filter(a => a.status === 'completed').length, [actions]);
  const failedActions = useMemo(() => 
    actions.filter(a => a.status === 'failed').length, [actions]);
  const progress = useMemo(() => 
    totalActions > 0 ? (completedActions / totalActions) * 100 : 0, [totalActions, completedActions]);

  // Build publish plan
  const buildPlan = useCallback((
    workflowItems: WorkflowItem<WikidataEntity>[],
    files: any[] = [],
    categories: string[] = [],
    wikipediaUpdates: any[] = []
  ) => {
    setIsBuilding(true);
    
    try {
      const builder = new PublishActionBuilder();
      const newPlan = builder.buildPublishPlan(
        workflowItems,
        files,
        categories,
        wikipediaUpdates
      );
      
      setPlan(newPlan);
      console.log('📋 Built publish plan:', newPlan.totalActions, 'actions');
    } catch (error) {
      console.error('Failed to build publish plan:', error);
    } finally {
      setIsBuilding(false);
    }
  }, []);

  // Clear plan
  const clearPlan = useCallback(() => {
    setPlan(null);
    setIsExecuting(false);
    console.log('🧹 Cleared publish plan');
  }, []);

  // Execute single action
  const executeAction = useCallback(async (actionId: string) => {
    if (!plan) return;
    
    const action = actions.find(a => a.id === actionId);
    if (!action || action.status !== 'pending') return;

    // Update action status
    const updatedPlan = {
      ...plan,
      actions: plan.actions.map(a => 
        a.id === actionId 
          ? { ...a, status: 'in_progress' as PublishActionStatus, progress: 0 }
          : a
      )
    };
    setPlan(updatedPlan);

    try {
      // Simulate action execution
      await simulateActionExecution(action);
      
      // Mark as completed
      const completedPlan = {
        ...plan,
        actions: plan.actions.map(a => 
          a.id === actionId 
            ? { 
                ...a, 
                status: 'completed' as PublishActionStatus, 
                progress: 100,
                completedAt: new Date()
              }
            : a
        )
      };
      setPlan(completedPlan);
      
      onActionComplete?.(action);
      console.log('✅ Action completed:', action.title);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      // Mark as failed
      const failedPlan = {
        ...plan,
        actions: plan.actions.map(a => 
          a.id === actionId 
            ? { 
                ...a, 
                status: 'failed' as PublishActionStatus, 
                error: errorMessage,
                updatedAt: new Date()
              }
            : a
        )
      };
      setPlan(failedPlan);
      
      onActionFailed?.(action, errorMessage);
      console.error('❌ Action failed:', action.title, error);
    }
  }, [plan, actions, onActionComplete, onActionFailed]);

  // Cancel action
  const cancelAction = useCallback((actionId: string) => {
    if (!plan) return;
    
    const updatedPlan = {
      ...plan,
      actions: plan.actions.map(a => 
        a.id === actionId 
          ? { ...a, status: 'cancelled' as PublishActionStatus }
          : a
      )
    };
    setPlan(updatedPlan);
    
    console.log('🚫 Action cancelled:', actionId);
  }, [plan]);

  // Retry action
  const retryAction = useCallback(async (actionId: string) => {
    if (!plan) return;
    
    // Reset action to pending
    const updatedPlan = {
      ...plan,
      actions: plan.actions.map(a => 
        a.id === actionId 
          ? { 
              ...a, 
              status: 'pending' as PublishActionStatus, 
              progress: 0,
              error: undefined
            }
          : a
      )
    };
    setPlan(updatedPlan);
    
    // Execute the action
    await executeAction(actionId);
  }, [plan, executeAction]);

  // Execute all actions
  const executeAll = useCallback(async () => {
    if (!plan || isExecuting) return;
    
    setIsExecuting(true);
    
    try {
      const executableActions = getExecutableActions();
      
      for (const action of executableActions) {
        if (action.status === 'pending') {
          await executeAction(action.id);
        }
      }
      
      const finalPlan = plan;
      if (finalPlan.actions.every(a => a.status === 'completed')) {
        onPlanComplete?.(finalPlan);
      } else {
        onPlanFailed?.(finalPlan, 'Some actions failed');
      }
    } catch (error) {
      console.error('Failed to execute all actions:', error);
      onPlanFailed?.(plan, error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setIsExecuting(false);
    }
  }, [plan, isExecuting, executeAction, onPlanComplete, onPlanFailed]);

  // Execute plan (with dependency resolution)
  const executePlan = useCallback(async () => {
    if (!plan || isExecuting) return;
    
    setIsExecuting(true);
    
    try {
      // Execute actions in dependency order
      const remainingActions = [...actions.filter(a => a.status === 'pending')];
      
      while (remainingActions.length > 0) {
        const executableActions = remainingActions.filter(action => {
          // Check if all dependencies are completed
          return !action.dependsOn || action.dependsOn.every(depId => 
            actions.find(a => a.id === depId)?.status === 'completed'
          );
        });
        
        if (executableActions.length === 0) {
          throw new Error('Circular dependency detected or all remaining actions are blocked');
        }
        
        // Execute all executable actions in parallel
        await Promise.all(executableActions.map(action => executeAction(action.id)));
        
        // Remove completed actions
        executableActions.forEach(action => {
          const index = remainingActions.findIndex(a => a.id === action.id);
          if (index !== -1) {
            remainingActions.splice(index, 1);
          }
        });
      }
      
      onPlanComplete?.(plan);
    } catch (error) {
      console.error('Failed to execute plan:', error);
      onPlanFailed?.(plan, error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setIsExecuting(false);
    }
  }, [plan, isExecuting, actions, executeAction, onPlanComplete, onPlanFailed]);

  // Cancel all actions
  const cancelAll = useCallback(() => {
    if (!plan) return;
    
    const updatedPlan = {
      ...plan,
      actions: plan.actions.map(a => 
        a.status === 'pending' || a.status === 'in_progress'
          ? { ...a, status: 'cancelled' as PublishActionStatus }
          : a
      )
    };
    setPlan(updatedPlan);
    setIsExecuting(false);
    
    console.log('🚫 All actions cancelled');
  }, [plan]);

  // Filter actions by status
  const getActionsByStatus = useCallback((status: PublishActionStatus) => {
    return actions.filter(a => a.status === status);
  }, [actions]);

  // Filter actions by type
  const getActionsByType = useCallback((type: string) => {
    return actions.filter(a => a.type === type);
  }, [actions]);

  // Filter actions by entity
  const getActionsByEntity = useCallback((entityId: string) => {
    return actions.filter(a => a.entityId === entityId);
  }, [actions]);

  // Get executable actions (no dependencies or dependencies completed)
  const getExecutableActions = useCallback(() => {
    return actions.filter(action => {
      if (action.status !== 'pending') return false;
      
      // Check dependencies
      if (action.dependsOn) {
        return action.dependsOn.every(depId => 
          actions.find(a => a.id === depId)?.status === 'completed'
        );
      }
      
      return true;
    });
  }, [actions]);

  // Get blocked actions
  const getBlockedActions = useCallback(() => {
    return actions.filter(action => {
      if (action.status !== 'pending') return false;
      
      // Check dependencies
      if (action.dependsOn) {
        return !action.dependsOn.every(depId => 
          actions.find(a => a.id === depId)?.status === 'completed'
        );
      }
      
      return false;
    });
  }, [actions]);

  // Save plan to localStorage
  const savePlan = useCallback(() => {
    if (!plan) return;
    
    try {
      const key = `publish-plan-${plan.id}`;
      localStorage.setItem(key, JSON.stringify(plan));
      console.log('💾 Saved publish plan:', plan.id);
    } catch (error) {
      console.warn('Failed to save plan:', error);
    }
  }, [plan]);

  // Load plan from localStorage
  const loadPlan = useCallback((planId: string): boolean => {
    try {
      const key = `publish-plan-${planId}`;
      const data = localStorage.getItem(key);
      if (data) {
        const loadedPlan = JSON.parse(data) as PublishPlan;
        setPlan(loadedPlan);
        console.log('📂 Loaded publish plan:', planId);
        return true;
      }
    } catch (error) {
      console.warn('Failed to load plan:', error);
    }
    return false;
  }, []);

  // Export plan
  const exportPlan = useCallback((): string => {
    if (!plan) return '';
    
    try {
      return JSON.stringify(plan, null, 2);
    } catch (error) {
      console.error('Failed to export plan:', error);
      return '';
    }
  }, [plan]);

  // Import plan
  const importPlan = useCallback((data: string): boolean => {
    try {
      const importedPlan = JSON.parse(data) as PublishPlan;
      setPlan(importedPlan);
      console.log('📥 Imported publish plan:', importedPlan.id);
      return true;
    } catch (error) {
      console.error('Failed to import plan:', error);
      return false;
    }
  }, []);

  // Auto-save when plan changes
  useEffect(() => {
    if (autoSave && plan) {
      savePlan();
    }
  }, [autoSave, plan, savePlan]);

  return {
    // Current state
    plan,
    actions,
    groups,
    
    // Status
    isBuilding,
    isExecuting,
    totalActions,
    completedActions,
    failedActions,
    progress,
    
    // Plan management
    buildPlan,
    clearPlan,
    
    // Action management
    executeAction,
    cancelAction,
    retryAction,
    
    // Bulk operations
    executeAll,
    executePlan,
    cancelAll,
    
    // Action filtering
    getActionsByStatus,
    getActionsByType,
    getActionsByEntity,
    
    // Dependencies
    getExecutableActions,
    getBlockedActions,
    
    // Persistence
    savePlan,
    loadPlan,
    exportPlan,
    importPlan
  };
}

// Helper function to simulate action execution
async function simulateActionExecution(action: PublishAction): Promise<void> {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));
  
  // Simulate occasional failures
  if (Math.random() < 0.1) {
    throw new Error(`Simulated failure for action: ${action.title}`);
  }
  
  console.log(`🔄 Executed action: ${action.title}`);
}

export default usePublishActions;