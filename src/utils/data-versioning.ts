import { WikidataEntity } from '../types/wikidata';

/**
 * Data Versioning and Edit History System
 */

export interface DataVersion<T = any> {
  id: string;
  timestamp: Date;
  data: T;
  checksum: string;
  metadata: {
    author?: string;
    source: string; // pane ID or system
    operation: 'create' | 'update' | 'delete' | 'restore';
    description?: string;
    sessionId?: string;
    parentVersion?: string;
    tags?: string[];
    size: number; // estimated data size in bytes
  };
}

export interface VersionDiff {
  versionFrom: string;
  versionTo: string;
  timestamp: Date;
  changes: FieldChange[];
  summary: {
    added: number;
    modified: number;
    deleted: number;
    total: number;
  };
}

export interface FieldChange {
  field: string;
  type: 'add' | 'modify' | 'delete';
  oldValue?: any;
  newValue?: any;
  path: string[]; // nested object path
  confidence: number; // 0-1, confidence in this change detection
}

export interface VersionQuery {
  dataId?: string;
  author?: string;
  source?: string;
  operation?: string;
  dateRange?: { start: Date; end: Date };
  tags?: string[];
  limit?: number;
  offset?: number;
}

export interface RestoreOptions {
  targetVersion: string;
  createBackup?: boolean;
  validateData?: boolean;
  mergeStrategy?: 'overwrite' | 'merge' | 'selective';
  selectedFields?: string[];
}

/**
 * Version Manager for tracking data changes
 */
export class DataVersionManager {
  private versions: Map<string, DataVersion[]> = new Map();
  private maxVersionsPerItem = 50;
  private compressionThreshold = 1024; // bytes
  private autoCleanupEnabled = true;
  private cleanupInterval = 24 * 60 * 60 * 1000; // 24 hours

  constructor(options: {
    maxVersionsPerItem?: number;
    compressionThreshold?: number;
    autoCleanupEnabled?: boolean;
  } = {}) {
    this.maxVersionsPerItem = options.maxVersionsPerItem || 50;
    this.compressionThreshold = options.compressionThreshold || 1024;
    this.autoCleanupEnabled = options.autoCleanupEnabled !== false;

    if (this.autoCleanupEnabled) {
      this.startAutoCleanup();
    }
  }

  /**
   * Create a new version of data
   */
  createVersion<T>(
    dataId: string,
    data: T,
    metadata: Partial<DataVersion<T>['metadata']>
  ): DataVersion<T> {
    const timestamp = new Date();
    const serializedData = JSON.stringify(data);
    const checksum = this.generateChecksum(serializedData);
    
    // Get existing versions for this data
    const existingVersions = this.versions.get(dataId) || [];
    
    // Check if data actually changed
    if (existingVersions.length > 0) {
      const lastVersion = existingVersions[existingVersions.length - 1];
      if (lastVersion.checksum === checksum) {
        // Data hasn't changed, return existing version
        return lastVersion as DataVersion<T>;
      }
    }

    const version: DataVersion<T> = {
      id: this.generateVersionId(dataId, timestamp),
      timestamp,
      data: this.shouldCompress(serializedData) ? this.compressData(data) : data,
      checksum,
      metadata: {
        source: 'unknown',
        operation: existingVersions.length === 0 ? 'create' : 'update',
        size: serializedData.length,
        sessionId: this.getCurrentSessionId(),
        parentVersion: existingVersions.length > 0 ? existingVersions[existingVersions.length - 1].id : undefined,
        ...metadata
      }
    };

    // Add to versions list
    const versions = [...existingVersions, version];
    
    // Enforce version limit
    if (versions.length > this.maxVersionsPerItem) {
      // Keep important versions (tagged, manual operations, etc.)
      const importantVersions = versions.filter(v => 
        v.metadata.tags?.length || 
        v.metadata.operation === 'create' || 
        v.metadata.author
      );
      
      // Remove excess versions, but preserve important ones
      const toKeep = Math.max(this.maxVersionsPerItem - importantVersions.length, 10);
      const regularVersions = versions
        .filter(v => !importantVersions.includes(v))
        .slice(-toKeep);
      
      this.versions.set(dataId, [...importantVersions, ...regularVersions].sort(
        (a, b) => a.timestamp.getTime() - b.timestamp.getTime()
      ));
    } else {
      this.versions.set(dataId, versions);
    }

    return version;
  }

