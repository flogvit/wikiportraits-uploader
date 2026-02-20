'use client';

import { useState, useCallback, useEffect } from 'react';
import { Search, X, Loader2 } from 'lucide-react';
import { WikidataEntity, WD_PROPERTIES } from '@/types/wikidata';
import { WDEntityUtils } from '@/utils/wd-utils';
import WikidataClient from '@/lib/api/WikidataClient';
import { logger } from '@/utils/logger';

interface WDEntitySelectorProps {
  entityType?: string; // Q-ID like 'Q215627' for musical group
  value?: WikidataEntity | null;
  onChange?: (entity: WikidataEntity | null) => void;
  placeholder?: string;
  label?: string;
  required?: boolean;
  disabled?: boolean;
  requiredProperties?: string[]; // Properties the entity must have
  className?: string;
}

export default function WDEntitySelector({
  entityType,
  value,
  onChange,
  placeholder = "Search entities...",
  label,
  required = false,
  disabled = false,
  requiredProperties = [],
  className = ""
}: WDEntitySelectorProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<WikidataEntity[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);

  // Search entities using Wikidata API
  const searchEntities = useCallback(async (query: string): Promise<WikidataEntity[]> => {
    if (!query.trim()) return [];
    
    setIsSearching(true);
    
    try {
      // Use actual Wikidata API for search
      let results: WikidataEntity[];
      
      if (entityType) {
        // Search for entities of specific type
        results = await WikidataClient.searchEntitiesOfType(query, entityType, 10);
      } else if (requiredProperties.length > 0) {
        // Search for people with required properties
        results = await WikidataClient.searchPeople(query, requiredProperties, 10);
      } else {
        // General entity search
        const searchResponse = await WikidataClient.searchEntities({
          query,
          limit: 10,
          type: 'item'
        });
        
        if (searchResponse.search && searchResponse.search.length > 0) {
          const entityIds = searchResponse.search.map(item => item.id);
          const entitiesResponse = await WikidataClient.getEntities({ ids: entityIds });
          results = Object.values(entitiesResponse.entities);
        } else {
          results = [];
        }
      }
      
      return results;
    } catch (error) {
      logger.error('WDEntitySelector', 'Error searching entities', error);
      // Fall back to mock data on error
      return generateMockResults(query, entityType);
    } finally {
      setIsSearching(false);
    }
  }, [entityType, requiredProperties]);

  // Debounced search
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchTerm.trim()) {
        searchEntities(searchTerm).then(results => {
          setSearchResults(results);
          setShowResults(true);
          setSelectedIndex(-1);
        });
      } else {
        setSearchResults([]);
        setShowResults(false);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchTerm, searchEntities]);

  const handleSelect = useCallback((entity: WikidataEntity) => {
    onChange?.(entity);
    setSearchTerm('');
    setShowResults(false);
    setSearchResults([]);
    setSelectedIndex(-1);
  }, [onChange]);

  const handleClear = useCallback(() => {
    onChange?.(null);
    setSearchTerm('');
    setShowResults(false);
    setSearchResults([]);
    setSelectedIndex(-1);
  }, [onChange]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!showResults || searchResults.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < searchResults.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => prev > 0 ? prev - 1 : -1);
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < searchResults.length) {
          handleSelect(searchResults[selectedIndex]);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setShowResults(false);
        setSelectedIndex(-1);
        break;
    }
  }, [showResults, searchResults, selectedIndex, handleSelect]);

  return (
    <div className={`relative ${className}`}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      
      <div className="relative">
        {value ? (
          // Show selected entity
          <div className="flex items-center justify-between p-3 border border-gray-300 rounded-md bg-gray-50">
            <div className="flex items-center space-x-3">
              <div>
                <div className="font-medium text-gray-900">
                  {WDEntityUtils.getName(value)}
                </div>
                {WDEntityUtils.getDescription(value) && (
                  <div className="text-sm text-gray-500">
                    {WDEntityUtils.getDescription(value)}
                  </div>
                )}
                <div className="text-xs text-gray-400">{value.id}</div>
              </div>
            </div>
            
            {!disabled && (
              <button
                onClick={handleClear}
                className="p-1 text-gray-400 hover:text-gray-600"
                type="button"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        ) : (
          // Show search input
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              {isSearching ? (
                <Loader2 className="w-4 h-4 text-gray-400 animate-spin" />
              ) : (
                <Search className="w-4 h-4 text-gray-400" />
              )}
            </div>
            
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={handleKeyDown}
              onFocus={() => searchTerm && setShowResults(true)}
              placeholder={placeholder}
              disabled={disabled}
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 sm:text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
            />
          </div>
        )}
        
        {/* Search Results Dropdown */}
        {showResults && searchResults.length > 0 && (
          <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
            {searchResults.map((entity, index) => (
              <button
                key={entity.id}
                onClick={() => handleSelect(entity)}
                className={`w-full px-4 py-3 text-left hover:bg-gray-50 focus:bg-gray-50 focus:outline-none ${
                  index === selectedIndex ? 'bg-blue-50' : ''
                }`}
                type="button"
              >
                <div className="font-medium text-gray-900">
                  {WDEntityUtils.getName(entity)}
                </div>
                {WDEntityUtils.getDescription(entity) && (
                  <div className="text-sm text-gray-500 mt-1">
                    {WDEntityUtils.getDescription(entity)}
                  </div>
                )}
                <div className="text-xs text-gray-400 mt-1">{entity.id}</div>
              </button>
            ))}
          </div>
        )}
        
        {/* No Results Message */}
        {showResults && searchTerm && !isSearching && searchResults.length === 0 && (
          <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg">
            <div className="px-4 py-3 text-sm text-gray-500 text-center">
              No entities found for "{searchTerm}"
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Mock data generator for testing - this would be replaced with actual API calls
function generateMockResults(query: string, entityType?: string): WikidataEntity[] {
  const mockResults: WikidataEntity[] = [];
  
  if (entityType === WD_PROPERTIES.BAND) {
    // Mock musical groups
    mockResults.push(
      {
        id: 'Q2831',
        type: 'item',
        labels: { en: { language: 'en', value: 'Michael Jackson' } },
        descriptions: { en: { language: 'en', value: 'American singer, songwriter and dancer' } },
        claims: {
          [WD_PROPERTIES.INSTANCE_OF]: [{
            id: 'statement1',
            mainsnak: { snaktype: 'value', property: WD_PROPERTIES.INSTANCE_OF, datavalue: { value: { id: WD_PROPERTIES.HUMAN }, type: 'wikibase-entityid' } },
            type: 'statement',
            rank: 'normal'
          }]
        }
      },
      {
        id: 'Q215627',
        type: 'item',
        labels: { en: { language: 'en', value: 'The Beatles' } },
        descriptions: { en: { language: 'en', value: 'English rock band' } },
        claims: {
          [WD_PROPERTIES.INSTANCE_OF]: [{
            id: 'statement2',
            mainsnak: { snaktype: 'value', property: WD_PROPERTIES.INSTANCE_OF, datavalue: { value: { id: WD_PROPERTIES.BAND }, type: 'wikibase-entityid' } },
            type: 'statement',
            rank: 'normal'
          }]
        }
      }
    );
  } else if (entityType === WD_PROPERTIES.FOOTBALL_CLUB) {
    // Mock football clubs
    mockResults.push(
      {
        id: 'Q9616',
        type: 'item',
        labels: { en: { language: 'en', value: 'Chelsea F.C.' } },
        descriptions: { en: { language: 'en', value: 'English association football club' } },
        claims: {
          [WD_PROPERTIES.INSTANCE_OF]: [{
            id: 'statement3',
            mainsnak: { snaktype: 'value', property: WD_PROPERTIES.INSTANCE_OF, datavalue: { value: { id: WD_PROPERTIES.FOOTBALL_CLUB }, type: 'wikibase-entityid' } },
            type: 'statement',
            rank: 'normal'
          }]
        }
      },
      {
        id: 'Q9617',
        type: 'item',
        labels: { en: { language: 'en', value: 'Arsenal F.C.' } },
        descriptions: { en: { language: 'en', value: 'English association football club' } },
        claims: {
          [WD_PROPERTIES.INSTANCE_OF]: [{
            id: 'statement4',
            mainsnak: { snaktype: 'value', property: WD_PROPERTIES.INSTANCE_OF, datavalue: { value: { id: WD_PROPERTIES.FOOTBALL_CLUB }, type: 'wikibase-entityid' } },
            type: 'statement',
            rank: 'normal'
          }]
        }
      }
    );
  }
  
  // Filter results by query
  return mockResults.filter(entity => 
    WDEntityUtils.getName(entity).toLowerCase().includes(query.toLowerCase()) ||
    (WDEntityUtils.getDescription(entity) || '').toLowerCase().includes(query.toLowerCase())
  );
}