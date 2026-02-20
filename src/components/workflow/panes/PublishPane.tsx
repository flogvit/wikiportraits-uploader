'use client';

import { useState, useEffect, useCallback } from 'react';
import { Upload, CheckCircle, AlertCircle, Clock, Loader2, FolderPlus, FileText, Database, ImagePlus } from 'lucide-react';
import { logger } from '@/utils/logger';
import { useUniversalForm } from '@/providers/UniversalFormProvider';
import {
  usePublishData,
  ActionStatus,
  CategoryAction,
  WikidataAction,
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
  canPublish: boolean;
  dependsOn?: string;
  preview?: string;
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

  const people = form.watch('entities.people') || [];
  const organizations = form.watch('entities.organizations') || [];
  const eventDetails = form.watch('eventDetails');

  // Convert centralized actions to display format
  useEffect(() => {
    const displayActions: DisplayAction[] = [];

    categories.forEach(cat => {
      if (cat.shouldCreate) {
        displayActions.push({
          id: `category-${cat.categoryName}`,
          type: 'category',
          title: `Create Category: ${cat.categoryName}`,
          description: cat.description || 'Category on Wikimedia Commons',
          status: cat.status,
          error: cat.error,
          canPublish: !cat.exists,
        });
      }
    });

    wikidataActions.forEach(wd => {
      displayActions.push({
        id: `wikidata-${wd.entityId}`,
        type: 'wikidata',
        title: wd.action === 'create' ? `Create ${wd.entityType}: ${wd.entityLabel}` : `Update ${wd.entityLabel}`,
        description: wd.changes?.map(c => `${c.property}: ${c.newValue}`).join(', ') || 'Wikidata update',
        status: wd.status,
        error: wd.error,
        canPublish: true,
      });
    });

    imageActions.forEach(img => {
      displayActions.push({
        id: `image-${img.imageId}`,
        type: 'image',
        title: img.action === 'upload' ? `Upload: ${img.filename}` : `Update: ${img.filename}`,
        description: img.metadata?.description || 'Image file',
        status: img.status,
        error: img.error,
        canPublish: true,
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
          id: `sdc-${sd.imageId}`,
          type: 'structured-data',
          title: `Add structured data: ${filename}`,
          description: propDescriptions.join(', '),
          status: sd.status,
          error: sd.error,
          canPublish: true,
          preview: imageAny?.preview || imageAny?.url,
        });
      }
    });

    setActions(displayActions);
    setLocalCompletedCount(completedActions);
    setLocalErrorCount(errorActions);
  }, [centralizedActions, categories, wikidataActions, imageActions, structuredDataActions, completedActions, errorActions, people, organizations, form]);

  // Find the underlying centralized action from a display action ID
  const findCentralizedAction = useCallback((actionId: string): CentralizedAction | undefined => {
    if (actionId.startsWith('category-')) {
      const categoryName = actionId.replace('category-', '');
      return categories.find(c => c.categoryName === categoryName);
    }
    if (actionId.startsWith('wikidata-')) {
      const entityId = actionId.replace('wikidata-', '');
      return wikidataActions.find(w => w.entityId === entityId);
    }
    if (actionId.startsWith('image-')) {
      const imageId = actionId.replace('image-', '');
      return imageActions.find(i => i.imageId === imageId);
    }
    if (actionId.startsWith('sdc-')) {
      const imageId = actionId.replace('sdc-', '');
      return structuredDataActions.find(s => s.imageId === imageId);
    }
    return undefined;
  }, [categories, wikidataActions, imageActions, structuredDataActions]);

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

  const handlePublish = async (actionId: string) => {
    const displayAction = actions.find(a => a.id === actionId);
    if (!displayAction) return;

    // Mark as in-progress
    setActions(prev =>
      prev.map(a => a.id === actionId ? { ...a, status: 'in-progress' as ActionStatus } : a)
    );

    try {
      const centralizedAction = findCentralizedAction(actionId);
      if (!centralizedAction) throw new Error('Action not found');

      // Execute via dispatcher
      const result = await executeAction(centralizedAction, getExecutorContext());

      // Post-execution side effects
      if (centralizedAction.type === 'image') {
        const imgAction = centralizedAction as ImageAction;
        if (imgAction.action === 'upload' && result?.pageId) {
          // Update structured data actions with the new pageId
          const sdActions = structuredDataActions.filter(sd => sd.imageId === imgAction.imageId);
          if (sdActions.length > 0) {
            updateStructuredDataPageId(imgAction.imageId, result.pageId);
            setActions(prev => prev.map(a =>
              a.id === `sdc-${imgAction.imageId}` ? { ...a, canPublish: true } : a
            ));
          }
        }
        if (imgAction.action === 'update-metadata') {
          await reloadImageFromCommons(imgAction.imageId);
        }
      }

      if (centralizedAction.type === 'structured-data') {
        await reloadImageFromCommons((centralizedAction as StructuredDataAction).imageId);
      }

      // Update centralized status
      updateActionStatus(actionId, 'completed');
      await new Promise(resolve => setTimeout(resolve, 50));

      // Remove from display list and enable dependent actions
      setActions(prev =>
        prev
          .filter(a => a.id !== actionId)
          .map(a => a.dependsOn === actionId ? { ...a, canPublish: true } : a)
      );
      setLocalCompletedCount(prev => prev + 1);
    } catch (error) {
      setActions(prev =>
        prev.map(a =>
          a.id === actionId
            ? { ...a, status: 'error' as ActionStatus, error: error instanceof Error ? error.message : 'Unknown error' }
            : a
        )
      );
      setLocalErrorCount(prev => prev + 1);
    }
  };

  const handlePublishAll = async () => {
    let remainingActions = actions.filter(a => a.status === 'pending');

    while (remainingActions.some(a => a.canPublish)) {
      const nextAction = remainingActions.find(a => a.canPublish);
      if (!nextAction) break;

      await handlePublish(nextAction.id);
      await new Promise(resolve => setTimeout(resolve, 100));
      remainingActions = remainingActions.filter(a => a.id !== nextAction.id);
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

  const pendingCount = actions.filter(a => a.status === 'pending' && a.canPublish).length;

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
              {pendingCount} pending &bull; {localCompletedCount} completed &bull; {localErrorCount} errors
            </div>
          </div>
          {pendingCount > 0 && (
            <button
              onClick={handlePublishAll}
              className="px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium"
            >
              Publish All ({pendingCount})
            </button>
          )}
        </div>
      </div>

      {/* Actions List */}
      <div className="space-y-3">
        {actions.map((action) => {
          const ActionIcon = getActionIcon(action.type);
          const StatusIcon = getStatusIcon(action.status);
          const statusColor = getStatusColor(action.status);

          return (
            <div
              key={action.id}
              className={`bg-card border rounded-lg p-4 ${
                action.status === 'completed' ? 'border-green-200 bg-green-50'
                : action.status === 'error' ? 'border-red-200 bg-red-50'
                : action.status === 'in-progress' ? 'border-blue-200 bg-blue-50'
                : !action.canPublish && action.dependsOn ? 'border-gray-300 bg-gray-100 opacity-60'
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
                    {action.dependsOn && !action.canPublish && (
                      <p className="text-xs text-gray-500 mt-2">Waiting for prerequisite to complete first</p>
                    )}
                    {action.error && (
                      <p className="text-sm text-red-600 mt-2">Error: {action.error}</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3 ml-4">
                  <StatusIcon className={`w-5 h-5 ${statusColor} flex-shrink-0`} />
                  {action.status === 'pending' && action.canPublish && (
                    <button
                      onClick={() => handlePublish(action.id)}
                      className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors text-sm font-medium"
                    >
                      Publish
                    </button>
                  )}
                  {action.status === 'pending' && !action.canPublish && (
                    <span className="text-sm text-gray-500">{action.dependsOn ? 'Waiting...' : 'Not ready'}</span>
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