  /**
   * Get version history for data
   */
  getVersionHistory(dataId: string, query: Partial<VersionQuery> = {}): DataVersion[] {
    const versions = this.versions.get(dataId) || [];
    return this.filterVersions(versions, query);
  }

  /**
   * Get specific version
   */
  getVersion(dataId: string, versionId: string): DataVersion | null {
    const versions = this.versions.get(dataId) || [];
    return versions.find(v => v.id === versionId) || null;
  }

  /**
   * Get latest version
   */
  getLatestVersion<T>(dataId: string): DataVersion<T> | null {
    const versions = this.versions.get(dataId) || [];
    if (versions.length === 0) return null;
    
    const latest = versions[versions.length - 1];
    return {
      ...latest,
      data: this.isCompressed(latest.data) ? this.decompressData(latest.data) : latest.data
    } as DataVersion<T>;
  }

  /**
   * Compare two versions and get diff
   */
  compareVersions(dataId: string, fromVersionId: string, toVersionId: string): VersionDiff | null {
    const versions = this.versions.get(dataId) || [];
    const fromVersion = versions.find(v => v.id === fromVersionId);
    const toVersion = versions.find(v => v.id === toVersionId);

    if (!fromVersion || !toVersion) {
      return null;
    }

    const fromData = this.isCompressed(fromVersion.data) ? 
      this.decompressData(fromVersion.data) : fromVersion.data;
    const toData = this.isCompressed(toVersion.data) ? 
      this.decompressData(toVersion.data) : toVersion.data;

    const changes = this.calculateDiff(fromData, toData);

    return {
      versionFrom: fromVersionId,
      versionTo: toVersionId,
      timestamp: toVersion.timestamp,
      changes,
      summary: {
        added: changes.filter(c => c.type === 'add').length,
        modified: changes.filter(c => c.type === 'modify').length,
        deleted: changes.filter(c => c.type === 'delete').length,
        total: changes.length
      }
    };
  }

  /**
   * Restore data to a specific version
   */
  restoreVersion<T>(
    dataId: string, 
    versionId: string, 
    options: RestoreOptions
  ): { success: boolean; restoredData?: T; backupVersion?: DataVersion } {
    const targetVersion = this.getVersion(dataId, versionId);
    if (!targetVersion) {
      return { success: false };
    }

    let backupVersion: DataVersion | undefined;
    
    // Create backup if requested
    if (options.createBackup) {
      const currentData = this.getLatestVersion(dataId);
      if (currentData) {
        backupVersion = this.createVersion(dataId, currentData.data, {
          operation: 'update',
          source: 'system',
          description: `Backup before restore to version ${versionId}`,
          tags: ['backup', 'restore-point']
        });
      }
    }

    // Get restored data
    let restoredData = this.isCompressed(targetVersion.data) ? 
      this.decompressData(targetVersion.data) : targetVersion.data;

    // Handle merge strategies
    if (options.mergeStrategy === 'merge' || options.mergeStrategy === 'selective') {
      const currentVersion = this.getLatestVersion(dataId);
      if (currentVersion) {
        restoredData = this.mergeVersionData(
          currentVersion.data,
          restoredData,
          options
        );
      }
    }

    // Validate data if requested
    if (options.validateData) {
      const isValid = this.validateData(restoredData);
      if (!isValid) {
        return { success: false };
      }
    }

    // Create restore version
    this.createVersion(dataId, restoredData, {
      operation: 'restore',
      source: 'user',
      description: `Restored from version ${versionId}`,
      parentVersion: versionId,
      tags: ['restore']
    });

    return {
      success: true,
      restoredData,
      backupVersion
    };
  }

  /**
   * Branch from a specific version (create parallel version line)
   */
  branchFromVersion<T>(
    dataId: string,
    versionId: string,
    branchName: string,
    data?: T
  ): { success: boolean; branchId?: string } {
    const sourceVersion = this.getVersion(dataId, versionId);
    if (!sourceVersion) {
      return { success: false };
    }

    const branchId = `${dataId}_branch_${branchName}`;
    const branchData = data || (this.isCompressed(sourceVersion.data) ? 
      this.decompressData(sourceVersion.data) : sourceVersion.data);

    this.createVersion(branchId, branchData, {
      operation: 'create',
      source: 'user',
      description: `Branch '${branchName}' created from version ${versionId}`,
      parentVersion: versionId,
      tags: ['branch', branchName]
    });

    return {
      success: true,
      branchId
    };
  }

