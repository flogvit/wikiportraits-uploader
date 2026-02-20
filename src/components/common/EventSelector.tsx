import React, { useState, useCallback, useEffect } from 'react';
import { LoadedEvent, EventSearchFilters } from '../../utils/event-loading';
import { useEventLoader } from '../../hooks/useEventLoader';
import { WikidataEntity } from '../../types/wikidata';
import { WDPersonCardCompact, ConflictIndicator } from '../common';
import { logger } from '@/utils/logger';

interface EventSelectorProps {
  onEventSelect: (event: LoadedEvent) => void;
  onEventLoad?: (event: LoadedEvent) => void;
  initialFilters?: EventSearchFilters;
  allowMultiple?: boolean;
  selectedEvents?: LoadedEvent[];
  placeholder?: string;
  className?: string;
}

interface EventCardProps {
  event: LoadedEvent;
  onSelect: () => void;
  isSelected: boolean;
  showDetails?: boolean;
}

function EventCard({ event, onSelect, isSelected, showDetails = false }: EventCardProps) {
  const { entity, participants, venue, location, wikipediaArticle } = event;
  
  const eventName = entity.labels?.en?.value || entity.id;
  const description = entity.descriptions?.en?.value || '';
  
  // Extract date
  const startTime = entity.claims?.['P580']?.[0]?.mainsnak?.datavalue?.value?.time ||
                   entity.claims?.['P585']?.[0]?.mainsnak?.datavalue?.value?.time;
  const eventDate = startTime ? new Date(startTime).toLocaleDateString() : '';

  const venueName = venue?.labels?.en?.value || '';
  const locationName = location?.labels?.en?.value || '';

  return (
    <div
      className={`
        border rounded-lg p-4 cursor-pointer transition-all
        ${isSelected 
          ? 'border-blue-500 bg-blue-50 shadow-md' 
          : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
        }
      `}
      onClick={onSelect}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-lg text-gray-900 truncate">
            {eventName}
          </h3>
          {description && (
            <p className="text-sm text-gray-600 mt-1 line-clamp-2">
              {description}
            </p>
          )}
          
          <div className="flex flex-wrap items-center gap-4 mt-2 text-sm text-gray-500">
            {eventDate && (
              <span className="flex items-center">
                📅 {eventDate}
              </span>
            )}
            {venueName && (
              <span className="flex items-center">
                📍 {venueName}
              </span>
            )}
            {locationName && venueName !== locationName && (
              <span className="flex items-center">
                🌍 {locationName}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center space-x-2 ml-4">
          {wikipediaArticle && (
            <a
              href={wikipediaArticle.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-800"
              onClick={(e) => e.stopPropagation()}
            >
              📖
            </a>
          )}
          <span className="text-xs text-gray-400">
            {entity.id}
          </span>
        </div>
      </div>

      {showDetails && participants.length > 0 && (
        <div className="mt-3 pt-3 border-t border-gray-200">
          <h4 className="text-sm font-medium text-gray-700 mb-2">
            Participants ({participants.length})
          </h4>
          <div className="flex flex-wrap gap-2">
            {participants.slice(0, 5).map((participant) => (
              <WDPersonCardCompact
                key={participant.id}
                entity={participant}
                variant="additional"
              />
            ))}
            {participants.length > 5 && (
              <span className="text-xs text-gray-500 self-center">
                +{participants.length - 5} more
              </span>
            )}
          </div>
        </div>
      )}

      {isSelected && (
        <div className="mt-2 pt-2 border-t border-blue-200">
          <span className="text-xs text-blue-600 font-medium">
            ✓ Selected for editing
          </span>
        </div>
      )}
    </div>
  );
}

function EventFilters({ 
  filters, 
  onFiltersChange 
}: { 
  filters: EventSearchFilters;
  onFiltersChange: (filters: EventSearchFilters) => void;
}) {
  const [localFilters, setLocalFilters] = useState(filters);

  const handleFilterChange = useCallback((key: keyof EventSearchFilters, value: any) => {
    const newFilters = { ...localFilters, [key]: value };
    setLocalFilters(newFilters);
    onFiltersChange(newFilters);
  }, [localFilters, onFiltersChange]);

  return (
    <div className="bg-gray-50 p-4 rounded-lg space-y-4">
      <h3 className="font-medium text-gray-900">Search Filters</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Event Type
          </label>
          <select
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={localFilters.eventType?.[0] || ''}
            onChange={(e) => handleFilterChange('eventType', e.target.value ? [e.target.value] : [])}
          >
            <option value="">All Types</option>
            <option value="festival">Festivals</option>
            <option value="concert">Concerts</option>
            <option value="conference">Conferences</option>
            <option value="tournament">Tournaments</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Location
          </label>
          <input
            type="text"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Enter location..."
            value={localFilters.location || ''}
            onChange={(e) => handleFilterChange('location', e.target.value)}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Country
          </label>
          <input
            type="text"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Enter country..."
            value={localFilters.country || ''}
            onChange={(e) => handleFilterChange('country', e.target.value)}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Start Date
          </label>
          <input
            type="date"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={localFilters.dateRange?.start || ''}
            onChange={(e) => handleFilterChange('dateRange', { 
              ...localFilters.dateRange, 
              start: e.target.value 
            })}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            End Date
          </label>
          <input
            type="date"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={localFilters.dateRange?.end || ''}
            onChange={(e) => handleFilterChange('dateRange', { 
              ...localFilters.dateRange, 
              end: e.target.value 
            })}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Limit
          </label>
          <select
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={localFilters.limit || 50}
            onChange={(e) => handleFilterChange('limit', parseInt(e.target.value))}
          >
            <option value={10}>10 results</option>
            <option value={25}>25 results</option>
            <option value={50}>50 results</option>
            <option value={100}>100 results</option>
          </select>
        </div>
      </div>
    </div>
  );
}

export function EventSelector({
  onEventSelect,
  onEventLoad,
  initialFilters = {},
  allowMultiple = false,
  selectedEvents = [],
  placeholder = "Search for events...",
  className = ""
}: EventSelectorProps) {
  const [query, setQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  const eventLoader = useEventLoader({
    defaultFilters: initialFilters,
    onEventLoaded: onEventLoad,
    onError: (error) => logger.error('EventSelector', 'Event loading error', error)
  });

  const {
    searchEvents,
    loadEvent,
    results,
    currentEvent,
    isLoading,
    error,
    hasMore,
    loadMore,
    applyFilters,
    currentFilters,
    clearResults
  } = eventLoader;

  const handleSearch = useCallback(async (searchQuery: string) => {
    if (searchQuery.trim()) {
      await searchEvents(searchQuery, currentFilters);
    } else {
      clearResults();
    }
  }, [searchEvents, currentFilters, clearResults]);

  const handleEventSelect = useCallback((event: LoadedEvent) => {
    onEventSelect(event);
  }, [onEventSelect]);

  const isEventSelected = useCallback((event: LoadedEvent) => {
    return selectedEvents.some(selected => selected.entity.id === event.entity.id);
  }, [selectedEvents]);

  // Debounced search
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      handleSearch(query);
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [query, handleSearch]);

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Search Input */}
      <div className="relative">
        <input
          type="text"
          className="w-full px-4 py-3 pl-10 pr-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder={placeholder}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
          🔍
        </div>
        {isLoading && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
            <div className="animate-spin h-5 w-5 border-2 border-blue-500 border-t-transparent rounded-full"></div>
          </div>
        )}
      </div>

      {/* Filter Toggle */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="px-3 py-1 text-sm text-blue-600 hover:text-blue-800 border border-blue-200 rounded-md hover:bg-blue-50"
        >
          {showFilters ? '🔽' : '🔽'} Filters
        </button>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800 border border-gray-200 rounded-md hover:bg-gray-50"
          >
            {showDetails ? '📋' : '📝'} {showDetails ? 'Simple' : 'Detailed'}
          </button>
          
          {results && (
            <span className="text-sm text-gray-500">
              {results.events.length} of {results.total} events
            </span>
          )}
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <EventFilters
          filters={currentFilters}
          onFiltersChange={applyFilters}
        />
      )}

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">
            ❌ {error.message}
          </p>
        </div>
      )}

      {/* Results */}
      {results && (
        <div className="space-y-3">
          {results.events.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No events found. Try adjusting your search or filters.
            </div>
          ) : (
            results.events.map((event) => (
              <EventCard
                key={event.entity.id}
                event={event}
                onSelect={() => handleEventSelect(event)}
                isSelected={isEventSelected(event)}
                showDetails={showDetails}
              />
            ))
          )}

          {/* Load More Button */}
          {hasMore && (
            <div className="text-center">
              <button
                onClick={loadMore}
                disabled={isLoading}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Loading...' : 'Load More Events'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Selected Events Summary */}
      {selectedEvents.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-medium text-blue-900 mb-2">
            Selected Events ({selectedEvents.length})
          </h3>
          <div className="space-y-2">
            {selectedEvents.map((event) => (
              <div key={event.entity.id} className="flex items-center justify-between bg-white p-2 rounded">
                <span className="text-sm">
                  {event.entity.labels?.en?.value || event.entity.id}
                </span>
                <span className="text-xs text-gray-500">
                  {event.entity.id}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default EventSelector;