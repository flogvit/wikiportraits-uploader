'use client';

import { useState, useCallback, useEffect } from 'react';
import { Search, X, Loader2, Plus } from 'lucide-react';
import { WikidataEntity, WD_PROPERTIES } from '@/types/wikidata';
import { WDPersonUtils } from '@/utils/wd-utils';
import WDPersonCardCompact from '@/components/common/WDPersonCardCompact';
import WikidataClient from '@/lib/api/WikidataClient';

interface WDPersonSelectorProps {
  entityType?: string; // Usually 'Q5' for human, but could be more specific
  value?: WikidataEntity | WikidataEntity[] | null;
  onChange?: (entities: WikidataEntity | WikidataEntity[] | null) => void;
  placeholder?: string;
  label?: string;
  required?: boolean;
  disabled?: boolean;
  multiple?: boolean;
  requiredProperties?: string[]; // Properties the person must have (e.g., P1303 for musicians)
  maxSelections?: number;
  className?: string;
}

export default function WDPersonSelector({
  entityType = WD_PROPERTIES.HUMAN,
  value,
  onChange,
  placeholder = "Search people...",
  label,
  required = false,
  disabled = false,
  multiple = false,
  requiredProperties = [],
  maxSelections,
  className = ""
}: WDPersonSelectorProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<WikidataEntity[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);

  // Normalize value to always be an array for easier handling
  const selectedEntities = multiple 
    ? (Array.isArray(value) ? value : (value ? [value] : []))
    : (value ? [value] : []);

  // Search people using Wikidata API
  const searchPeople = useCallback(async (query: string): Promise<WikidataEntity[]> => {
    if (!query.trim()) return [];
    
    setIsSearching(true);
    
    try {
      // Use actual Wikidata API for person search
      const results = await WikidataClient.searchPeople(query, requiredProperties, 10);
      
      // Remove already selected entities
      const selectedIds = selectedEntities.map(e => e.id);
      const newResults = results.filter(entity => !selectedIds.includes(entity.id));
      
      return newResults;
    } catch (error) {
      console.error('Error searching people:', error);
      // Fall back to mock data on error
      const mockResults = generateMockPeople(query, entityType);
      const filteredResults = requiredProperties.length > 0 
        ? mockResults.filter(entity => 
            requiredProperties.every(prop => entity.claims?.[prop]?.length > 0)
          )
        : mockResults;
      
      const selectedIds = selectedEntities.map(e => e.id);
      return filteredResults.filter(entity => !selectedIds.includes(entity.id));
    } finally {
      setIsSearching(false);
    }
  }, [entityType, requiredProperties, selectedEntities]);

  // Debounced search
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchTerm.trim()) {
        searchPeople(searchTerm).then(results => {
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
  }, [searchTerm, searchPeople]);

  const handleSelect = useCallback((entity: WikidataEntity) => {
    if (multiple) {
      // Check max selections
      if (maxSelections && selectedEntities.length >= maxSelections) {
        console.warn('Maximum selections reached');
        return;
      }
      
      const newSelections = [...selectedEntities, entity];
      onChange?.(newSelections);
    } else {
      onChange?.(entity);
    }
    
    setSearchTerm('');
    setShowResults(false);
    setSearchResults([]);
    setSelectedIndex(-1);
  }, [onChange, multiple, selectedEntities, maxSelections]);

  const handleRemove = useCallback((entityId: string) => {
    if (multiple) {
      const newSelections = selectedEntities.filter(e => e.id !== entityId);
      onChange?.(newSelections.length > 0 ? newSelections : null);
    } else {
      onChange?.(null);
    }
  }, [onChange, multiple, selectedEntities]);

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
          {maxSelections && (
            <span className="text-sm text-gray-500 ml-1">
              ({selectedEntities.length}/{maxSelections})
            </span>
          )}
        </label>
      )}
      
      {/* Selected Entities Display */}
      {selectedEntities.length > 0 && (
        <div className="mb-3">
          <div className={`grid gap-2 ${multiple ? 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4' : 'grid-cols-1'}`}>
            {selectedEntities.map((entity) => (
              <div key={entity.id} className="relative">
                <WDPersonCardCompact
                  entity={entity}
                  variant="main"
                  selected={false}
                />
                {!disabled && (
                  <button
                    onClick={() => handleRemove(entity.id)}
                    className="absolute -top-1 -right-1 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                    type="button"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Search Input */}
      {(!maxSelections || selectedEntities.length < maxSelections) && (
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
          
          {/* Clear All Button */}
          {selectedEntities.length > 0 && !disabled && (
            <button
              onClick={handleClear}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
              type="button"
            >
              <X className="w-4 h-4" />
            </button>
          )}
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
              <div className="flex items-center space-x-3">
                <div className="flex-1">
                  <div className="font-medium text-gray-900">
                    {WDPersonUtils.getName(entity)}
                  </div>
                  {WDPersonUtils.getDescription(entity) && (
                    <div className="text-sm text-gray-500 mt-1">
                      {WDPersonUtils.getDescription(entity)}
                    </div>
                  )}
                  <div className="text-xs text-gray-400 mt-1">{entity.id}</div>
                </div>
                <Plus className="w-4 h-4 text-gray-400" />
              </div>
            </button>
          ))}
        </div>
      )}
      
      {/* No Results Message */}
      {showResults && searchTerm && !isSearching && searchResults.length === 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg">
          <div className="px-4 py-3 text-sm text-gray-500 text-center">
            No people found for "{searchTerm}"
          </div>
        </div>
      )}
    </div>
  );
}

// Mock data generator for testing - this would be replaced with actual API calls
function generateMockPeople(query: string, entityType?: string): WikidataEntity[] {
  const mockPeople: WikidataEntity[] = [
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
        }],
        [WD_PROPERTIES.INSTRUMENT]: [{
          id: 'statement2',
          mainsnak: { snaktype: 'value', property: WD_PROPERTIES.INSTRUMENT, datavalue: { value: { id: 'Q11404' }, type: 'wikibase-entityid' } },
          type: 'statement',
          rank: 'normal'
        }]
      }
    },
    {
      id: 'Q1299',
      type: 'item',
      labels: { en: { language: 'en', value: 'The Beatles' } },
      descriptions: { en: { language: 'en', value: 'English rock band' } },
      claims: {
        [WD_PROPERTIES.INSTANCE_OF]: [{
          id: 'statement3',
          mainsnak: { snaktype: 'value', property: WD_PROPERTIES.INSTANCE_OF, datavalue: { value: { id: WD_PROPERTIES.HUMAN }, type: 'wikibase-entityid' } },
          type: 'statement',
          rank: 'normal'
        }]
      }
    },
    {
      id: 'Q5390',
      type: 'item',
      labels: { en: { language: 'en', value: 'Cristiano Ronaldo' } },
      descriptions: { en: { language: 'en', value: 'Portuguese footballer' } },
      claims: {
        [WD_PROPERTIES.INSTANCE_OF]: [{
          id: 'statement4',
          mainsnak: { snaktype: 'value', property: WD_PROPERTIES.INSTANCE_OF, datavalue: { value: { id: WD_PROPERTIES.HUMAN }, type: 'wikibase-entityid' } },
          type: 'statement',
          rank: 'normal'
        }],
        [WD_PROPERTIES.POSITION_PLAYED]: [{
          id: 'statement5',
          mainsnak: { snaktype: 'value', property: WD_PROPERTIES.POSITION_PLAYED, datavalue: { value: { id: 'Q280658' }, type: 'wikibase-entityid' } },
          type: 'statement',
          rank: 'normal'
        }]
      }
    }
  ];
  
  // Filter results by query
  return mockPeople.filter(entity => 
    WDPersonUtils.getName(entity).toLowerCase().includes(query.toLowerCase()) ||
    (WDPersonUtils.getDescription(entity) || '').toLowerCase().includes(query.toLowerCase())
  );
}