  /**
   * Merge changes from one branch to another
   */
  mergeBranches<T>(
    targetDataId: string,
    sourceBranchId: string,
    mergeStrategy: 'auto' | 'manual' = 'auto'
  ): { success: boolean; conflicts?: FieldChange[]; mergedData?: T } {
    const targetLatest = this.getLatestVersion<T>(targetDataId);
    const sourceLatest = this.getLatestVersion<T>(sourceBranchId);

    if (!targetLatest || !sourceLatest) {
      return { success: false };
    }

    // Find common ancestor
    const commonAncestor = this.findCommonAncestor(targetDataId, sourceBranchId);
    
    if (mergeStrategy === 'auto') {
      // Attempt automatic merge
      const mergedData = this.performThreeWayMerge(
        commonAncestor?.data,
        targetLatest.data,
        sourceLatest.data
      );

      if (mergedData.conflicts.length === 0) {
        // No conflicts, create merged version
        this.createVersion(targetDataId, mergedData.data, {
          operation: 'update',
          source: 'system',
          description: `Auto-merged from branch ${sourceBranchId}`,
          tags: ['merge', 'auto']
        });

        return {
          success: true,
          mergedData: mergedData.data
        };
      } else {
        // Has conflicts, return for manual resolution
        return {
          success: false,
          conflicts: mergedData.conflicts,
          mergedData: mergedData.data
        };
      }
    }

    return { success: false };
  }

  /**
   * Get version statistics
   */
  getVersionStats(dataId?: string): {
    totalVersions: number;
    totalDataItems: number;
    averageVersionsPerItem: number;
    oldestVersion: Date | null;
    newestVersion: Date | null;
    totalStorageSize: number;
    versionsByOperation: Record<string, number>;
  } {
    let totalVersions = 0;
    let totalStorageSize = 0;
    let oldestVersion: Date | null = null;
    let newestVersion: Date | null = null;
    const versionsByOperation: Record<string, number> = {};

    const dataItems = dataId ? [dataId] : Array.from(this.versions.keys());
    
    dataItems.forEach(id => {
      const versions = this.versions.get(id) || [];
      totalVersions += versions.length;
      
      versions.forEach(version => {
        totalStorageSize += version.metadata.size;
        
        if (!oldestVersion || version.timestamp < oldestVersion) {
          oldestVersion = version.timestamp;
        }
        if (!newestVersion || version.timestamp > newestVersion) {
          newestVersion = version.timestamp;
        }
        
        const op = version.metadata.operation;
        versionsByOperation[op] = (versionsByOperation[op] || 0) + 1;
      });
    });

    return {
      totalVersions,
      totalDataItems: dataItems.length,
      averageVersionsPerItem: dataItems.length > 0 ? totalVersions / dataItems.length : 0,
      oldestVersion,
      newestVersion,
      totalStorageSize,
      versionsByOperation
    };
  }

  /**
   * Clean up old versions
   */
  cleanup(options: {
    olderThanDays?: number;
    keepMinimumVersions?: number;
    preserveTagged?: boolean;
    dryRun?: boolean;
  } = {}): { removed: number; preserved: number } {
    const {
      olderThanDays = 30,
      keepMinimumVersions = 5,
      preserveTagged = true,
      dryRun = false
    } = options;

    const cutoffDate = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000);
    let removed = 0;
    let preserved = 0;

    for (const [dataId, versions] of this.versions.entries()) {
      if (versions.length <= keepMinimumVersions) {
        preserved += versions.length;
        continue;
      }

      const sortedVersions = [...versions].sort(
        (a, b) => b.timestamp.getTime() - a.timestamp.getTime()
      );

      const toKeep: DataVersion[] = [];
      const toRemove: DataVersion[] = [];

      sortedVersions.forEach((version, index) => {
        const shouldKeep = 
          index < keepMinimumVersions || // Keep minimum versions
          version.timestamp > cutoffDate || // Keep recent versions
          (preserveTagged && version.metadata.tags?.length) || // Keep tagged versions
          version.metadata.operation === 'create'; // Keep creation versions

        if (shouldKeep) {
          toKeep.push(version);
          preserved++;
        } else {
          toRemove.push(version);
          removed++;
        }
      });

      if (!dryRun && toRemove.length > 0) {
        this.versions.set(dataId, toKeep.sort(
          (a, b) => a.timestamp.getTime() - b.timestamp.getTime()
        ));
      }
    }

