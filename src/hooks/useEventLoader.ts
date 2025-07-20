import { useState, useCallback, useEffect, useMemo } from 'react';
import { EventLoader, EventSearchFilters, EventLoadingResult, LoadedEvent } from '../utils/event-loading';
import { WorkflowItem, WikidataEntity } from '../types/wikidata';
import { useConflictResolution } from './useConflictResolution';

export interface UseEventLoaderOptions {
  autoLoad?: boolean;
  defaultFilters?: EventSearchFilters;
  cacheResults?: boolean;
  onEventLoaded?: (event: LoadedEvent) => void;
  onError?: (error: Error) => void;
}

export interface UseEventLoaderReturn {
  // Search and loading
  searchEvents: (query: string, filters?: EventSearchFilters) => Promise<void>;
  loadEvent: (eventId: string) => Promise<LoadedEvent | null>;
  clearResults: () => void;

  // Results
  results: EventLoadingResult | null;
  currentEvent: LoadedEvent | null;
  workflowItems: Map<string, WorkflowItem<WikidataEntity>>;

  // State
  isLoading: boolean;
  isLoadingEvent: boolean;
  error: Error | null;
  hasMore: boolean;

  // Event selection and editing
  selectEvent: (event: LoadedEvent) => void;
  convertToWorkflow: (event: LoadedEvent) => WorkflowItem<WikidataEntity>;
  convertToFormData: (event: LoadedEvent) => Record<string, any>;

  // Pagination and filtering
  loadMore: () => Promise<void>;
  applyFilters: (filters: EventSearchFilters) => Promise<void>;
  currentFilters: EventSearchFilters;

  // Cache management
  clearCache: () => void;
  getCachedEvent: (eventId: string) => LoadedEvent | null;
}

interface EventCache {
  events: Map<string, LoadedEvent>;
  searchResults: Map<string, EventLoadingResult>;
  lastAccess: Map<string, number>;
}

