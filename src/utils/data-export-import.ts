import { WikidataEntity } from '../types/wikidata';
import { dataVersionManager, DataVersion } from './data-versioning';
import { suggestionCache } from './suggestion-cache';

/**
 * Data Export/Import Utilities for WikiPortraits
 */

export interface ExportOptions {
  includeVersionHistory?: boolean;
  includeCache?: boolean;
  includeMetadata?: boolean;
  formatType?: 'json' | 'csv' | 'xml';
  compression?: 'none' | 'zip';
  dateRange?: { start: Date; end: Date };
  dataTypes?: string[]; // Filter by data types
  maxFileSize?: number; // Max size in MB
}

export interface ImportOptions {
  mergeStrategy?: 'overwrite' | 'merge' | 'skip';
  validateData?: boolean;
  createBackup?: boolean;
  importVersionHistory?: boolean;
  importCache?: boolean;
}

export interface ExportPackage {
  metadata: {
    exportDate: Date;
    version: string;
    source: string;
    options: ExportOptions;
    checksum: string;
  };
  data: {
    entities?: WikidataEntity[];
    versions?: Record<string, DataVersion[]>;
    cache?: any;
    workflows?: any[];
    configurations?: any;
  };
  statistics: {
    totalEntities: number;
    totalVersions: number;
    totalSize: number;
    exportDuration: number;
  };
}

export interface ImportResult {
  success: boolean;
  imported: {
    entities: number;
    versions: number;
    cacheEntries: number;
  };
  skipped: {
    entities: number;
    versions: number;
    cacheEntries: number;
  };
  errors: string[];
  warnings: string[];
  duration: number;
}

/**
 * Data Export/Import Manager
 */
export class DataExportImportManager {
  private readonly maxFileSize = 100 * 1024 * 1024; // 100MB default
  private readonly supportedFormats = ['json', 'csv', 'xml'];