    return { removed, preserved };
  }

  // Private helper methods

  private filterVersions(versions: DataVersion[], query: Partial<VersionQuery>): DataVersion[] {
    let filtered = [...versions];

    if (query.author) {
      filtered = filtered.filter(v => v.metadata.author === query.author);
    }

    if (query.source) {
      filtered = filtered.filter(v => v.metadata.source === query.source);
    }

    if (query.operation) {
      filtered = filtered.filter(v => v.metadata.operation === query.operation);
    }

    if (query.dateRange) {
      filtered = filtered.filter(v => 
        v.timestamp >= query.dateRange!.start && 
        v.timestamp <= query.dateRange!.end
      );
    }

    if (query.tags?.length) {
      filtered = filtered.filter(v => 
        query.tags!.some(tag => v.metadata.tags?.includes(tag))
      );
    }

    // Sort by timestamp (newest first)
    filtered.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    // Apply pagination
    if (query.offset) {
      filtered = filtered.slice(query.offset);
    }
    if (query.limit) {
      filtered = filtered.slice(0, query.limit);
    }

    return filtered;
  }

  private calculateDiff(from: any, to: any, path: string[] = []): FieldChange[] {
    const changes: FieldChange[] = [];

    // Handle null/undefined cases
    if (from === null || from === undefined) {
      if (to !== null && to !== undefined) {
        changes.push({
          field: path.join('.') || 'root',
          type: 'add',
          newValue: to,
          path,
          confidence: 1.0
        });
      }
      return changes;
    }

    if (to === null || to === undefined) {
      changes.push({
        field: path.join('.') || 'root',
        type: 'delete',
        oldValue: from,
        path,
        confidence: 1.0
      });
      return changes;
    }

    // Handle primitive types
    if (typeof from !== 'object' || typeof to !== 'object') {
      if (from !== to) {
        changes.push({
          field: path.join('.') || 'root',
          type: 'modify',
          oldValue: from,
          newValue: to,
          path,
          confidence: 1.0
        });
      }
      return changes;
    }

    // Handle arrays
    if (Array.isArray(from) && Array.isArray(to)) {
      const maxLength = Math.max(from.length, to.length);
      for (let i = 0; i < maxLength; i++) {
        const currentPath = [...path, i.toString()];
        if (i >= from.length) {
          changes.push({
            field: currentPath.join('.'),
            type: 'add',
            newValue: to[i],
            path: currentPath,
            confidence: 0.9
          });
        } else if (i >= to.length) {
          changes.push({
            field: currentPath.join('.'),
            type: 'delete',
            oldValue: from[i],
            path: currentPath,
            confidence: 0.9
          });
        } else {
          changes.push(...this.calculateDiff(from[i], to[i], currentPath));
        }
      }
      return changes;
    }

    // Handle objects
    const allKeys = new Set([...Object.keys(from), ...Object.keys(to)]);
    
    for (const key of allKeys) {
      const currentPath = [...path, key];
      
      if (!(key in from)) {
        changes.push({
          field: currentPath.join('.'),
          type: 'add',
          newValue: to[key],
          path: currentPath,
          confidence: 1.0
        });
      } else if (!(key in to)) {
        changes.push({
          field: currentPath.join('.'),
          type: 'delete',
          oldValue: from[key],
          path: currentPath,
          confidence: 1.0
        });
      } else {
        changes.push(...this.calculateDiff(from[key], to[key], currentPath));
      }
    }

    return changes;
  }

  private mergeVersionData<T>(current: T, target: T, options: RestoreOptions): T {
    if (options.mergeStrategy === 'selective' && options.selectedFields) {
      const merged = { ...current } as any;
      
      options.selectedFields.forEach(field => {
        const fieldParts = field.split('.');
        let currentObj = merged;
        let targetObj = target as any;
        
        // Navigate to the parent of the target field
        for (let i = 0; i < fieldParts.length - 1; i++) {
          if (currentObj[fieldParts[i]] === undefined) {
            currentObj[fieldParts[i]] = {};
          }
          currentObj = currentObj[fieldParts[i]];
          targetObj = targetObj[fieldParts[i]];
        }
        
        // Set the field value
        const lastField = fieldParts[fieldParts.length - 1];
        if (targetObj && targetObj[lastField] !== undefined) {
          currentObj[lastField] = targetObj[lastField];
        }
      });
      
      return merged;
    }

    // For 'merge' strategy, perform a deep merge
    return this.deepMerge(current, target);
  }

  private deepMerge<T>(target: T, source: T): T {
    if (typeof target !== 'object' || typeof source !== 'object') {
      return source;
    }

    const result = { ...target } as any;
    
    for (const key in source) {
      if (source.hasOwnProperty(key)) {
        if (typeof source[key] === 'object' && !Array.isArray(source[key])) {
          result[key] = this.deepMerge(result[key], source[key]);
        } else {
          result[key] = source[key];
        }
      }
    }

    return result;
  }

  private findCommonAncestor(dataId1: string, dataId2: string): DataVersion | null {
    const versions1 = this.versions.get(dataId1) || [];
    const versions2 = this.versions.get(dataId2) || [];

    // Find versions that share a parent
    for (const v1 of versions1) {
      for (const v2 of versions2) {
        if (v1.metadata.parentVersion === v2.metadata.parentVersion && v1.metadata.parentVersion) {
          // Found common parent, return it
          const parentId = v1.metadata.parentVersion;
          return versions1.find(v => v.id === parentId) || 
                 versions2.find(v => v.id === parentId) || null;
        }
      }
    }

    return null;
  }

  private performThreeWayMerge<T>(
    ancestor: T,
    current: T,
    incoming: T
  ): { data: T; conflicts: FieldChange[] } {
    // Simplified three-way merge
    // In a real implementation, this would be much more sophisticated
    const conflicts: FieldChange[] = [];
    
    const ancestorChanges = ancestor ? this.calculateDiff(ancestor, current) : [];
    const incomingChanges = ancestor ? this.calculateDiff(ancestor, incoming) : [];

    // Find conflicting changes (same field changed in both)
    ancestorChanges.forEach(ancestorChange => {
      const conflictingChange = incomingChanges.find(incomingChange => 
        incomingChange.field === ancestorChange.field &&
        incomingChange.newValue !== ancestorChange.newValue
      );
      
      if (conflictingChange) {
        conflicts.push({
          field: ancestorChange.field,
          type: 'modify',
          oldValue: ancestorChange.newValue,
          newValue: conflictingChange.newValue,
          path: ancestorChange.path,
          confidence: 0.5
        });
      }
    });

    // For now, prefer incoming changes in case of conflicts
    let mergedData = this.deepMerge(current, incoming);

    return { data: mergedData, conflicts };
  }

  private validateData<T>(data: T): boolean {
    // Basic validation - could be extended with schema validation
    try {
      JSON.stringify(data);
      return true;
    } catch {
      return false;
    }
  }

  private generateVersionId(dataId: string, timestamp: Date): string {
    return `${dataId}_v${timestamp.getTime()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateChecksum(data: string): string {
    // Simple hash function for checksums
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(16);
  }

  private getCurrentSessionId(): string {
    // In a real implementation, this would get the actual session ID
    return `session_${Date.now()}`;
  }

  private shouldCompress(data: string): boolean {
    return data.length > this.compressionThreshold;
  }

  private compressData<T>(data: T): T {
    // Placeholder for compression - in real implementation would use LZ compression
    return data;
  }

  private decompressData<T>(data: T): T {
    // Placeholder for decompression
    return data;
  }

  private isCompressed<T>(data: T): boolean {
    // Placeholder for compression detection
    return false;
  }

  private startAutoCleanup(): void {
    setInterval(() => {
      this.cleanup({ dryRun: false });
    }, this.cleanupInterval);
  }
}

// Global version manager instance
export const dataVersionManager = new DataVersionManager({
  maxVersionsPerItem: 100,
  compressionThreshold: 2048,
  autoCleanupEnabled: true
});

export default dataVersionManager;