import React, { useState, useCallback } from 'react';
import { PublishAction, PublishActionGroup, PublishActionStatus } from '../../utils/publish-actions';

interface PublishActionListProps {
  actions: PublishAction[];
  groups?: PublishActionGroup[];
  onExecuteAction?: (actionId: string) => void;
  onCancelAction?: (actionId: string) => void;
  onRetryAction?: (actionId: string) => void;
  showGrouped?: boolean;
  showDetails?: boolean;
  className?: string;
}

interface ActionItemProps {
  action: PublishAction;
  onExecute?: () => void;
  onCancel?: () => void;
  onRetry?: () => void;
  showDetails?: boolean;
}

function ActionStatusIcon({ status }: { status: PublishActionStatus }) {
  const icons = {
    pending: '⏳',
    in_progress: '🔄',
    completed: '✅',
    failed: '❌',
    cancelled: '🚫'
  };
  
  return <span className="text-lg">{icons[status]}</span>;
}

function ActionTypeIcon({ type }: { type: string }) {
  const icons: Record<string, string> = {
    'create-entity': '➕',
    'update-entity': '✏️',
    'create-claim': '🔗',
    'update-claim': '🔄',
    'remove-claim': '🗑️',
    'create-sitelink': '🌐',
    'update-sitelink': '🔄',
    'remove-sitelink': '🗑️',
    'upload-file': '📁',
    'create-category': '📂',
    'update-wikipedia': '📝'
  };
  
  return <span className="text-sm">{icons[type] || '📋'}</span>;
}

