import { useState, useCallback, useEffect, useMemo } from 'react';
import { logger } from '@/utils/logger';
import { WikidataEntity } from '../types/wikidata';
import { 
  eventRelationshipMapper, 
  RelationshipSuggestion, 
  SuggestionContext, 
  EventRelationship,
  RelationshipQuery 
} from '../utils/event-relationships';

export interface UseEventSuggestionsOptions {
  enabled?: boolean;
  maxSuggestions?: number;
  minConfidence?: number;
  autoRefresh?: boolean;
  refreshInterval?: number; // milliseconds
  cacheResults?: boolean;
}

export interface UseEventSuggestionsReturn {
  // Suggestions
  suggestions: RelationshipSuggestion[];
  isLoadingSuggestions: boolean;
  suggestionsError: string | null;
  
  // Relationships
  relationships: EventRelationship[];
  isLoadingRelationships: boolean;
  relationshipsError: string | null;
  
  // Actions
  generateSuggestions: (context: SuggestionContext) => Promise<void>;
  findRelationships: (query: RelationshipQuery) => Promise<void>;
  acceptSuggestion: (suggestion: RelationshipSuggestion) => void;
  rejectSuggestion: (suggestionId: string) => void;
  clearSuggestions: () => void;
  clearRelationships: () => void;
  refreshSuggestions: () => Promise<void>;
  
  // Filtering and search
  filterSuggestions: (filter: {
    relationshipType?: string;
    minConfidence?: number;
    searchText?: string;
  }) => RelationshipSuggestion[];
  
  // Statistics
  suggestionStats: {
    total: number;
    byType: Record<string, number>;
    averageConfidence: number;
  };
  
  // State
  hasAcceptedSuggestions: boolean;
  hasRejectedSuggestions: boolean;
  lastRefresh: Date | null;
}