export function useEventLoader(options: UseEventLoaderOptions = {}): UseEventLoaderReturn {
  const {
    autoLoad = false,
    defaultFilters = {},
    cacheResults = true,
    onEventLoaded,
    onError
  } = options;

  // Core state
  const [results, setResults] = useState<EventLoadingResult | null>(null);
  const [currentEvent, setCurrentEvent] = useState<LoadedEvent | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingEvent, setIsLoadingEvent] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [currentQuery, setCurrentQuery] = useState<string>('');
  const [currentFilters, setCurrentFilters] = useState<EventSearchFilters>(defaultFilters);

  // Cache state
  const [cache, setCache] = useState<EventCache>({
    events: new Map(),
    searchResults: new Map(),
    lastAccess: new Map()
  });

  // Workflow items for editing
  const [workflowItems, setWorkflowItems] = useState<Map<string, WorkflowItem<WikidataEntity>>>(new Map());

  // Event loader instance
  const eventLoader = useMemo(() => new EventLoader(), []);

  // Conflict resolution for current event
  const conflictResolution = useConflictResolution(
    currentEvent?.entity,
    false
  );

  // Update workflow items when conflict resolution changes
  useEffect(() => {
    if (conflictResolution.workflowItem && currentEvent) {
      setWorkflowItems(prev => new Map(prev.set(currentEvent.entity.id, conflictResolution.workflowItem!)));
    }
  }, [conflictResolution.workflowItem, currentEvent]);

  // Search events with caching
  const searchEvents = useCallback(async (query: string, filters: EventSearchFilters = {}) => {
    setIsLoading(true);
    setError(null);
    setCurrentQuery(query);
    
    const mergedFilters = { ...currentFilters, ...filters };
    setCurrentFilters(mergedFilters);

    const cacheKey = `${query}_${JSON.stringify(mergedFilters)}`;

    try {
      // Check cache first
      if (cacheResults && cache.searchResults.has(cacheKey)) {
        const cachedResult = cache.searchResults.get(cacheKey)!;
        setResults(cachedResult);
        cache.lastAccess.set(cacheKey, Date.now());
        setIsLoading(false);
        return;
      }

      // Load from API
      const result = await eventLoader.searchEvents(query, mergedFilters);
      setResults(result);

      // Cache results
      if (cacheResults) {
        setCache(prev => ({
          ...prev,
          searchResults: new Map(prev.searchResults.set(cacheKey, result)),
          lastAccess: new Map(prev.lastAccess.set(cacheKey, Date.now()))
        }));
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to search events');
      setError(error);
      onError?.(error);
    } finally {
      setIsLoading(false);
    }
  }, [eventLoader, currentFilters, cache, cacheResults, onError]);

  // Load specific event
  const loadEvent = useCallback(async (eventId: string): Promise<LoadedEvent | null> => {
    setIsLoadingEvent(true);
    setError(null);

    try {
      // Check cache first
      if (cacheResults && cache.events.has(eventId)) {
        const cachedEvent = cache.events.get(eventId)!;
        cache.lastAccess.set(eventId, Date.now());
        setCurrentEvent(cachedEvent);
        onEventLoaded?.(cachedEvent);
        setIsLoadingEvent(false);
        return cachedEvent;
      }

      // Load from API
      const event = await eventLoader.loadEventDetails(eventId);
      if (event) {
        setCurrentEvent(event);
        onEventLoaded?.(event);

        // Cache event
        if (cacheResults) {
          setCache(prev => ({
            ...prev,
            events: new Map(prev.events.set(eventId, event)),
            lastAccess: new Map(prev.lastAccess.set(eventId, Date.now()))
          }));
        }
      }

      return event;
    } catch (err) {
      const error = err instanceof Error ? err : new Error(`Failed to load event ${eventId}`);
      setError(error);
      onError?.(error);
      return null;
    } finally {
      setIsLoadingEvent(false);
    }
  }, [eventLoader, cache, cacheResults, onEventLoaded, onError]);

  // Select event for editing
  const selectEvent = useCallback((event: LoadedEvent) => {
    setCurrentEvent(event);
    
    // Create workflow item for editing
    const workflowItem = eventLoader.convertToWorkflowItem(event);
    setWorkflowItems(prev => new Map(prev.set(event.entity.id, workflowItem)));
    
    // Update conflict resolution
    conflictResolution.updateData(event.entity);
    
    onEventLoaded?.(event);
  }, [eventLoader, conflictResolution, onEventLoaded]);

  // Convert event to workflow item
  const convertToWorkflow = useCallback((event: LoadedEvent): WorkflowItem<WikidataEntity> => {
    return eventLoader.convertToWorkflowItem(event);
  }, [eventLoader]);

  // Convert event to form data
  const convertToFormData = useCallback((event: LoadedEvent): Record<string, any> => {
    return eventLoader.convertToFormData(event);
  }, [eventLoader]);

  // Load more results (pagination)
  const loadMore = useCallback(async () => {
    if (!results?.hasMore || isLoading || !currentQuery) return;

    setIsLoading(true);
    try {
      const nextFilters = {
        ...currentFilters,
        // Implementation depends on API pagination support
      };

      const moreResults = await eventLoader.searchEvents(currentQuery, nextFilters);
      
      setResults(prev => prev ? {
        ...moreResults,
        events: [...prev.events, ...moreResults.events],
        total: prev.total + moreResults.total
      } : moreResults);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to load more events');
      setError(error);
      onError?.(error);
    } finally {
      setIsLoading(false);
    }
  }, [results, isLoading, currentQuery, currentFilters, eventLoader, onError]);

  // Apply new filters
  const applyFilters = useCallback(async (filters: EventSearchFilters) => {
    if (currentQuery) {
      await searchEvents(currentQuery, filters);
    }
  }, [currentQuery, searchEvents]);

  // Clear results
  const clearResults = useCallback(() => {
    setResults(null);
    setCurrentEvent(null);
    setError(null);
    setCurrentQuery('');
    conflictResolution.clearConflicts();
  }, [conflictResolution]);

  // Clear cache
  const clearCache = useCallback(() => {
    setCache({
      events: new Map(),
      searchResults: new Map(),
      lastAccess: new Map()
    });
  }, []);

  // Get cached event
  const getCachedEvent = useCallback((eventId: string): LoadedEvent | null => {
    return cache.events.get(eventId) || null;
  }, [cache]);

  // Auto-cleanup old cache entries
  useEffect(() => {
    if (!cacheResults) return;

    const cleanupCache = () => {
      const now = Date.now();
      const maxAge = 30 * 60 * 1000; // 30 minutes

      setCache(prev => {
        const newEvents = new Map();
        const newSearchResults = new Map();
        const newLastAccess = new Map();

        // Keep only recent entries
        for (const [key, timestamp] of prev.lastAccess) {
          if (now - timestamp < maxAge) {
            newLastAccess.set(key, timestamp);
            
            if (prev.events.has(key)) {
              newEvents.set(key, prev.events.get(key));
            }
            if (prev.searchResults.has(key)) {
              newSearchResults.set(key, prev.searchResults.get(key));
            }
          }
        }

        return {
          events: newEvents,
          searchResults: newSearchResults,
          lastAccess: newLastAccess
        };
      });
    };

    const interval = setInterval(cleanupCache, 5 * 60 * 1000); // Cleanup every 5 minutes
    return () => clearInterval(interval);
  }, [cacheResults]);

  // Auto-load if specified
  useEffect(() => {
    if (autoLoad && defaultFilters) {
      searchEvents('', defaultFilters);
    }
  }, [autoLoad, defaultFilters, searchEvents]);

  return {
    // Search and loading
    searchEvents,
    loadEvent,
    clearResults,

    // Results
    results,
    currentEvent,
    workflowItems,

    // State
    isLoading,
    isLoadingEvent,
    error,
    hasMore: results?.hasMore || false,

    // Event selection and editing
    selectEvent,
    convertToWorkflow,
    convertToFormData,

    // Pagination and filtering
    loadMore,
    applyFilters,
    currentFilters,

    // Cache management
    clearCache,
    getCachedEvent
  };
}

export default useEventLoader;