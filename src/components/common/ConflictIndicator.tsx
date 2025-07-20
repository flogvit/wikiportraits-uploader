import React from 'react';
import { DataConflict } from '../../types/wikidata';

interface ConflictIndicatorProps {
  conflicts: DataConflict[];
  showDetails?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function ConflictIndicator({ 
  conflicts, 
  showDetails = false, 
  size = 'md',
  className = '' 
}: ConflictIndicatorProps) {
  if (!conflicts.length) return null;

  const sizeClasses = {
    sm: 'w-4 h-4 text-xs',
    md: 'w-6 h-6 text-sm',
    lg: 'w-8 h-8 text-base'
  };

  const getSeverityColor = () => {
    const hasEditConflicts = conflicts.some(c => c.conflictType === 'edit');
    const hasDeleteConflicts = conflicts.some(c => c.conflictType === 'delete');
    
    if (hasDeleteConflicts) return 'text-red-600 bg-red-100';
    if (hasEditConflicts) return 'text-yellow-600 bg-yellow-100';
    return 'text-orange-600 bg-orange-100';
  };

  const getSeverityTitle = () => {
    const hasEditConflicts = conflicts.some(c => c.conflictType === 'edit');
    const hasDeleteConflicts = conflicts.some(c => c.conflictType === 'delete');
    
    if (hasDeleteConflicts) return 'Critical conflicts detected';
    if (hasEditConflicts) return 'Edit conflicts detected';
    return 'Conflicts detected';
  };

  return (
    <div className={`inline-flex items-center space-x-2 ${className}`}>
      <div
        className={`
          ${sizeClasses[size]} 
          ${getSeverityColor()}
          rounded-full flex items-center justify-center font-bold
        `}
        title={getSeverityTitle()}
      >
        !
      </div>
      
      {showDetails && (
        <div className="text-sm">
          <span className="font-medium">
            {conflicts.length} conflict{conflicts.length !== 1 ? 's' : ''}
          </span>
          {size !== 'sm' && (
            <div className="text-xs text-gray-500 mt-1">
              {conflicts.map(c => c.property).join(', ')}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

interface ConflictBadgeProps {
  conflicts: DataConflict[];
  onClick?: () => void;
  className?: string;
}

export function ConflictBadge({ conflicts, onClick, className = '' }: ConflictBadgeProps) {
  if (!conflicts.length) return null;

  return (
    <button
      onClick={onClick}
      className={`
        inline-flex items-center px-2 py-1 rounded-full text-xs font-medium
        ${conflicts.some(c => c.conflictType === 'delete') 
          ? 'bg-red-100 text-red-800 hover:bg-red-200' 
          : conflicts.some(c => c.conflictType === 'edit')
          ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'
          : 'bg-orange-100 text-orange-800 hover:bg-orange-200'
        }
        ${onClick ? 'cursor-pointer' : 'cursor-default'}
        ${className}
      `}
      title="Click to resolve conflicts"
    >
      <span className="mr-1">⚠</span>
      {conflicts.length} conflict{conflicts.length !== 1 ? 's' : ''}
    </button>
  );
}

interface ConflictSummaryProps {
  conflicts: DataConflict[];
  className?: string;
}

export function ConflictSummary({ conflicts, className = '' }: ConflictSummaryProps) {
  if (!conflicts.length) return null;

  const byType = conflicts.reduce((acc, conflict) => {
    acc[conflict.conflictType] = (acc[conflict.conflictType] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const bySource = conflicts.reduce((acc, conflict) => {
    acc[conflict.source] = (acc[conflict.source] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className={`bg-yellow-50 border border-yellow-200 rounded-lg p-4 ${className}`}>
      <div className="flex items-center mb-2">
        <ConflictIndicator conflicts={conflicts} size="md" />
        <h3 className="ml-2 font-medium text-yellow-800">
          Conflicts Detected
        </h3>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
        <div>
          <h4 className="font-medium text-yellow-700 mb-1">By Type:</h4>
          <ul className="text-yellow-600 space-y-1">
            {byType.edit && <li>• {byType.edit} edit conflict{byType.edit !== 1 ? 's' : ''}</li>}
            {byType.add && <li>• {byType.add} addition conflict{byType.add !== 1 ? 's' : ''}</li>}
            {byType.delete && <li>• {byType.delete} deletion conflict{byType.delete !== 1 ? 's' : ''}</li>}
          </ul>
        </div>
        
        <div>
          <h4 className="font-medium text-yellow-700 mb-1">By Source:</h4>
          <ul className="text-yellow-600 space-y-1">
            {bySource.user && <li>• {bySource.user} from your changes</li>}
            {bySource.external && <li>• {bySource.external} from external changes</li>}
          </ul>
        </div>
      </div>
      
      <div className="mt-3 pt-3 border-t border-yellow-200">
        <p className="text-xs text-yellow-600">
          Properties affected: {conflicts.map(c => c.property).join(', ')}
        </p>
      </div>
    </div>
  );
}

export default ConflictIndicator;