export function useEventSuggestions(
  options: UseEventSuggestionsOptions = {}
): UseEventSuggestionsReturn {
  const {
    enabled = true,
    maxSuggestions = 20,
    minConfidence = 0.1,
    autoRefresh = false,
    refreshInterval = 300000, // 5 minutes
    cacheResults = true
  } = options;

  // State
  const [suggestions, setSuggestions] = useState<RelationshipSuggestion[]>([]);
  const [relationships, setRelationships] = useState<EventRelationship[]>([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [isLoadingRelationships, setIsLoadingRelationships] = useState(false);
  const [suggestionsError, setSuggestionsError] = useState<string | null>(null);
  const [relationshipsError, setRelationshipsError] = useState<string | null>(null);
  const [acceptedSuggestions, setAcceptedSuggestions] = useState<Set<string>>(new Set());
  const [rejectedSuggestions, setRejectedSuggestions] = useState<Set<string>>(new Set());
  const [lastContext, setLastContext] = useState<SuggestionContext | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  // Generate suggestions
  const generateSuggestions = useCallback(async (context: SuggestionContext) => {
    if (!enabled) return;

    setIsLoadingSuggestions(true);
    setSuggestionsError(null);
    setLastContext(context);

    try {
      const rawSuggestions = await eventRelationshipMapper.generateSuggestions(context);
      
      // Filter suggestions
      const filteredSuggestions = rawSuggestions
        .filter(s => s.confidence >= minConfidence)
        .filter(s => !rejectedSuggestions.has(s.entity.id))
        .slice(0, maxSuggestions);

      setSuggestions(filteredSuggestions);
      setLastRefresh(new Date());
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to generate suggestions';
      setSuggestionsError(errorMessage);
      logger.error('useEventSuggestions', 'Error generating suggestions', error);
    } finally {
      setIsLoadingSuggestions(false);
    }
  }, [enabled, maxSuggestions, minConfidence, rejectedSuggestions]);

  // Find relationships
  const findRelationships = useCallback(async (query: RelationshipQuery) => {
    if (!enabled) return;

    setIsLoadingRelationships(true);
    setRelationshipsError(null);

    try {
      const foundRelationships = await eventRelationshipMapper.findRelationships(query);
      setRelationships(foundRelationships);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to find relationships';
      setRelationshipsError(errorMessage);
      logger.error('useEventSuggestions', 'Error finding relationships', error);
    } finally {
      setIsLoadingRelationships(false);
    }
  }, [enabled]);

  // Accept suggestion
  const acceptSuggestion = useCallback((suggestion: RelationshipSuggestion) => {
    setAcceptedSuggestions(prev => new Set([...prev, suggestion.entity.id]));
    
    // Remove from suggestions list
    setSuggestions(prev => prev.filter(s => s.entity.id !== suggestion.entity.id));
    
    // You might want to emit an event here to notify other components
    // eventBus.emit('suggestion:accepted', { suggestion });
  }, []);

  // Reject suggestion
  const rejectSuggestion = useCallback((suggestionId: string) => {
    setRejectedSuggestions(prev => new Set([...prev, suggestionId]));
    
    // Remove from suggestions list
    setSuggestions(prev => prev.filter(s => s.entity.id !== suggestionId));
  }, []);

  // Clear suggestions
  const clearSuggestions = useCallback(() => {
    setSuggestions([]);
    setSuggestionsError(null);
  }, []);

  // Clear relationships
  const clearRelationships = useCallback(() => {
    setRelationships([]);
    setRelationshipsError(null);
  }, []);

  // Refresh suggestions
  const refreshSuggestions = useCallback(async () => {
    if (lastContext) {
      await generateSuggestions(lastContext);
    }
  }, [generateSuggestions, lastContext]);

  // Filter suggestions
  const filterSuggestions = useCallback((filter: {
    relationshipType?: string;
    minConfidence?: number;
    searchText?: string;
  }) => {
    let filtered = suggestions;

    if (filter.relationshipType) {
      filtered = filtered.filter(s => s.relationshipType === filter.relationshipType);
    }

    if (filter.minConfidence !== undefined) {
      filtered = filtered.filter(s => s.confidence >= filter.minConfidence!);
    }

    if (filter.searchText) {
      const searchLower = filter.searchText.toLowerCase();
      filtered = filtered.filter(s => 
        s.entity.labels?.en?.value?.toLowerCase().includes(searchLower) ||
        s.reasoning.toLowerCase().includes(searchLower)
      );
    }

    return filtered;
  }, [suggestions]);

  // Compute suggestion statistics
  const suggestionStats = useMemo(() => {
    const total = suggestions.length;
    const byType: Record<string, number> = {};
    let totalConfidence = 0;

    suggestions.forEach(suggestion => {
      byType[suggestion.relationshipType] = (byType[suggestion.relationshipType] || 0) + 1;
      totalConfidence += suggestion.confidence;
    });

    return {
      total,
      byType,
      averageConfidence: total > 0 ? totalConfidence / total : 0
    };
  }, [suggestions]);

  // Auto-refresh setup
  useEffect(() => {
    if (!autoRefresh || !lastContext || refreshInterval <= 0) return;

    const intervalId = setInterval(() => {
      refreshSuggestions();
    }, refreshInterval);

    return () => clearInterval(intervalId);
  }, [autoRefresh, lastContext, refreshInterval, refreshSuggestions]);

  // Clear cache when component unmounts (if caching is disabled)
  useEffect(() => {
    return () => {
      if (!cacheResults) {
        eventRelationshipMapper.clearCache();
      }
    };
  }, [cacheResults]);

  return {
    // Suggestions
    suggestions,
    isLoadingSuggestions,
    suggestionsError,
    
    // Relationships
    relationships,
    isLoadingRelationships,
    relationshipsError,
    
    // Actions
    generateSuggestions,
    findRelationships,
    acceptSuggestion,
    rejectSuggestion,
    clearSuggestions,
    clearRelationships,
    refreshSuggestions,
    
    // Filtering and search
    filterSuggestions,
    
    // Statistics
    suggestionStats,
    
    // State
    hasAcceptedSuggestions: acceptedSuggestions.size > 0,
    hasRejectedSuggestions: rejectedSuggestions.size > 0,
    lastRefresh
  };
}

export default useEventSuggestions;