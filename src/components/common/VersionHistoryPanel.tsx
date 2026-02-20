import React, { useState, useMemo } from 'react';
import { DataVersion, VersionDiff } from '../../utils/data-versioning';
import { useVersionHistory } from '../../hooks/useVersionHistory';
import { logger } from '@/utils/logger';

export interface VersionHistoryPanelProps<T = any> {
  dataId: string;
  currentData?: T;
  onRestore?: (data: T) => void;
  onDataChange?: (data: T) => void;
  className?: string;
  maxHeight?: string;
  showDiff?: boolean;
  showBranchingControls?: boolean;
  allowRestore?: boolean;
  compactView?: boolean;
}

export function VersionHistoryPanel<T = any>({
  dataId,
  currentData,
  onRestore,
  onDataChange,
  className = '',
  maxHeight = '400px',
  showDiff = true,
  showBranchingControls = false,
  allowRestore = true,
  compactView = false
}: VersionHistoryPanelProps<T>) {
  const {
    versions,
    currentVersion,
    isLoading,
    error,
    hasChanges,
    saveVersion,
    restoreVersion,
    compareVersions,
    createBranch,
    getVersionDiff,
    previewRestore,
    searchVersions,
    getStats,
    canUndo,
    canRedo
  } = useVersionHistory<T>({
    dataId,
    trackChanges: true,
    enableBranching: showBranchingControls
  });

  // Local state
  const [selectedVersions, setSelectedVersions] = useState<Set<string>>(new Set());
  const [showingDiff, setShowingDiff] = useState<string | null>(null);
  const [searchText, setSearchText] = useState('');
  const [showPreview, setShowPreview] = useState<string | null>(null);
  const [branchName, setBranchName] = useState('');
  const [showBranchDialog, setShowBranchDialog] = useState<string | null>(null);

  // Filter versions based on search
  const filteredVersions = useMemo(() => {
    if (!searchText) return versions;
    return searchVersions(searchText);
  }, [versions, searchText, searchVersions]);

  // Get diff for selected versions
  const selectedVersionDiff = useMemo(() => {
    const selected = Array.from(selectedVersions);
    if (selected.length === 2) {
      return compareVersions(selected[0], selected[1]);
    }
    return null;
  }, [selectedVersions, compareVersions]);

  // Handle version selection
  const toggleVersionSelection = (versionId: string) => {
    const newSelection = new Set(selectedVersions);
    if (newSelection.has(versionId)) {
      newSelection.delete(versionId);
    } else {
      // Limit to 2 selections for comparison
      if (newSelection.size >= 2) {
        const oldestSelected = Array.from(newSelection)[0];
        newSelection.delete(oldestSelected);
      }
      newSelection.add(versionId);
    }
    setSelectedVersions(newSelection);
  };

  // Handle save current data
  const handleSave = async () => {
    if (!currentData) return;
    
    try {
      await saveVersion(currentData, 'Manual save');
    } catch (error) {
      logger.error('VersionHistoryPanel', 'Failed to save version', error);
    }
  };

  // Handle restore
  const handleRestore = async (versionId: string) => {
    const success = await restoreVersion(versionId);
    if (success && onRestore) {
      const version = versions.find(v => v.id === versionId);
      if (version) {
        onRestore(version.data);
      }
    }
  };

  // Handle branch creation
  const handleCreateBranch = async (versionId: string) => {
    if (!branchName.trim()) return;
    
    const branchId = await createBranch(versionId, branchName.trim());
    if (branchId) {
      setBranchName('');
      setShowBranchDialog(null);
    }
  };

  // Format date
  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  // Get operation icon
  const getOperationIcon = (operation: string) => {
    switch (operation) {
      case 'create': return '➕';
      case 'update': return '✏️';
      case 'delete': return '❌';
      case 'restore': return '↩️';
      default: return '📝';
    }
  };

  // Get version status
  const getVersionStatus = (version: DataVersion<T>) => {
    if (version.id === currentVersion?.id) return 'current';
    if (version.metadata.tags?.includes('branch')) return 'branch';
    if (version.metadata.tags?.includes('backup')) return 'backup';
    return 'normal';
  };

  if (error) {
    return (
      <div className={`bg-red-50 border border-red-200 rounded-md p-4 ${className}`}>
        <div className="text-red-800">Error: {error}</div>
      </div>
    );
  }

  return (
    <div className={`bg-white border rounded-lg shadow-sm ${className}`}>
      {/* Header */}
      <div className="p-4 border-b">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900">
            Version History
          </h3>
          <div className="flex items-center space-x-2">
            {hasChanges && (
              <button
                onClick={handleSave}
                disabled={isLoading}
                className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:opacity-50"
              >
                Save
              </button>
            )}
            <span className="text-sm text-gray-500">
              {versions.length} versions
            </span>
          </div>
        </div>

        {/* Search */}
        <div className="mt-3">
          <input
            type="text"
            placeholder="Search versions..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Quick actions */}
        <div className="mt-2 flex items-center space-x-2 text-sm">
          <button
            onClick={() => setSelectedVersions(new Set())}
            disabled={selectedVersions.size === 0}
            className="text-gray-500 hover:text-gray-700 disabled:opacity-50"
          >
            Clear selection ({selectedVersions.size})
          </button>
          {selectedVersions.size === 2 && (
            <button
              onClick={() => setShowingDiff(showingDiff ? null : 'compare')}
              className="text-blue-600 hover:text-blue-700"
            >
              {showingDiff ? 'Hide' : 'Show'} Diff
            </button>
          )}
        </div>
      </div>

      {/* Diff view */}
      {showingDiff && selectedVersionDiff && (
        <div className="p-4 border-b bg-gray-50">
          <h4 className="font-medium text-gray-900 mb-2">Changes</h4>
          <div className="text-sm text-gray-600 mb-2">
            {selectedVersionDiff.summary.total} changes: 
            {selectedVersionDiff.summary.added > 0 && ` +${selectedVersionDiff.summary.added} added`}
            {selectedVersionDiff.summary.modified > 0 && ` ~${selectedVersionDiff.summary.modified} modified`}
            {selectedVersionDiff.summary.deleted > 0 && ` -${selectedVersionDiff.summary.deleted} deleted`}
          </div>
          <div className="max-h-40 overflow-y-auto space-y-1">
            {selectedVersionDiff.changes.map((change, index) => (
              <div key={index} className="text-sm font-mono">
                <span className={`inline-block w-6 ${
                  change.type === 'add' ? 'text-green-600' : 
                  change.type === 'delete' ? 'text-red-600' : 'text-yellow-600'
                }`}>
                  {change.type === 'add' ? '+' : change.type === 'delete' ? '-' : '~'}
                </span>
                <span className="text-gray-700">{change.field}</span>
                {change.newValue !== undefined && (
                  <span className="text-gray-500 ml-2">
                    → {JSON.stringify(change.newValue).slice(0, 50)}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Version list */}
      <div 
        className="overflow-y-auto"
        style={{ maxHeight }}
      >
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-2 text-gray-600">Loading versions...</span>
          </div>
        ) : filteredVersions.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <span className="text-4xl mb-2 block">📂</span>
            <p>No versions found</p>
          </div>
        ) : (
          <div className="divide-y">
            {filteredVersions.map((version) => {
              const status = getVersionStatus(version);
              const isSelected = selectedVersions.has(version.id);
              const diff = showDiff ? getVersionDiff(version.id) : null;
              
              return (
                <div
                  key={version.id}
                  className={`p-4 hover:bg-gray-50 ${isSelected ? 'bg-blue-50' : ''} ${
                    status === 'current' ? 'border-l-4 border-blue-500' : ''
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleVersionSelection(version.id)}
                          className="rounded border-gray-300"
                        />
                        <span className="text-lg">
                          {getOperationIcon(version.metadata.operation)}
                        </span>
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="font-medium text-gray-900">
                              {formatDate(version.timestamp)}
                            </span>
                            {status === 'current' && (
                              <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                                Current
                              </span>
                            )}
                            {status === 'branch' && (
                              <span className="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded">
                                Branch
                              </span>
                            )}
                          </div>
                          
                          {version.metadata.description && (
                            <p className="text-sm text-gray-600 mt-1">
                              {version.metadata.description}
                            </p>
                          )}
                          
                          {!compactView && (
                            <div className="flex items-center space-x-4 text-xs text-gray-500 mt-1">
                              <span>By {version.metadata.author || 'System'}</span>
                              <span>{version.metadata.source}</span>
                              <span>{(version.metadata.size / 1024).toFixed(1)}KB</span>
                              {diff && (
                                <span>
                                  {diff.summary.total} changes
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2 ml-4">
                      {showBranchingControls && (
                        <button
                          onClick={() => setShowBranchDialog(version.id)}
                          className="text-sm text-purple-600 hover:text-purple-700"
                        >
                          Branch
                        </button>
                      )}
                      
                      <button
                        onClick={() => setShowPreview(
                          showPreview === version.id ? null : version.id
                        )}
                        className="text-sm text-blue-600 hover:text-blue-700"
                      >
                        Preview
                      </button>
                      
                      {allowRestore && status !== 'current' && (
                        <button
                          onClick={() => handleRestore(version.id)}
                          disabled={isLoading}
                          className="text-sm text-green-600 hover:text-green-700 disabled:opacity-50"
                        >
                          Restore
                        </button>
                      )}
                    </div>
                  </div>
                  
                  {/* Preview data */}
                  {showPreview === version.id && (
                    <div className="mt-3 p-3 bg-gray-50 rounded text-sm">
                      <div className="font-medium text-gray-700 mb-2">Preview:</div>
                      <pre className="text-xs text-gray-600 overflow-auto max-h-32">
                        {JSON.stringify(version.data, null, 2)}
                      </pre>
                    </div>
                  )}
                  
                  {/* Tags */}
                  {version.metadata.tags && version.metadata.tags.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {version.metadata.tags.map(tag => (
                        <span
                          key={tag}
                          className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Branch creation dialog */}
      {showBranchDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96">
            <h3 className="text-lg font-medium mb-4">Create Branch</h3>
            <input
              type="text"
              placeholder="Branch name"
              value={branchName}
              onChange={(e) => setBranchName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md mb-4"
              autoFocus
            />
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => {
                  setShowBranchDialog(null);
                  setBranchName('');
                }}
                className="px-4 py-2 text-gray-600 hover:text-gray-700"
              >
                Cancel
              </button>
              <button
                onClick={() => handleCreateBranch(showBranchDialog)}
                disabled={!branchName.trim()}
                className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default VersionHistoryPanel;