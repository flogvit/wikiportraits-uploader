'use client';

import { useState, useCallback, useEffect } from 'react';
import { Search, X, Loader2 } from 'lucide-react';
import { WikidataEntity, WD_PROPERTIES } from '@/types/wikidata';
import { WDOrganizationUtils } from '@/utils/wd-utils';
import WDOrganizationCard, { WDOrganizationCardCompact } from '@/components/common/WDOrganizationCard';
import WikidataClient from '@/lib/api/WikidataClient';
import { logger } from '@/utils/logger';

interface WDOrganizationSelectorProps {
  organizationType?: string; // Q215627 for bands, Q476028 for football clubs, etc.
  value?: WikidataEntity | null;
  onChange?: (entity: WikidataEntity | null) => void;
  placeholder?: string;
  label?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  compact?: boolean; // Use compact cards
}

export default function WDOrganizationSelector({
  organizationType,
  value,
  onChange,
  placeholder = "Search organizations...",
  label,
  required = false,
  disabled = false,
  className = "",
  compact = false
}: WDOrganizationSelectorProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<WikidataEntity[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);

  // Search organizations using Wikidata API
  const searchOrganizations = useCallback(async (query: string): Promise<WikidataEntity[]> => {
    if (!query.trim()) return [];
    
    setIsSearching(true);
    
    try {
      let results: WikidataEntity[];
      
      if (organizationType) {
        // Search for specific type of organization
        results = await WikidataClient.searchEntitiesOfType(query, organizationType, 10);
      } else {
        // General organization search
        const searchResponse = await WikidataClient.searchEntities({
          query: `${query} organization OR band OR club OR company`,
          limit: 10,
          type: 'item'
        });
        
        if (searchResponse.search && searchResponse.search.length > 0) {
          const entityIds = searchResponse.search.map(item => item.id);
          const entitiesResponse = await WikidataClient.getEntities({ ids: entityIds });
          results = Object.values(entitiesResponse.entities);
          
          // Filter to only show organizations
          results = results.filter(entity => {
            const instanceOf = entity.claims?.[WD_PROPERTIES.INSTANCE_OF] || [];
            return instanceOf.some(claim => {
              const value = claim.mainsnak?.datavalue?.value?.id;
              return value === WD_PROPERTIES.BAND || 
                     value === WD_PROPERTIES.FOOTBALL_CLUB ||
                     value === 'Q215627' || // musical group
                     value === 'Q476028' || // football club
                     value === 'Q4438121' || // sports club
                     value === 'Q783794' || // company
                     value === 'Q43229'; // organization
            });
          });
        } else {
          results = [];
        }
      }
      
      return results;
    } catch (error) {
      logger.error('WDOrganizationSelector', 'Error searching organizations', error);
      // Fall back to mock data
      return generateMockOrganizations(query, organizationType);
    } finally {
      setIsSearching(false);
    }
  }, [organizationType]);

  // Debounced search
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchTerm.trim()) {
        searchOrganizations(searchTerm).then(results => {
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
  }, [searchTerm, searchOrganizations]);

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
          // Show selected organization
          <div className="mb-3">
            {compact ? (
              <WDOrganizationCardCompact
                entity={value}
                selected={true}
                onRemove={!disabled ? handleClear : undefined}
              />
            ) : (
              <WDOrganizationCard
                entity={value}
                onRemove={!disabled ? () => handleClear() : undefined}
              />
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
              <div
                key={entity.id}
                className={`p-2 ${index === selectedIndex ? 'bg-blue-50' : 'hover:bg-gray-50'}`}
              >
                <WDOrganizationCardCompact
                  entity={entity}
                  onClick={() => handleSelect(entity)}
                  className="cursor-pointer"
                />
              </div>
            ))}
          </div>
        )}
        
        {/* No Results Message */}
        {showResults && searchTerm && !isSearching && searchResults.length === 0 && (
          <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg">
            <div className="px-4 py-3 text-sm text-gray-500 text-center">
              No organizations found for "{searchTerm}"
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Mock data generator for testing - fallback when API fails
function generateMockOrganizations(query: string, organizationType?: string): WikidataEntity[] {
  const mockOrganizations: WikidataEntity[] = [];
  
  if (organizationType === WD_PROPERTIES.BAND || !organizationType) {
    mockOrganizations.push(
      {
        id: 'Q2831',
        type: 'item',
        labels: { en: { language: 'en', value: 'The Beatles' } },
        descriptions: { en: { language: 'en', value: 'English rock band' } },
        claims: {
          [WD_PROPERTIES.INSTANCE_OF]: [{
            id: 'statement1',
            mainsnak: { snaktype: 'value', property: WD_PROPERTIES.INSTANCE_OF, datavalue: { value: { id: WD_PROPERTIES.BAND }, type: 'wikibase-entityid' } },
            type: 'statement',
            rank: 'normal'
          }]
        }
      },
      {
        id: 'Q5741',
        type: 'item',
        labels: { en: { language: 'en', value: 'The Rolling Stones' } },
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
  }
  
  if (organizationType === WD_PROPERTIES.FOOTBALL_CLUB || !organizationType) {
    mockOrganizations.push(
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
  return mockOrganizations.filter(entity => 
    WDOrganizationUtils.getName(entity).toLowerCase().includes(query.toLowerCase()) ||
    (WDOrganizationUtils.getDescription(entity) || '').toLowerCase().includes(query.toLowerCase())
  );
}