  /**
   * Export data to file
   */
  async exportData(
    dataItems: Record<string, any>,
    options: ExportOptions = {}
  ): Promise<{ data: string; filename: string; type: string }> {
    const startTime = Date.now();
    
    const {
      includeVersionHistory = true,
      includeCache = false,
      includeMetadata = true,
      formatType = 'json',
      compression = 'none',
      maxFileSize = this.maxFileSize
    } = options;

    // Validate format
    if (!this.supportedFormats.includes(formatType)) {
      throw new Error(`Unsupported format: ${formatType}`);
    }

    try {
      // Prepare data package
      const exportPackage = await this.prepareExportPackage(dataItems, options);
      
      // Check file size
      const packageSize = new Blob([JSON.stringify(exportPackage)]).size;
      if (packageSize > maxFileSize) {
        throw new Error(`Export size (${(packageSize / 1024 / 1024).toFixed(1)}MB) exceeds limit`);
      }

      // Format data based on type
      let exportData: string;
      let mimeType: string;
      let fileExtension: string;

      switch (formatType) {
        case 'json':
          exportData = this.formatAsJSON(exportPackage);
          mimeType = 'application/json';
          fileExtension = 'json';
          break;
        case 'csv':
          exportData = this.formatAsCSV(exportPackage);
          mimeType = 'text/csv';
          fileExtension = 'csv';
          break;
        case 'xml':
          exportData = this.formatAsXML(exportPackage);
          mimeType = 'application/xml';
          fileExtension = 'xml';
          break;
        default:
          throw new Error(`Unsupported format: ${formatType}`);
      }

      // Apply compression if requested
      if (compression === 'zip') {
        // In a real implementation, you would use a compression library
        // For now, we'll just simulate compression
        exportData = this.simulateCompression(exportData);
        fileExtension = `${fileExtension}.zip`;
        mimeType = 'application/zip';
      }

      const filename = `wikiportraits_export_${new Date().toISOString().split('T')[0]}.${fileExtension}`;

      return {
        data: exportData,
        filename,
        type: mimeType
      };
    } catch (error) {
      throw new Error(`Export failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Import data from file
   */
  async importData(
    fileContent: string,
    options: ImportOptions = {}
  ): Promise<ImportResult> {
    const startTime = Date.now();
    
    const {
      mergeStrategy = 'merge',
      validateData = true,
      createBackup = true,
      importVersionHistory = true,
      importCache = false
    } = options;

    const result: ImportResult = {
      success: false,
      imported: { entities: 0, versions: 0, cacheEntries: 0 },
      skipped: { entities: 0, versions: 0, cacheEntries: 0 },
      errors: [],
      warnings: [],
      duration: 0
    };

    try {
      // Parse import data
      const importPackage = this.parseImportData(fileContent);
      
      // Validate package
      if (validateData) {
        const validation = this.validateImportPackage(importPackage);
        if (!validation.valid) {
          result.errors.push(...validation.errors);
          return result;
        }
        if (validation.warnings.length > 0) {
          result.warnings.push(...validation.warnings);
        }
      }

      // Create backup if requested
      if (createBackup) {
        await this.createImportBackup();
      }

      // Import entities
      if (importPackage.data.entities) {
        const entityResult = await this.importEntities(
          importPackage.data.entities,
          mergeStrategy
        );
        result.imported.entities = entityResult.imported;
        result.skipped.entities = entityResult.skipped;
        result.errors.push(...entityResult.errors);
      }

      // Import version history
      if (importVersionHistory && importPackage.data.versions) {
        const versionResult = await this.importVersionHistory(
          importPackage.data.versions,
          mergeStrategy
        );
        result.imported.versions = versionResult.imported;
        result.skipped.versions = versionResult.skipped;
        result.errors.push(...versionResult.errors);
      }

      // Import cache
      if (importCache && importPackage.data.cache) {
        const cacheResult = await this.importCache(
          importPackage.data.cache,
          mergeStrategy
        );
        result.imported.cacheEntries = cacheResult.imported;
        result.skipped.cacheEntries = cacheResult.skipped;
        result.errors.push(...cacheResult.errors);
      }

      result.success = result.errors.length === 0;
      result.duration = Date.now() - startTime;

      return result;
    } catch (error) {
      result.errors.push(`Import failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      result.duration = Date.now() - startTime;
      return result;
    }
  }

  /**
   * Export workflow configuration
   */
  async exportWorkflowConfig(workflowId: string): Promise<string> {
    // This would export a specific workflow configuration
    // For now, return a mock configuration
    const config = {
      workflowId,
      exportDate: new Date(),
      version: '1.0',
      // ... workflow configuration data
    };

    return JSON.stringify(config, null, 2);
  }

  /**
   * Import workflow configuration
   */
  async importWorkflowConfig(configData: string): Promise<boolean> {
    try {
      const config = JSON.parse(configData);
      
      // Validate configuration
      if (!config.workflowId) {
        throw new Error('Invalid workflow configuration: missing workflowId');
      }

      // Import configuration
      // This would integrate with the workflow system
      console.log('Importing workflow configuration:', config.workflowId);
      
      return true;
    } catch (error) {
      console.error('Failed to import workflow configuration:', error);
      return false;
    }
  }

  /**
   * Create a backup of current data before import
   */
  async createImportBackup(): Promise<string> {
    const backupId = `backup_${Date.now()}`;
    
    // This would create a backup of current data
    // For now, we'll simulate the backup creation
    console.log(`Creating import backup: ${backupId}`);
    
    return backupId;
  }

  /**
   * Restore from backup
   */
  async restoreFromBackup(backupId: string): Promise<boolean> {
    try {
      // This would restore data from a backup
      console.log(`Restoring from backup: ${backupId}`);
      return true;
    } catch (error) {
      console.error('Failed to restore from backup:', error);
      return false;
    }
  }

  // Private helper methods

  private async prepareExportPackage(
    dataItems: Record<string, any>,
    options: ExportOptions
  ): Promise<ExportPackage> {
    const entities: WikidataEntity[] = [];
    const versions: Record<string, DataVersion[]> = {};
    let cacheData: any = null;

    // Extract entities
    Object.values(dataItems).forEach(item => {
      if (this.isWikidataEntity(item)) {
        entities.push(item);
      }
    });

    // Get version history if requested
    if (options.includeVersionHistory) {
      Object.keys(dataItems).forEach(dataId => {
        const history = dataVersionManager.getVersionHistory(dataId);
        if (history.length > 0) {
          versions[dataId] = history;
        }
      });
    }

    // Get cache data if requested
    if (options.includeCache) {
      cacheData = suggestionCache.getStats();
    }

    // Calculate statistics
    const totalVersions = Object.values(versions).reduce(
      (total, versionList) => total + versionList.length, 
      0
    );

    const packageData = {
      entities,
      versions,
      cache: cacheData
    };

    const packageString = JSON.stringify(packageData);
    const checksum = this.generateChecksum(packageString);

    return {
      metadata: {
        exportDate: new Date(),
        version: '1.0',
        source: 'WikiPortraits',
        options,
        checksum
      },
      data: packageData,
      statistics: {
        totalEntities: entities.length,
        totalVersions,
        totalSize: packageString.length,
        exportDuration: 0 // Will be calculated when export completes
      }
    };
  }

  private parseImportData(fileContent: string): ExportPackage {
    try {
      // Try to decompress if it looks like compressed data
      if (this.isCompressedData(fileContent)) {
        fileContent = this.simulateDecompression(fileContent);
      }

      const parsed = JSON.parse(fileContent);
      
      // Validate basic structure
      if (!parsed.metadata || !parsed.data) {
        throw new Error('Invalid import file structure');
      }

      return parsed;
    } catch (error) {
      throw new Error(`Failed to parse import data: ${error instanceof Error ? error.message : 'Invalid JSON'}`);
    }
  }

  private validateImportPackage(importPackage: ExportPackage): {
    valid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate metadata
    if (!importPackage.metadata.version) {
      errors.push('Missing version information');
    }

    if (!importPackage.metadata.checksum) {
      warnings.push('No checksum provided - cannot verify data integrity');
    } else {
      // Verify checksum
      const calculatedChecksum = this.generateChecksum(JSON.stringify(importPackage.data));
      if (calculatedChecksum !== importPackage.metadata.checksum) {
        errors.push('Data integrity check failed - checksum mismatch');
      }
    }

    // Validate data structure
    if (importPackage.data.entities && !Array.isArray(importPackage.data.entities)) {
      errors.push('Invalid entities data structure');
    }

    if (importPackage.data.versions && typeof importPackage.data.versions !== 'object') {
      errors.push('Invalid versions data structure');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  private async importEntities(
    entities: WikidataEntity[],
    mergeStrategy: string
  ): Promise<{ imported: number; skipped: number; errors: string[] }> {
    let imported = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const entity of entities) {
      try {
        // Check if entity already exists
        const exists = await this.entityExists(entity.id);
        
        if (exists && mergeStrategy === 'skip') {
          skipped++;
          continue;
        }

        // Import/update entity
        await this.saveEntity(entity, mergeStrategy);
        imported++;
      } catch (error) {
        errors.push(`Failed to import entity ${entity.id}: ${error}`);
        skipped++;
      }
    }

    return { imported, skipped, errors };
  }

  private async importVersionHistory(
    versions: Record<string, DataVersion[]>,
    mergeStrategy: string
  ): Promise<{ imported: number; skipped: number; errors: string[] }> {
    let imported = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const [dataId, versionList] of Object.entries(versions)) {
      try {
        for (const version of versionList) {
          const exists = dataVersionManager.getVersion(dataId, version.id);
          
          if (exists && mergeStrategy === 'skip') {
            skipped++;
            continue;
          }

          // Import version
          dataVersionManager.createVersion(dataId, version.data, version.metadata);
          imported++;
        }
      } catch (error) {
        errors.push(`Failed to import versions for ${dataId}: ${error}`);
      }
    }

    return { imported, skipped, errors };
  }

  private async importCache(
    cacheData: any,
    mergeStrategy: string
  ): Promise<{ imported: number; skipped: number; errors: string[] }> {
    let imported = 0;
    let skipped = 0;
    const errors: string[] = [];

    try {
      if (mergeStrategy === 'overwrite') {
        suggestionCache.clear();
      }

      // Import cache data
      // This would depend on the cache implementation
      imported = 1; // Placeholder
    } catch (error) {
      errors.push(`Failed to import cache: ${error}`);
    }

    return { imported, skipped, errors };
  }

  private formatAsJSON(data: ExportPackage): string {
    return JSON.stringify(data, null, 2);
  }

  private formatAsCSV(data: ExportPackage): string {
    // Convert to CSV format
    let csv = 'Type,ID,Name,Data\n';
    
    if (data.data.entities) {
      data.data.entities.forEach(entity => {
        const name = entity.labels?.en?.value || entity.id;
        const dataStr = JSON.stringify(entity).replace(/"/g, '""');
        csv += `Entity,"${entity.id}","${name}","${dataStr}"\n`;
      });
    }

    return csv;
  }

  private formatAsXML(data: ExportPackage): string {
    // Basic XML conversion
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<export>\n';
    xml += `  <metadata>\n`;
    xml += `    <exportDate>${data.metadata.exportDate.toISOString()}</exportDate>\n`;
    xml += `    <version>${data.metadata.version}</version>\n`;
    xml += `  </metadata>\n`;
    xml += '  <entities>\n';
    
    if (data.data.entities) {
      data.data.entities.forEach(entity => {
        const name = entity.labels?.en?.value || entity.id;
        xml += `    <entity id="${entity.id}" name="${this.escapeXML(name)}" />\n`;
      });
    }
    
    xml += '  </entities>\n';
    xml += '</export>';
    
    return xml;
  }

  private escapeXML(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  private simulateCompression(data: string): string {
    // Placeholder for compression
    return btoa(data);
  }

  private simulateDecompression(data: string): string {
    // Placeholder for decompression
    try {
      return atob(data);
    } catch {
      return data; // If not base64, return as-is
    }
  }

  private isCompressedData(data: string): boolean {
    // Simple check for base64 encoding
    try {
      atob(data);
      return true;
    } catch {
      return false;
    }
  }

  private isWikidataEntity(obj: any): obj is WikidataEntity {
    return obj && typeof obj === 'object' && typeof obj.id === 'string';
  }

  private async entityExists(entityId: string): Promise<boolean> {
    // This would check if an entity exists in the system
    return false; // Placeholder
  }

  private async saveEntity(entity: WikidataEntity, mergeStrategy: string): Promise<void> {
    // This would save an entity to the system
    console.log(`Saving entity ${entity.id} with strategy ${mergeStrategy}`);
  }

  private generateChecksum(data: string): string {
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(16);
  }
}

// Global export/import manager instance
export const dataExportImportManager = new DataExportImportManager();

// Utility functions for easy access
export const exportData = (data: Record<string, any>, options?: ExportOptions) =>
  dataExportImportManager.exportData(data, options);

export const importData = (fileContent: string, options?: ImportOptions) =>
  dataExportImportManager.importData(fileContent, options);

export const downloadExport = async (data: Record<string, any>, options?: ExportOptions) => {
  const result = await exportData(data, options);
  
  const blob = new Blob([result.data], { type: result.type });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = result.filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  URL.revokeObjectURL(url);
};

export default dataExportImportManager;