import { useState, useCallback, useEffect, useMemo } from 'react';
import {
  dataVersionManager,
  DataVersion,
  FieldChange,
  VersionDiff,
  VersionQuery,
  RestoreOptions
} from '../utils/data-versioning';

export interface UseVersionHistoryOptions {
  dataId: string;
  autoSave?: boolean;
  autoSaveInterval?: number; // milliseconds
  maxVersions?: number;
  trackChanges?: boolean;
  enableBranching?: boolean;
}

export interface UseVersionHistoryReturn<T> {
  // Current state
  currentVersion: DataVersion<T> | null;
  versions: DataVersion<T>[];
  hasChanges: boolean;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  saveVersion: (data: T, description?: string) => Promise<DataVersion<T>>;
  restoreVersion: (versionId: string, options?: RestoreOptions) => Promise<boolean>;
  compareVersions: (fromId: string, toId: string) => VersionDiff | null;
  createBranch: (versionId: string, branchName: string, data?: T) => Promise<string | null>;
  mergeBranch: (branchId: string) => Promise<boolean>;
  
  // Query and filter
  filterVersions: (query: Partial<VersionQuery>) => DataVersion<T>[];
  searchVersions: (searchText: string) => DataVersion<T>[];
  getVersionsByAuthor: (author: string) => DataVersion<T>[];
  getVersionsByDateRange: (start: Date, end: Date) => DataVersion<T>[];
  
  // Diff and comparison
  getChangesSinceVersion: (versionId: string) => FieldChange[] | null;
  getVersionDiff: (versionId: string) => VersionDiff | null;
  previewRestore: (versionId: string) => { preview: T; conflicts: string[] } | null;
  
  // Utilities
  exportHistory: () => string;
  importHistory: (data: string) => boolean;
  cleanup: (days?: number) => { removed: number; preserved: number };
  getStats: () => any;
  
  // State flags
  canUndo: boolean;
  canRedo: boolean;
  hasBranches: boolean;
}

