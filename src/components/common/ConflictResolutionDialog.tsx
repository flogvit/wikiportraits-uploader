import React, { useState, useCallback } from 'react';
import { DataConflict, WikidataEntity } from '../../types/wikidata';
import { ConflictResolver, ConflictResolution } from '../../utils/conflict-resolution';

interface ConflictResolutionDialogProps {
  conflicts: DataConflict[];
  entity: WikidataEntity;
  onResolve: (resolutions: Map<string, ConflictResolution>) => void;
  onCancel: () => void;
  isOpen: boolean;
}

export function ConflictResolutionDialog({
  conflicts,
  entity,
  onResolve,
  onCancel,
  isOpen
}: ConflictResolutionDialogProps) {
  const [resolutions, setResolutions] = useState<Map<string, ConflictResolution>>(new Map());

  const handleStrategyChange = useCallback((property: string, strategy: ConflictResolution['strategy']) => {
    const conflict = conflicts.find(c => c.property === property);
    if (!conflict) return;

    const newResolutions = new Map(resolutions);
    
    if (strategy === 'manual') {
      newResolutions.set(property, {
        strategy: 'manual',
        resolvedValue: conflict.currentValue,
        reason: 'Manual resolution required'
      });
    } else {
      const resolution = ConflictResolver['resolveConflict'](conflict, strategy);
      newResolutions.set(property, resolution);
    }
    
    setResolutions(newResolutions);
  }, [conflicts, resolutions]);

  const handleManualValueChange = useCallback((property: string, value: any) => {
    const newResolutions = new Map(resolutions);
    const existing = newResolutions.get(property);
    
    if (existing) {
      newResolutions.set(property, {
        ...existing,
        resolvedValue: value,
        reason: 'Manually resolved'
      });
    } else {
      newResolutions.set(property, {
        strategy: 'manual',
        resolvedValue: value,
        reason: 'Manually resolved'
      });
    }
    
    setResolutions(newResolutions);
  }, [resolutions]);

  const handleResolve = useCallback(() => {
    // Ensure all conflicts have resolutions
    const finalResolutions = new Map(resolutions);
    
    for (const conflict of conflicts) {
      if (!finalResolutions.has(conflict.property)) {
        finalResolutions.set(conflict.property, {
          strategy: 'keep_current',
          resolvedValue: conflict.currentValue,
          reason: 'Default: keep current value'
        });
      }
    }
    
    onResolve(finalResolutions);
  }, [conflicts, resolutions, onResolve]);

  const formatValue = useCallback((value: any): string => {
    if (value === null || value === undefined) return 'No value';
    if (Array.isArray(value)) return `Array (${value.length} items)`;
    if (typeof value === 'object') return JSON.stringify(value, null, 2);
    return String(value);
  }, []);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <h2 className="text-xl font-bold mb-4">Resolve Conflicts</h2>
          <p className="text-gray-600 mb-6">
            External changes have been detected. Please resolve the following conflicts:
          </p>

          <div className="space-y-6">
            {conflicts.map((conflict, index) => {
              const resolution = resolutions.get(conflict.property);
              const isManual = resolution?.strategy === 'manual';

              return (
                <div key={index} className="border rounded-lg p-4">
                  <div className="flex justify-between items-start mb-3">
                    <h3 className="font-semibold text-lg">{conflict.property}</h3>
                    <span className={`px-2 py-1 rounded text-xs ${
                      conflict.conflictType === 'edit' ? 'bg-yellow-100 text-yellow-800' :
                      conflict.conflictType === 'add' ? 'bg-green-100 text-green-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {conflict.conflictType}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div className="border rounded p-3">
                      <h4 className="font-medium text-sm text-gray-700 mb-2">Original Value</h4>
                      <pre className="text-xs bg-gray-50 p-2 rounded overflow-x-auto">
                        {formatValue(conflict.originalValue)}
                      </pre>
                    </div>

                    <div className="border rounded p-3">
                      <h4 className="font-medium text-sm text-gray-700 mb-2">Your Changes</h4>
                      <pre className="text-xs bg-blue-50 p-2 rounded overflow-x-auto">
                        {formatValue(conflict.currentValue)}
                      </pre>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Resolution Strategy
                      </label>
                      <select
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={resolution?.strategy || 'manual'}
                        onChange={(e) => handleStrategyChange(conflict.property, e.target.value as ConflictResolution['strategy'])}
                      >
                        <option value="manual">Manual resolution</option>
                        <option value="keep_original">Keep original value</option>
                        <option value="keep_current">Keep your changes</option>
                        <option value="merge">Merge values (if possible)</option>
                      </select>
                    </div>

                    {isManual && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Resolved Value
                        </label>
                        <textarea
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          rows={3}
                          value={typeof resolution?.resolvedValue === 'string' ? resolution.resolvedValue : JSON.stringify(resolution?.resolvedValue, null, 2)}
                          onChange={(e) => {
                            let value: any;
                            try {
                              value = JSON.parse(e.target.value);
                            } catch {
                              value = e.target.value;
                            }
                            handleManualValueChange(conflict.property, value);
                          }}
                        />
                      </div>
                    )}

                    {resolution && (
                      <div className="bg-green-50 p-3 rounded">
                        <h4 className="font-medium text-sm text-green-800 mb-1">Preview</h4>
                        <pre className="text-xs text-green-700 overflow-x-auto">
                          {formatValue(resolution.resolvedValue)}
                        </pre>
                        {resolution.reason && (
                          <p className="text-xs text-green-600 mt-1">{resolution.reason}</p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex justify-end space-x-3 mt-6 pt-4 border-t">
            <button
              onClick={onCancel}
              className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500"
            >
              Cancel
            </button>
            <button
              onClick={handleResolve}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              Apply Resolutions
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ConflictResolutionDialog;