import React, { useState, useRef } from 'react';
import { 
  dataExportImportManager, 
  ExportOptions, 
  ImportOptions, 
  ImportResult 
} from '../../utils/data-export-import';

export interface DataExportImportPanelProps {
  data?: Record<string, any>;
  onImportComplete?: (result: ImportResult) => void;
  onExportComplete?: (filename: string) => void;
  className?: string;
}

export function DataExportImportPanel({
  data = {},
  onImportComplete,
  onExportComplete,
  className = ''
}: DataExportImportPanelProps) {
  // State
  const [activeTab, setActiveTab] = useState<'export' | 'import'>('export');
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [exportOptions, setExportOptions] = useState<ExportOptions>({
    includeVersionHistory: true,
    includeCache: false,
    includeMetadata: true,
    formatType: 'json',
    compression: 'none'
  });
  const [importOptions, setImportOptions] = useState<ImportOptions>({
    mergeStrategy: 'merge',
    validateData: true,
    createBackup: true,
    importVersionHistory: true,
    importCache: false
  });
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle export
  const handleExport = async () => {
    setIsExporting(true);
    setError(null);

    try {
      const result = await dataExportImportManager.exportData(data, exportOptions);
      
      // Create and download file
      const blob = new Blob([result.data], { type: result.type });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = result.filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      URL.revokeObjectURL(url);
      
      onExportComplete?.(result.filename);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export failed');
    } finally {
      setIsExporting(false);
    }
  };

  // Handle file selection
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        handleImport(content);
      };
      reader.readAsText(file);
    }
  };

  // Handle import
  const handleImport = async (fileContent: string) => {
    setIsImporting(true);
    setError(null);
    setImportResult(null);

    try {
      const result = await dataExportImportManager.importData(fileContent, importOptions);
      setImportResult(result);
      onImportComplete?.(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import failed');
    } finally {
      setIsImporting(false);
    }
  };

  // Get data statistics
  const getDataStats = () => {
    const entities = Object.values(data).filter(item => 
      item && typeof item === 'object' && typeof item.id === 'string'
    ).length;
    
    const totalSize = JSON.stringify(data).length;
    
    return {
      entities,
      totalSize: (totalSize / 1024).toFixed(1) // KB
    };
  };

  const stats = getDataStats();

  return (
    <div className={`bg-white border rounded-lg shadow-sm ${className}`}>
      {/* Header with tabs */}
      <div className="border-b">
        <nav className="flex">
          <button
            onClick={() => setActiveTab('export')}
            className={`px-4 py-2 text-sm font-medium ${
              activeTab === 'export'
                ? 'border-b-2 border-blue-500 text-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Export Data
          </button>
          <button
            onClick={() => setActiveTab('import')}
            className={`px-4 py-2 text-sm font-medium ${
              activeTab === 'import'
                ? 'border-b-2 border-blue-500 text-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Import Data
          </button>
        </nav>
      </div>

      <div className="p-4">
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
            <div className="text-red-800">{error}</div>
          </div>
        )}

        {/* Export Tab */}
        {activeTab === 'export' && (
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Export Data</h3>
              <div className="text-sm text-gray-600 mb-4">
                Current data: {stats.entities} entities, {stats.totalSize} KB
              </div>
            </div>

            {/* Export Options */}
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium text-gray-700">Format</label>
                <select
                  value={exportOptions.formatType}
                  onChange={(e) => setExportOptions({
                    ...exportOptions,
                    formatType: e.target.value as any
                  })}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="json">JSON</option>
                  <option value="csv">CSV</option>
                  <option value="xml">XML</option>
                </select>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700">Compression</label>
                <select
                  value={exportOptions.compression}
                  onChange={(e) => setExportOptions({
                    ...exportOptions,
                    compression: e.target.value as any
                  })}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="none">None</option>
                  <option value="zip">ZIP</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={exportOptions.includeVersionHistory}
                    onChange={(e) => setExportOptions({
                      ...exportOptions,
                      includeVersionHistory: e.target.checked
                    })}
                    className="rounded border-gray-300"
                  />
                  <span className="ml-2 text-sm text-gray-700">Include version history</span>
                </label>

                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={exportOptions.includeCache}
                    onChange={(e) => setExportOptions({
                      ...exportOptions,
                      includeCache: e.target.checked
                    })}
                    className="rounded border-gray-300"
                  />
                  <span className="ml-2 text-sm text-gray-700">Include cache data</span>
                </label>

                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={exportOptions.includeMetadata}
                    onChange={(e) => setExportOptions({
                      ...exportOptions,
                      includeMetadata: e.target.checked
                    })}
                    className="rounded border-gray-300"
                  />
                  <span className="ml-2 text-sm text-gray-700">Include metadata</span>
                </label>
              </div>
            </div>

            <button
              onClick={handleExport}
              disabled={isExporting || Object.keys(data).length === 0}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isExporting ? (
                <span className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Exporting...
                </span>
              ) : (
                'Export Data'
              )}
            </button>
          </div>
        )}

        {/* Import Tab */}
        {activeTab === 'import' && (
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Import Data</h3>
              <p className="text-sm text-gray-600 mb-4">
                Select a file to import data into your current session.
              </p>
            </div>

            {/* Import Options */}
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium text-gray-700">Merge Strategy</label>
                <select
                  value={importOptions.mergeStrategy}
                  onChange={(e) => setImportOptions({
                    ...importOptions,
                    mergeStrategy: e.target.value as any
                  })}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="merge">Merge with existing</option>
                  <option value="overwrite">Overwrite existing</option>
                  <option value="skip">Skip existing</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={importOptions.validateData}
                    onChange={(e) => setImportOptions({
                      ...importOptions,
                      validateData: e.target.checked
                    })}
                    className="rounded border-gray-300"
                  />
                  <span className="ml-2 text-sm text-gray-700">Validate imported data</span>
                </label>

                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={importOptions.createBackup}
                    onChange={(e) => setImportOptions({
                      ...importOptions,
                      createBackup: e.target.checked
                    })}
                    className="rounded border-gray-300"
                  />
                  <span className="ml-2 text-sm text-gray-700">Create backup before import</span>
                </label>

                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={importOptions.importVersionHistory}
                    onChange={(e) => setImportOptions({
                      ...importOptions,
                      importVersionHistory: e.target.checked
                    })}
                    className="rounded border-gray-300"
                  />
                  <span className="ml-2 text-sm text-gray-700">Import version history</span>
                </label>

                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={importOptions.importCache}
                    onChange={(e) => setImportOptions({
                      ...importOptions,
                      importCache: e.target.checked
                    })}
                    className="rounded border-gray-300"
                  />
                  <span className="ml-2 text-sm text-gray-700">Import cache data</span>
                </label>
              </div>
            </div>

            {/* File Selection */}
            <div className="border-2 border-dashed border-gray-300 rounded-md p-4 text-center">
              <input
                ref={fileInputRef}
                type="file"
                accept=".json,.csv,.xml,.zip"
                onChange={handleFileSelect}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isImporting}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 disabled:opacity-50"
              >
                {isImporting ? 'Processing...' : 'Select File'}
              </button>
              <p className="text-xs text-gray-500 mt-2">
                Supported formats: JSON, CSV, XML, ZIP
              </p>
            </div>

            {/* Import Progress */}
            {isImporting && (
              <div className="flex items-center justify-center py-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <span className="ml-2 text-gray-600">Processing import...</span>
              </div>
            )}

            {/* Import Result */}
            {importResult && (
              <div className={`p-4 rounded-md ${
                importResult.success ? 'bg-green-50 border border-green-200' : 'bg-yellow-50 border border-yellow-200'
              }`}>
                <div className={`font-medium ${
                  importResult.success ? 'text-green-800' : 'text-yellow-800'
                }`}>
                  Import {importResult.success ? 'Completed' : 'Completed with Issues'}
                </div>
                
                <div className="mt-2 text-sm space-y-1">
                  <div className="text-gray-700">
                    <strong>Imported:</strong> {importResult.imported.entities} entities, {importResult.imported.versions} versions
                  </div>
                  {importResult.skipped.entities > 0 && (
                    <div className="text-gray-700">
                      <strong>Skipped:</strong> {importResult.skipped.entities} entities, {importResult.skipped.versions} versions
                    </div>
                  )}
                  <div className="text-gray-700">
                    <strong>Duration:</strong> {importResult.duration}ms
                  </div>
                </div>

                {importResult.warnings.length > 0 && (
                  <div className="mt-3">
                    <div className="text-sm font-medium text-yellow-800">Warnings:</div>
                    <ul className="text-xs text-yellow-700 list-disc list-inside">
                      {importResult.warnings.map((warning, index) => (
                        <li key={index}>{warning}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {importResult.errors.length > 0 && (
                  <div className="mt-3">
                    <div className="text-sm font-medium text-red-800">Errors:</div>
                    <ul className="text-xs text-red-700 list-disc list-inside">
                      {importResult.errors.map((error, index) => (
                        <li key={index}>{error}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default DataExportImportPanel;