export function useVersionHistory<T = any>(
  options: UseVersionHistoryOptions
): UseVersionHistoryReturn<T> {
  const {
    dataId,
    autoSave = false,
    autoSaveInterval = 30000, // 30 seconds
    maxVersions = 50,
    trackChanges = true,
    enableBranching = false
  } = options;

  // State
  const [versions, setVersions] = useState<DataVersion<T>[]>([]);
  const [currentVersion, setCurrentVersion] = useState<DataVersion<T> | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [lastSavedData, setLastSavedData] = useState<T | null>(null);

  // Load version history on mount
  useEffect(() => {
    loadVersionHistory();
  }, [dataId]);

  // Auto-save setup
  useEffect(() => {
    if (!autoSave || !hasChanges || !lastSavedData) return;

    const intervalId = setInterval(() => {
      if (hasChanges && lastSavedData) {
        saveVersion(lastSavedData, 'Auto-save');
      }
    }, autoSaveInterval);

    return () => clearInterval(intervalId);
  }, [autoSave, hasChanges, lastSavedData, autoSaveInterval]);

  // Load version history from manager
  const loadVersionHistory = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const history = dataVersionManager.getVersionHistory(dataId);
      const latest = dataVersionManager.getLatestVersion<T>(dataId);
      
      setVersions(history as DataVersion<T>[]);
      setCurrentVersion(latest);
      setLastSavedData(latest?.data || null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load version history');
    } finally {
      setIsLoading(false);
    }
  }, [dataId]);

  // Save a new version
  const saveVersion = useCallback(async (
    data: T, 
    description?: string
  ): Promise<DataVersion<T>> => {
    setIsLoading(true);
    setError(null);

    try {
      const version = dataVersionManager.createVersion(dataId, data, {
        description,
        source: 'user',
        operation: versions.length === 0 ? 'create' : 'update'
      });

      // Reload history
      await loadVersionHistory();
      
      setHasChanges(false);
      setLastSavedData(data);

      return version as DataVersion<T>;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save version';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [dataId, versions.length, loadVersionHistory]);

  // Restore to a specific version
  const restoreVersion = useCallback(async (
    versionId: string,
    options: Partial<RestoreOptions> = {}
  ): Promise<boolean> => {
    setIsLoading(true);
    setError(null);

    try {
      const result = dataVersionManager.restoreVersion<T>(dataId, versionId, {
        targetVersion: versionId,
        createBackup: true,
        validateData: true,
        ...options
      });

      if (result.success && result.restoredData) {
        await loadVersionHistory();
        setLastSavedData(result.restoredData);
        setHasChanges(false);
        return true;
      } else {
        setError('Failed to restore version');
        return false;
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to restore version';
      setError(errorMessage);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [dataId, loadVersionHistory]);

  // Compare two versions
  const compareVersions = useCallback((fromId: string, toId: string): VersionDiff | null => {
    return dataVersionManager.compareVersions(dataId, fromId, toId);
  }, [dataId]);

  // Create a branch
  const createBranch = useCallback(async (
    versionId: string, 
    branchName: string, 
    data?: T
  ): Promise<string | null> => {
    if (!enableBranching) {
      setError('Branching is not enabled');
      return null;
    }

    try {
      const result = dataVersionManager.branchFromVersion(dataId, versionId, branchName, data);
      if (result.success) {
        return result.branchId || null;
      } else {
        setError('Failed to create branch');
        return null;
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create branch';
      setError(errorMessage);
      return null;
    }
  }, [dataId, enableBranching]);

  // Merge a branch
  const mergeBranch = useCallback(async (branchId: string): Promise<boolean> => {
    if (!enableBranching) {
      setError('Branching is not enabled');
      return false;
    }

    try {
      const result = dataVersionManager.mergeBranches<T>(dataId, branchId);
      if (result.success) {
        await loadVersionHistory();
        return true;
      } else {
        if (result.conflicts && result.conflicts.length > 0) {
          setError(`Merge conflicts detected: ${result.conflicts.length} conflicts`);
        } else {
          setError('Failed to merge branch');
        }
        return false;
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to merge branch';
      setError(errorMessage);
      return false;
    }
  }, [dataId, enableBranching, loadVersionHistory]);

  // Filter versions
  const filterVersions = useCallback((query: Partial<VersionQuery>): DataVersion<T>[] => {
    return dataVersionManager.getVersionHistory(dataId, query) as DataVersion<T>[];
  }, [dataId]);

  // Search versions by description or metadata
  const searchVersions = useCallback((searchText: string): DataVersion<T>[] => {
    const searchLower = searchText.toLowerCase();
    return versions.filter(version => 
      version.metadata.description?.toLowerCase().includes(searchLower) ||
      version.metadata.author?.toLowerCase().includes(searchLower) ||
      version.metadata.tags?.some(tag => tag.toLowerCase().includes(searchLower))
    );
  }, [versions]);

  // Get versions by author
  const getVersionsByAuthor = useCallback((author: string): DataVersion<T>[] => {
    return filterVersions({ author });
  }, [filterVersions]);

  // Get versions by date range
  const getVersionsByDateRange = useCallback((start: Date, end: Date): DataVersion<T>[] => {
    return filterVersions({ dateRange: { start, end } });
  }, [filterVersions]);

  // Get changes since a specific version
  const getChangesSinceVersion = useCallback((versionId: string) => {
    if (!currentVersion) return null;
    
    const diff = compareVersions(versionId, currentVersion.id);
    return diff?.changes || null;
  }, [currentVersion, compareVersions]);

  // Get diff from previous version
  const getVersionDiff = useCallback((versionId: string): VersionDiff | null => {
    const version = versions.find(v => v.id === versionId);
    if (!version || !version.metadata.parentVersion) return null;
    
    return compareVersions(version.metadata.parentVersion, versionId);
  }, [versions, compareVersions]);

  // Preview what restore would look like
  const previewRestore = useCallback((versionId: string) => {
    const targetVersion = versions.find(v => v.id === versionId);
    if (!targetVersion || !currentVersion) return null;

    const diff = compareVersions(currentVersion.id, versionId);
    const conflicts = diff ? diff.changes.filter(c => c.confidence < 0.8).map(c => c.field) : [];

    return {
      preview: targetVersion.data,
      conflicts
    };
  }, [versions, currentVersion, compareVersions]);

  // Export version history
  const exportHistory = useCallback((): string => {
    return JSON.stringify({
      dataId,
      versions,
      currentVersion,
      timestamp: new Date(),
      version: '1.0'
    });
  }, [dataId, versions, currentVersion]);

  // Import version history
  const importHistory = useCallback((data: string): boolean => {
    try {
      const imported = JSON.parse(data);
      if (imported.dataId === dataId && imported.versions) {
        setVersions(imported.versions);
        setCurrentVersion(imported.currentVersion);
        return true;
      }
      return false;
    } catch {
      setError('Failed to import version history');
      return false;
    }
  }, [dataId]);

  // Cleanup old versions
  const cleanup = useCallback((days = 30) => {
    return dataVersionManager.cleanup({ olderThanDays: days });
  }, []);

  // Get statistics
  const getStats = useCallback(() => {
    return dataVersionManager.getVersionStats(dataId);
  }, [dataId]);

  // Computed properties
  const canUndo = useMemo(() => {
    return versions.length > 1 && currentVersion?.metadata.parentVersion !== undefined;
  }, [versions.length, currentVersion]);

  const canRedo = useMemo(() => {
    // Check if there are versions newer than current
    if (!currentVersion) return false;
    const currentIndex = versions.findIndex(v => v.id === currentVersion.id);
    return currentIndex > 0 && currentIndex < versions.length - 1;
  }, [versions, currentVersion]);

  const hasBranches = useMemo(() => {
    // Check if there are any branch versions
    return versions.some(v => v.metadata.tags?.includes('branch'));
  }, [versions]);

  // Track changes when data updates
  const markAsChanged = useCallback((newData: T) => {
    if (trackChanges && lastSavedData) {
      const hasActualChanges = JSON.stringify(newData) !== JSON.stringify(lastSavedData);
      setHasChanges(hasActualChanges);
    }
  }, [trackChanges, lastSavedData]);

  // Expose method to mark data as changed
  useEffect(() => {
    (window as any).markVersionChanged = markAsChanged;
    return () => {
      delete (window as any).markVersionChanged;
    };
  }, [markAsChanged]);

  return {
    // Current state
    currentVersion,
    versions,
    hasChanges,
    isLoading,
    error,
    
    // Actions
    saveVersion,
    restoreVersion,
    compareVersions,
    createBranch,
    mergeBranch,
    
    // Query and filter
    filterVersions,
    searchVersions,
    getVersionsByAuthor,
    getVersionsByDateRange,
    
    // Diff and comparison
    getChangesSinceVersion,
    getVersionDiff,
    previewRestore,
    
    // Utilities
    exportHistory,
    importHistory,
    cleanup,
    getStats,
    
    // State flags
    canUndo,
    canRedo,
    hasBranches
  };
}

export default useVersionHistory;