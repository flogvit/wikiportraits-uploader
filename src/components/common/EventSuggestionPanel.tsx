import React, { useState, useEffect } from 'react';
import { WikidataEntity } from '../../types/wikidata';
import { RelationshipSuggestion, SuggestionContext } from '../../utils/event-relationships';
import { useEventSuggestions } from '../../hooks/useEventSuggestions';

export interface EventSuggestionPanelProps {
  context: SuggestionContext;
  onSuggestionAccept?: (suggestion: RelationshipSuggestion) => void;
  onSuggestionReject?: (suggestionId: string) => void;
  className?: string;
  maxSuggestions?: number;
  minConfidence?: number;
  showRelationshipTypes?: boolean;
  showConfidenceScores?: boolean;
  groupByType?: boolean;
  autoRefresh?: boolean;
}

export function EventSuggestionPanel({
  context,
  onSuggestionAccept,
  onSuggestionReject,
  className = '',
  maxSuggestions = 10,
  minConfidence = 0.3,
  showRelationshipTypes = true,
  showConfidenceScores = true,
  groupByType = false,
  autoRefresh = false
}: EventSuggestionPanelProps) {
  const {
    suggestions,
    isLoadingSuggestions,
    suggestionsError,
    generateSuggestions,
    acceptSuggestion,
    rejectSuggestion,
    filterSuggestions,
    suggestionStats,
    refreshSuggestions
  } = useEventSuggestions({
    maxSuggestions,
    minConfidence,
    autoRefresh,
    refreshInterval: 300000 // 5 minutes
  });

  const [searchText, setSearchText] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [expandedSuggestions, setExpandedSuggestions] = useState<Set<string>>(new Set());

  // Generate suggestions when context changes
  useEffect(() => {
    if (context.currentEvent || context.existingEntities?.length) {
      generateSuggestions(context);
    }
  }, [context, generateSuggestions]);

  // Filter suggestions based on search and type
  const filteredSuggestions = filterSuggestions({
    relationshipType: selectedType === 'all' ? undefined : selectedType,
    searchText: searchText || undefined
  });

  // Group suggestions by type if requested
  const groupedSuggestions = groupByType ? 
    filteredSuggestions.reduce((groups, suggestion) => {
      const type = suggestion.relationshipType;
      if (!groups[type]) groups[type] = [];
      groups[type].push(suggestion);
      return groups;
    }, {} as Record<string, RelationshipSuggestion[]>) : 
    { all: filteredSuggestions };

  const handleAccept = (suggestion: RelationshipSuggestion) => {
    acceptSuggestion(suggestion);
    onSuggestionAccept?.(suggestion);
  };

  const handleReject = (suggestionId: string) => {
    rejectSuggestion(suggestionId);
    onSuggestionReject?.(suggestionId);
  };

  const toggleExpanded = (suggestionId: string) => {
    setExpandedSuggestions(prev => {
      const newSet = new Set(prev);
      if (newSet.has(suggestionId)) {
        newSet.delete(suggestionId);
      } else {
        newSet.add(suggestionId);
      }
      return newSet;
    });
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-green-600';
    if (confidence >= 0.6) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getRelationshipTypeIcon = (type: string) => {
    switch (type) {
      case 'temporal': return '⏰';
      case 'spatial': return '📍';
      case 'performer': return '🎭';
      case 'venue': return '🏛️';
      case 'genre': return '🎵';
      case 'series': return '📚';
      case 'participant': return '👥';
      default: return '🔗';
    }
  };

  if (suggestionsError) {
    return (
      <div className={`bg-red-50 border border-red-200 rounded-md p-4 ${className}`}>
        <div className="flex items-center">
          <span className="text-red-600 mr-2">❌</span>
          <span className="text-red-800">Error loading suggestions: {suggestionsError}</span>
        </div>
        <button
          onClick={refreshSuggestions}
          className="mt-2 px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className={`bg-white border rounded-lg shadow-sm ${className}`}>
      {/* Header */}
      <div className="p-4 border-b">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900">
            Event Suggestions
          </h3>
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-500">
              {suggestionStats.total} suggestions
            </span>
            <button
              onClick={refreshSuggestions}
              disabled={isLoadingSuggestions}
              className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-50"
            >
              🔄
            </button>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="mt-3 flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            placeholder="Search suggestions..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          
          {showRelationshipTypes && (
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Types</option>
              {Object.keys(suggestionStats.byType).map(type => (
                <option key={type} value={type}>
                  {type} ({suggestionStats.byType[type]})
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Statistics */}
        {suggestionStats.total > 0 && (
          <div className="mt-2 text-sm text-gray-600">
            Average confidence: {(suggestionStats.averageConfidence * 100).toFixed(1)}%
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        {isLoadingSuggestions ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-2 text-gray-600">Loading suggestions...</span>
          </div>
        ) : suggestionStats.total === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <span className="text-4xl mb-2 block">🔍</span>
            <p>No suggestions found</p>
            <p className="text-sm mt-1">Try adjusting your search criteria</p>
          </div>
        ) : (
          <div className="space-y-4">
            {Object.entries(groupedSuggestions).map(([groupType, groupSuggestions]) => (
              <div key={groupType}>
                {groupByType && groupType !== 'all' && (
                  <h4 className="font-medium text-gray-900 mb-2 flex items-center">
                    {getRelationshipTypeIcon(groupType)}
                    <span className="ml-2 capitalize">{groupType} Relationships</span>
                  </h4>
                )}
                
                <div className="space-y-2">
                  {groupSuggestions.map((suggestion) => (
                    <div
                      key={suggestion.entity.id}
                      className="border border-gray-200 rounded-md p-3 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            {showRelationshipTypes && (
                              <span className="text-lg">
                                {getRelationshipTypeIcon(suggestion.relationshipType)}
                              </span>
                            )}
                            <h5 className="font-medium text-gray-900">
                              {suggestion.entity.labels?.en?.value || suggestion.entity.id}
                            </h5>
                            {showConfidenceScores && (
                              <span className={`text-sm font-medium ${getConfidenceColor(suggestion.confidence)}`}>
                                {(suggestion.confidence * 100).toFixed(0)}%
                              </span>
                            )}
                          </div>
                          
                          <p className="text-sm text-gray-600 mt-1">
                            {suggestion.reasoning}
                          </p>
                          
                          {expandedSuggestions.has(suggestion.entity.id) && (
                            <div className="mt-2 text-xs text-gray-500 space-y-1">
                              <div>
                                <strong>Property:</strong> {suggestion.suggestedProperty}
                              </div>
                              <div>
                                <strong>Type:</strong> {suggestion.relationshipType}
                              </div>
                              {suggestion.alternatives && suggestion.alternatives.length > 0 && (
                                <div>
                                  <strong>Alternatives:</strong> {suggestion.alternatives.length} available
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                        
                        <div className="flex items-center space-x-2 ml-4">
                          <button
                            onClick={() => toggleExpanded(suggestion.entity.id)}
                            className="text-gray-400 hover:text-gray-600 text-sm"
                          >
                            {expandedSuggestions.has(suggestion.entity.id) ? '▼' : '▶'}
                          </button>
                          
                          <button
                            onClick={() => handleReject(suggestion.entity.id)}
                            className="px-2 py-1 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 rounded"
                          >
                            ✕
                          </button>
                          
                          <button
                            onClick={() => handleAccept(suggestion)}
                            className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                          >
                            Add
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default EventSuggestionPanel;