'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Upload, CheckCircle, AlertCircle, Clock, Loader2, FolderPlus, FileText, Database, ImagePlus } from 'lucide-react';
import { logger } from '@/utils/logger';
import { useUniversalForm } from '@/providers/UniversalFormProvider';
import {
  usePublishData,
  ActionStatus,
  ImageAction,
  StructuredDataAction,
  PublishAction as CentralizedAction,
} from '@/providers/PublishDataProvider';
import { executeAction, ExecutorContext } from '@/utils/action-executors';

interface PublishPaneProps {
  onComplete?: () => void;
}

// Display-only action format used by the UI
interface DisplayAction {
  id: string;
  type: 'category' | 'wikidata' | 'image' | 'structured-data';
  title: string;
  description: string;
  status: ActionStatus;
  error?: string;
  dependsOn?: string[];
  preview?: string;
}

// Stores results from completed actions for propagation to dependents
interface ActionResult {
  entityId?: string;
  pageId?: number;
}

export default function PublishPane({ onComplete }: PublishPaneProps) {
  const form = useUniversalForm();
  const {
    actions: centralizedActions,
    categories,
    wikidataActions,
    imageActions,
    structuredDataActions,
    completedActions,
    errorActions,
    updateActionStatus,
    updateStructuredDataPageId,
    reloadImageFromCommons,
  } = usePublishData();

  const [actions, setActions] = useState<DisplayAction[]>([]);
  const [localCompletedCount, setLocalCompletedCount] = useState(0);
  const [localErrorCount, setLocalErrorCount] = useState(0);
  const [isPublishingAll, setIsPublishingAll] = useState(false);

  // Track completed action results for dependency propagation
  const completedResultsRef = useRef<Map<string, ActionResult>>(new Map());
  const completedIdsRef = useRef<Set<string>>(new Set());

  const people = form.watch('entities.people') || [];
  const organizations = form.watch('entities.organizations') || [];
  const eventDetails = form.watch('eventDetails');

  // Check if an action's dependencies are all satisfied
  const canExecute = useCallback((action: DisplayAction): boolean => {
    if (action.status !== 'pending') return false;
    if (!action.dependsOn?.length) return true;
    return action.dependsOn.every(dep => completedIdsRef.current.has(dep));
  }, []);

  // Convert centralized actions to display format
  useEffect(() => {
    const displayActions: DisplayAction[] = [];

    categories.forEach(cat => {
      if (cat.shouldCreate) {
        displayActions.push({
          id: cat.id,
          type: 'category',
          title: `Create Category: ${cat.categoryName}`,
          description: cat.description || 'Category on Wikimedia Commons',
          status: cat.status,
          error: cat.error,
          dependsOn: cat.dependsOn,
        });
      }
    });

    wikidataActions.forEach(wd => {
      displayActions.push({
        id: wd.id,
        type: 'wikidata',
        title: wd.action === 'create' ? `Create ${wd.entityType}: ${wd.entityLabel}` : `Update ${wd.entityLabel}`,
        description: wd.changes?.map(c => `${c.property}: ${c.newValue}`).join(', ') || 'Wikidata update',
        status: wd.status,
        error: wd.error,
        dependsOn: wd.dependsOn,
      });
    });

    imageActions.forEach(img => {
      displayActions.push({
        id: img.id,
        type: 'image',
        title: img.action === 'upload' ? `Upload: ${img.filename}` : `Update: ${img.filename}`,
        description: img.metadata?.description || 'Image file',
        status: img.status,
        error: img.error,
        dependsOn: img.dependsOn,
        preview: img.thumbnail,
      });
    });

    structuredDataActions.forEach(sd => {
      const needsUpdateProps = sd.properties.filter(p => p.needsUpdate);
      if (needsUpdateProps.length > 0 && sd.status !== 'completed') {
        const newImage = form.watch('files.queue')?.find((img: any) => img.id === sd.imageId);
        const existingImage = form.watch('files.existing')?.find((img: any) => img.id === sd.imageId);
        const image = newImage || existingImage;

        const propDescriptions = buildPropertyDescriptions(needsUpdateProps, people, organizations);
        const imageAny = image as any;
        const filename = imageAny?.filename || imageAny?.metadata?.suggestedFilename || imageAny?.file?.name || 'Unknown';

        displayActions.push({
          id: sd.id,
          type: 'structured-data',
          title: `Add structured data: ${filename}`,
          description: propDescriptions.join(', '),
          status: sd.status,
          error: sd.error,
          dependsOn: sd.dependsOn,
          preview: imageAny?.preview || imageAny?.url,
        });
      }
    });

    setActions(displayActions);
    setLocalCompletedCount(completedActions);
    setLocalErrorCount(errorActions);
  }, [centralizedActions, categories, wikidataActions, imageActions, structuredDataActions, completedActions, errorActions, people, organizations, form]);

  // Find the underlying centralized action by its id
  const findCentralizedAction = useCallback((actionId: string): CentralizedAction | undefined => {
    return centralizedActions.find(a => a.id === actionId);
  }, [centralizedActions]);

  // Build executor context
  const getExecutorContext = useCallback((): ExecutorContext => ({
    people,
    organizations,
    eventDetails,
    getImageData: (imageId: string) => {
      const newImages = form.watch('files.queue') || [];
      const existingImagesArr = form.watch('files.existing') || [];
      return [...newImages, ...existingImagesArr].find((img: any) => img.id === imageId);
    },
  }), [people, organizations, eventDetails, form]);

  /**
   * Propagate results from a completed action to its dependents.
   * Updates centralized state so dependent actions have the data they need.
   */
  const propagateResults = useCallback((completedActionId: string, result: any, action: CentralizedAction) => {
    completedIdsRef.current.add(completedActionId);
    const actionResult: ActionResult = {};

    if (action.type === 'image' && (action as ImageAction).action === 'upload' && result?.pageId) {
      actionResult.pageId = result.pageId;
      // Propagate pageId to dependent SDC actions
      const imgAction = action as ImageAction;
      updateStructuredDataPageId(imgAction.imageId, result.pageId);
    }

    if (action.type === 'wikidata' && result?.entityId) {
      actionResult.entityId = result.entityId;
    }

    completedResultsRef.current.set(completedActionId, actionResult);
  }, [updateStructuredDataPageId]);

  const handlePublish = async (actionId: string, actionOverride?: DisplayAction) => {
    const displayAction = actionOverride || actions.find(a => a.id === actionId);
    if (!displayAction) return;

    // Check dependencies before executing
    if (!canExecute(displayAction)) {
      logger.warn('PublishPane', 'Cannot execute action - dependencies not met', actionId);
      return;
    }

    // Mark as in-progress
    setActions(prev =>
      prev.map(a => a.id === actionId ? { ...a, status: 'in-progress' as ActionStatus } : a)
    );

    try {
      const centralizedAction = findCentralizedAction(actionId);
      if (!centralizedAction) throw new Error('Action not found');

      // Execute via dispatcher
      const result = await executeAction(centralizedAction, getExecutorContext());

      // Propagate results to dependents
      propagateResults(actionId, result, centralizedAction);

      // Post-execution side effects
      if (centralizedAction.type === 'image' && (centralizedAction as ImageAction).action === 'update-metadata') {
        await reloadImageFromCommons((centralizedAction as ImageAction).imageId);
      }
      if (centralizedAction.type === 'structured-data') {
        await reloadImageFromCommons((centralizedAction as StructuredDataAction).imageId);
      }

      // Update centralized status
      updateActionStatus(actionId, 'completed');

      // Remove from display list
      setActions(prev => prev.filter(a => a.id !== actionId));
      setLocalCompletedCount(prev => prev + 1);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('PublishPane', 'Action failed', { actionId, error: errorMessage });
      setActions(prev =>
        prev.map(a =>
          a.id === actionId
            ? { ...a, status: 'error' as ActionStatus, error: errorMessage }
            : a
        )
      );
      setLocalErrorCount(prev => prev + 1);
    }
  };

  const handlePublishAll = async () => {
    setIsPublishingAll(true);
    try {
      // Execute actions respecting dependency order.
      // Each iteration picks actions whose dependencies are all completed.
      let maxIterations = 100; // Safety limit
      while (maxIterations-- > 0) {
        // Re-read current actions from state via a synchronous snapshot
        const currentActions = await new Promise<DisplayAction[]>(resolve => {
          setActions(prev => {
            resolve([...prev]);
            return prev;
          });
        });

        const pendingActions = currentActions.filter(a => a.status === 'pending');
        if (pendingActions.length === 0) break;

        // Find next executable action (all dependencies satisfied)
        const nextAction = pendingActions.find(a => canExecute(a));
        if (!nextAction) {
          // No executable actions remain - either all blocked or errored
          logger.warn('PublishPane', 'No more executable actions', {
            pending: pendingActions.length,
            blocked: pendingActions.filter(a => !canExecute(a)).map(a => ({
              id: a.id,
              waitingFor: a.dependsOn?.filter(d => !completedIdsRef.current.has(d)),
            })),
          });
          break;
        }

        await handlePublish(nextAction.id, nextAction);
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    } finally {
      setIsPublishingAll(false);
    }
  };

  // UI helpers
  const getActionIcon = (type: DisplayAction['type']) => {
    switch (type) {
      case 'category': return FolderPlus;
      case 'wikidata': return Database;
      case 'image': return ImagePlus;
      case 'structured-data': return Database;
      default: return FileText;
    }
  };

  const getStatusIcon = (status: ActionStatus) => {
    switch (status) {
      case 'pending': return Clock;
      case 'in-progress': return Loader2;
      case 'completed': return CheckCircle;
      case 'error': return AlertCircle;
      case 'ready': return CheckCircle;
      case 'skipped': return CheckCircle;
      default: return Clock;
    }
  };

  const getStatusColor = (status: ActionStatus) => {
    switch (status) {
      case 'pending': return 'text-gray-500';
      case 'in-progress': return 'text-blue-500 animate-spin';
      case 'completed': return 'text-green-500';
      case 'error': return 'text-red-500';
      case 'ready': return 'text-blue-500';
      case 'skipped': return 'text-gray-400';
      default: return 'text-gray-500';
    }
  };

  const pendingExecutable = actions.filter(a => canExecute(a)).length;

  if (actions.length === 0) {
    return (
      <div className="text-center py-12">
        <CheckCircle className="w-16 h-16 mx-auto mb-4 text-green-500" />
        <h3 className="text-xl font-semibold text-gray-900 mb-2">Nothing to Publish</h3>
        <p className="text-gray-500">
          All categories, templates, and Wikidata entities already exist. No new images to upload.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <Upload className="w-12 h-12 mx-auto mb-4 text-primary" />
        <h2 className="text-2xl font-bold text-card-foreground mb-2">Publish to Commons</h2>
        <p className="text-muted-foreground">Review and publish all changes</p>
      </div>

      {/* Summary */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-gray-900">Publish Summary</h3>
            <div className="text-sm text-gray-600 mt-1">
              {pendingExecutable} ready &bull; {actions.length - pendingExecutable} waiting &bull; {localCompletedCount} completed &bull; {localErrorCount} errors
            </div>
          </div>
          {pendingExecutable > 0 && !isPublishingAll && (
            <button
              onClick={handlePublishAll}
              className="px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium"
            >
              Publish All ({actions.length})
            </button>
          )}
          {isPublishingAll && (
            <div className="flex items-center gap-2 text-blue-600">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span className="font-medium">Publishing...</span>
            </div>
          )}
        </div>
      </div>

      {/* Actions List */}
      <div className="space-y-3">
        {actions.map((action) => {
          const ActionIcon = getActionIcon(action.type);
          const StatusIcon = getStatusIcon(action.status);
          const statusColor = getStatusColor(action.status);
          const isExecutable = canExecute(action);
          const hasDeps = action.dependsOn && action.dependsOn.length > 0;
          const unmetDeps = hasDeps ? action.dependsOn!.filter(d => !completedIdsRef.current.has(d)) : [];

          return (
            <div
              key={action.id}
              className={`bg-card border rounded-lg p-4 ${
                action.status === 'completed' ? 'border-green-200 bg-green-50'
                : action.status === 'error' ? 'border-red-200 bg-red-50'
                : action.status === 'in-progress' ? 'border-blue-200 bg-blue-50'
                : !isExecutable && hasDeps ? 'border-gray-300 bg-gray-100 opacity-60'
                : 'border-gray-200'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3 flex-1">
                  {(action.type === 'image' || action.type === 'structured-data') && action.preview ? (
                    <img src={action.preview} alt="Preview" className="w-16 h-16 object-cover rounded flex-shrink-0" />
                  ) : (
                    <ActionIcon className="w-5 h-5 text-gray-600 flex-shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-gray-900">{action.title}</h4>
                    <p className="text-sm text-gray-600 mt-1">{action.description}</p>
                    {!isExecutable && unmetDeps.length > 0 && (
                      <p className="text-xs text-gray-500 mt-2">
                        Waiting for: {unmetDeps.length} prerequisite{unmetDeps.length !== 1 ? 's' : ''}
                      </p>
                    )}
                    {action.error && (
                      <p className="text-sm text-red-600 mt-2">Error: {action.error}</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3 ml-4">
                  <StatusIcon className={`w-5 h-5 ${statusColor} flex-shrink-0`} />
                  {action.status === 'pending' && isExecutable && !isPublishingAll && (
                    <button
                      onClick={() => handlePublish(action.id)}
                      className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors text-sm font-medium"
                    >
                      Publish
                    </button>
                  )}
                  {action.status === 'pending' && !isExecutable && (
                    <span className="text-sm text-gray-500">Waiting...</span>
                  )}
                  {action.status === 'completed' && (
                    <span className="text-sm text-green-600 font-medium">Done</span>
                  )}
                  {action.status === 'in-progress' && (
                    <span className="text-sm text-blue-600 font-medium">Publishing...</span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Complete Button */}
      {localCompletedCount === actions.length && actions.length > 0 && (
        <div className="text-center">
          <button
            onClick={onComplete}
            className="px-8 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium text-lg"
          >
            All Published - Continue
          </button>
        </div>
      )}
    </div>
  );
}

/**
 * Build human-readable property descriptions for structured data actions.
 */
function buildPropertyDescriptions(
  properties: { property: string; value: any; needsUpdate: boolean }[],
  people: any[],
  organizations: any[]
): string[] {
  const descriptions: string[] = [];

  properties.forEach(p => {
    if (p.property === 'labels') {
      const captions = Array.isArray(p.value) ? p.value : [];
      descriptions.push(`captions in ${captions.length} language${captions.length !== 1 ? 's' : ''}`);
    } else if (p.property === 'P180') {
      const depicts = Array.isArray(p.value) ? p.value : [];
      const entityNames = depicts.map((qid: string) => {
        const person = people.find((p: any) => p.id === qid);
        const org = organizations.find((o: any) => o.id === qid);
        return person?.labels?.en?.value || org?.labels?.en?.value || qid;
      });
      if (entityNames.length > 0) {
        descriptions.push(`depicts: ${entityNames.join(', ')}`);
      }
    } else if (p.property === 'P571') {
      descriptions.push('date taken');
    } else if (p.property === 'P1259') {
      descriptions.push('GPS coordinates');
    } else {
      descriptions.push(p.property);
    }
  });

  return descriptions;
}