function PriorityBadge({ priority }: { priority: number }) {
  const getPriorityColor = (priority: number) => {
    if (priority >= 8) return 'bg-red-100 text-red-800';
    if (priority >= 6) return 'bg-yellow-100 text-yellow-800';
    if (priority >= 4) return 'bg-blue-100 text-blue-800';
    return 'bg-gray-100 text-gray-800';
  };
  
  const getPriorityLabel = (priority: number) => {
    if (priority >= 8) return 'High';
    if (priority >= 6) return 'Medium';
    if (priority >= 4) return 'Low';
    return 'Lowest';
  };
  
  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(priority)}`}>
      {getPriorityLabel(priority)}
    </span>
  );
}

function ActionItem({ action, onExecute, onCancel, onRetry, showDetails }: ActionItemProps) {
  const [showFullDetails, setShowFullDetails] = useState(false);
  
  const canExecute = action.status === 'pending' && !action.dependsOn?.length;
  const canRetry = action.status === 'failed';
  const canCancel = action.status === 'pending' || action.status === 'in_progress';
  
  return (
    <div className="border rounded-lg p-4 bg-white shadow-sm">
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-3 flex-1">
          <div className="flex items-center space-x-2">
            <ActionStatusIcon status={action.status} />
            <ActionTypeIcon type={action.type} />
          </div>
          
          <div className="flex-1 min-w-0">
            <h4 className="font-medium text-gray-900 truncate">{action.title}</h4>
            <p className="text-sm text-gray-600 mt-1">{action.description}</p>
            
            {action.status === 'in_progress' && (
              <div className="mt-2">
                <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                  <span>Progress</span>
                  <span>{action.progress}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${action.progress}%` }}
                  />
                </div>
              </div>
            )}
            
            {action.error && (
              <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">
                {action.error}
              </div>
            )}
            
            <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
              <span>Created: {action.createdAt.toLocaleTimeString()}</span>
              {action.estimatedTime && (
                <span>~{action.estimatedTime}s</span>
              )}
              {action.entityId && (
                <span className="font-mono">{action.entityId}</span>
              )}
            </div>
          </div>
        </div>
        
        <div className="flex items-center space-x-2 ml-4">
          <PriorityBadge priority={action.priority} />
          
          {showDetails && (
            <button
              onClick={() => setShowFullDetails(!showFullDetails)}
              className="text-sm text-gray-500 hover:text-gray-700 p-1"
            >
              {showFullDetails ? '🔼' : '🔽'}
            </button>
          )}
        </div>
      </div>
      
      {action.dependsOn && action.dependsOn.length > 0 && (
        <div className="mt-3 pt-3 border-t border-gray-200">
          <div className="text-xs text-gray-500">
            <span className="font-medium">Depends on:</span>
            <div className="mt-1 flex flex-wrap gap-1">
              {action.dependsOn.map(depId => (
                <span key={depId} className="px-2 py-1 bg-gray-100 rounded text-xs font-mono">
                  {depId.split('_').pop()}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}
      
      {showFullDetails && showDetails && (
        <div className="mt-3 pt-3 border-t border-gray-200">
          <div className="text-xs text-gray-600 space-y-2">
            <div>
              <span className="font-medium">Type:</span> {action.type}
            </div>
            <div>
              <span className="font-medium">Status:</span> {action.status}
            </div>
            {action.entityLabel && (
              <div>
                <span className="font-medium">Entity:</span> {action.entityLabel}
              </div>
            )}
            {Object.keys(action.data).length > 0 && (
              <div>
                <span className="font-medium">Data:</span>
                <pre className="mt-1 text-xs bg-gray-50 p-2 rounded overflow-x-auto">
                  {JSON.stringify(action.data, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* Action buttons */}
      <div className="flex items-center justify-end space-x-2 mt-3 pt-3 border-t border-gray-200">
        {canExecute && onExecute && (
          <button
            onClick={onExecute}
            className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            Execute
          </button>
        )}
        
        {canRetry && onRetry && (
          <button
            onClick={onRetry}
            className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700"
          >
            Retry
          </button>
        )}
        
        {canCancel && onCancel && (
          <button
            onClick={onCancel}
            className="px-3 py-1 text-sm bg-gray-600 text-white rounded hover:bg-gray-700"
          >
            Cancel
          </button>
        )}
      </div>
    </div>
  );
}

function ActionGroup({ 
  group, 
  onExecuteAction, 
  onCancelAction, 
  onRetryAction, 
  showDetails 
}: {
  group: PublishActionGroup;
  onExecuteAction?: (actionId: string) => void;
  onCancelAction?: (actionId: string) => void;
  onRetryAction?: (actionId: string) => void;
  showDetails?: boolean;
}) {
  const [isExpanded, setIsExpanded] = useState(true);
  
  const completedCount = group.actions.filter(a => a.status === 'completed').length;
  const failedCount = group.actions.filter(a => a.status === 'failed').length;
  const progress = (completedCount / group.actions.length) * 100;
  
  return (
    <div className="border rounded-lg bg-gray-50">
      <div 
        className="p-4 cursor-pointer hover:bg-gray-100 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <span className="text-lg">{isExpanded ? '🔽' : '▶️'}</span>
            <div>
              <h3 className="font-medium text-gray-900">{group.title}</h3>
              <p className="text-sm text-gray-600">{group.description}</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="text-sm text-gray-500">
              {completedCount}/{group.actions.length} completed
              {failedCount > 0 && (
                <span className="ml-2 text-red-600">({failedCount} failed)</span>
              )}
            </div>
            
            <div className="w-20 bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>
      </div>
      
      {isExpanded && (
        <div className="px-4 pb-4 space-y-3">
          {group.actions.map(action => (
            <ActionItem
              key={action.id}
              action={action}
              onExecute={onExecuteAction ? () => onExecuteAction(action.id) : undefined}
              onCancel={onCancelAction ? () => onCancelAction(action.id) : undefined}
              onRetry={onRetryAction ? () => onRetryAction(action.id) : undefined}
              showDetails={showDetails}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function PublishActionList({
  actions,
  groups = [],
  onExecuteAction,
  onCancelAction,
  onRetryAction,
  showGrouped = true,
  showDetails = true,
  className = ""
}: PublishActionListProps) {
  const [filter, setFilter] = useState<{
    status?: PublishActionStatus;
    type?: string;
    priority?: number;
  }>({});

  const filteredActions = actions.filter(action => {
    if (filter.status && action.status !== filter.status) return false;
    if (filter.type && action.type !== filter.type) return false;
    if (filter.priority && action.priority < filter.priority) return false;
    return true;
  });

  const handleExecuteAction = useCallback((actionId: string) => {
    onExecuteAction?.(actionId);
  }, [onExecuteAction]);

  const handleCancelAction = useCallback((actionId: string) => {
    onCancelAction?.(actionId);
  }, [onCancelAction]);

  const handleRetryAction = useCallback((actionId: string) => {
    onRetryAction?.(actionId);
  }, [onRetryAction]);

  if (actions.length === 0) {
    return (
      <div className={`text-center py-8 text-gray-500 ${className}`}>
        <div className="text-4xl mb-2">📋</div>
        <p>No actions to display</p>
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4 p-4 bg-gray-50 rounded-lg">
        <div>
          <label className="text-sm font-medium text-gray-700 mr-2">Status:</label>
          <select
            className="text-sm border border-gray-300 rounded px-2 py-1"
            value={filter.status || ''}
            onChange={(e) => setFilter(prev => ({
              ...prev,
              status: e.target.value as PublishActionStatus || undefined
            }))}
          >
            <option value="">All</option>
            <option value="pending">Pending</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="failed">Failed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
        
        <div>
          <label className="text-sm font-medium text-gray-700 mr-2">Type:</label>
          <select
            className="text-sm border border-gray-300 rounded px-2 py-1"
            value={filter.type || ''}
            onChange={(e) => setFilter(prev => ({
              ...prev,
              type: e.target.value || undefined
            }))}
          >
            <option value="">All</option>
            <option value="create-entity">Create Entity</option>
            <option value="update-entity">Update Entity</option>
            <option value="create-claim">Create Claim</option>
            <option value="update-claim">Update Claim</option>
            <option value="upload-file">Upload File</option>
            <option value="create-category">Create Category</option>
            <option value="update-wikipedia">Update Wikipedia</option>
          </select>
        </div>
        
        <div>
          <label className="text-sm font-medium text-gray-700 mr-2">Min Priority:</label>
          <select
            className="text-sm border border-gray-300 rounded px-2 py-1"
            value={filter.priority || ''}
            onChange={(e) => setFilter(prev => ({
              ...prev,
              priority: e.target.value ? parseInt(e.target.value) : undefined
            }))}
          >
            <option value="">All</option>
            <option value="8">High (8+)</option>
            <option value="6">Medium (6+)</option>
            <option value="4">Low (4+)</option>
          </select>
        </div>

        <div className="ml-auto text-sm text-gray-600">
          {filteredActions.length} of {actions.length} actions shown
        </div>
      </div>

      {/* Actions */}
      {showGrouped && groups.length > 0 ? (
        <div className="space-y-3">
          {groups.map(group => (
            <ActionGroup
              key={group.id}
              group={group}
              onExecuteAction={handleExecuteAction}
              onCancelAction={handleCancelAction}
              onRetryAction={handleRetryAction}
              showDetails={showDetails}
            />
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredActions.map(action => (
            <ActionItem
              key={action.id}
              action={action}
              onExecute={() => handleExecuteAction(action.id)}
              onCancel={() => handleCancelAction(action.id)}
              onRetry={() => handleRetryAction(action.id)}
              showDetails={showDetails}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default PublishActionList;