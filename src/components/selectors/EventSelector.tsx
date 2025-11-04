'use client';

import { useState, useEffect, useRef } from 'react';
import { Search, Calendar, MapPin, ExternalLink, CheckCircle, AlertCircle } from 'lucide-react';
import { CommonsClient } from '@/lib/api/CommonsClient';
import { searchWikidataEntities, getWikidataEntity } from '@/utils/wikidata';

interface EventResult {
  id: string;
  name: string;
  year?: string;
  location?: string;
  country?: string;
  wikidataId?: string;
  wikidataUrl?: string;
  commonsCategory?: string;
  commonsCategoryUrl?: string;
  categoryExists?: boolean;
  fileCount?: number;
  source: 'wikidata' | 'commons' | 'both';
}

interface EventSelectorProps {
  onEventSelect: (event: EventResult) => void;
  selectedEvent?: EventResult | null;
  placeholder?: string;
  eventType?: 'music-festival' | 'concert' | 'event';
}

export default function EventSelector({
  onEventSelect,
  selectedEvent,
  placeholder = "Search for event or festival...",
  eventType = 'music-festival'
}: EventSelectorProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [searchResults, setSearchResults] = useState<EventResult[]>([]);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Handle clicking outside to close dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  // Search with debounce
  useEffect(() => {
    const delayedSearch = setTimeout(() => {
      if (searchTerm.length >= 3) {
        performSearch(searchTerm);
      } else {
        setSearchResults([]);
        setIsOpen(false);
      }
    }, 300);

    return () => clearTimeout(delayedSearch);
  }, [searchTerm]);

  const performSearch = async (query: string) => {
    setLoading(true);
    setIsOpen(true);

    try {
      const results: EventResult[] = [];
      const processedIds = new Set<string>();

      // 1. Search Wikidata for music festivals/events
      const wikidataResults = await searchWikidataEntities(query, 10, 'en', 'item');

      for (const result of wikidataResults) {
        try {
          const entity = await getWikidataEntity(result.id, 'en', 'labels|descriptions|claims');

          // Check if it's a music festival or event
          const instanceOf = entity.claims?.P31;
          const isMusicEvent = instanceOf?.some((claim: any) => {
            const qid = claim.mainsnak?.datavalue?.value?.id;
            return [
              'Q868557',  // music festival
              'Q1569406', // festival edition
              'Q46755',   // music event
              'Q2145682', // concert tour
              'Q2994645', // music venue
            ].includes(qid);
          });

          if (!isMusicEvent) continue;

          // Extract event details
          const name = entity.labels?.en?.value || result.label || '';

          // Get year from "point in time" (P585) or "inception" (P571)
          const pointInTime = entity.claims?.P585?.[0]?.mainsnak?.datavalue?.value?.time;
          const inception = entity.claims?.P571?.[0]?.mainsnak?.datavalue?.value?.time;
          const yearMatch = (pointInTime || inception)?.match(/\+(\d{4})/);
          const year = yearMatch ? yearMatch[1] : undefined;

          // Get location
          const locationClaim = entity.claims?.P276?.[0] || entity.claims?.P17?.[0]; // location or country
          let location = '';
          if (locationClaim) {
            const locationId = locationClaim.mainsnak?.datavalue?.value?.id;
            if (locationId) {
              try {
                const locationEntity = await getWikidataEntity(locationId, 'en', 'labels');
                location = locationEntity.labels?.en?.value || '';
              } catch {
                location = '';
              }
            }
          }

          // Generate expected Commons category name
          const commonsCategory = year ? `${name} ${year}` : name;

          const eventResult: EventResult = {
            id: entity.id,
            name,
            year,
            location,
            wikidataId: entity.id,
            wikidataUrl: `https://www.wikidata.org/wiki/${entity.id}`,
            commonsCategory,
            commonsCategoryUrl: `https://commons.wikimedia.org/wiki/Category:${encodeURIComponent(commonsCategory)}`,
            source: 'wikidata'
          };

          processedIds.add(commonsCategory);
          results.push(eventResult);
        } catch (error) {
          console.error('Error processing Wikidata entity:', error);
        }
      }

      // 2. Search Commons categories
      try {
        const commonsCategories = await CommonsClient.searchCategories(query, 10);

        for (const category of commonsCategories) {
          const categoryName = category.title.replace(/^Category:/, '');

          // Skip if we already have this from Wikidata
          if (processedIds.has(categoryName)) {
            // Update the existing result with Commons info
            const existingResult = results.find(r => r.commonsCategory === categoryName);
            if (existingResult) {
              existingResult.source = 'both';
              existingResult.categoryExists = true;
              existingResult.fileCount = category.categoryinfo?.files || 0;
            }
            continue;
          }

          // Parse year from category name (e.g., "Festival Name 2025")
          const yearMatch = categoryName.match(/\b(19|20)\d{2}\b/);
          const year = yearMatch ? yearMatch[0] : undefined;
          const name = year ? categoryName.replace(year, '').trim() : categoryName;

          results.push({
            id: `commons-${categoryName}`,
            name,
            year,
            commonsCategory: categoryName,
            commonsCategoryUrl: `https://commons.wikimedia.org/wiki/Category:${encodeURIComponent(categoryName)}`,
            categoryExists: true,
            fileCount: category.categoryinfo?.files || 0,
            source: 'commons'
          });
        }
      } catch (error) {
        console.error('Error searching Commons categories:', error);
      }

      // 3. Check if Commons categories exist for Wikidata results
      const wikidataOnlyResults = results.filter(r => r.source === 'wikidata');
      await Promise.all(
        wikidataOnlyResults.map(async (result) => {
          if (result.commonsCategory) {
            try {
              const categoryInfo = await CommonsClient.getCategoryInfo(result.commonsCategory);
              if (categoryInfo) {
                result.source = 'both';
                result.categoryExists = true;
                result.fileCount = categoryInfo.categoryinfo?.files || 0;
              }
            } catch (error) {
              console.error('Error checking Commons category:', error);
            }
          }
        })
      );

      setSearchResults(results);
    } catch (error) {
      console.error('Event search error:', error);
      setSearchResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (event: EventResult) => {
    onEventSelect(event);
    setSearchTerm('');
    setIsOpen(false);
  };

  return (
    <div className="space-y-2">
      <div className="relative" ref={dropdownRef}>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={placeholder}
            onFocus={() => {
              if (searchResults.length > 0) {
                setIsOpen(true);
              }
            }}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Search Results Dropdown */}
        {isOpen && (
          <div className="absolute z-20 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-96 overflow-y-auto">
            {loading && (
              <div className="p-4 text-gray-500 text-center text-sm">
                Searching Wikidata and Commons...
              </div>
            )}

            {!loading && searchResults.length > 0 && (
              <>
                <div className="px-3 py-2 bg-blue-50 border-b border-blue-200">
                  <span className="text-xs font-medium text-blue-700">
                    Found {searchResults.length} event{searchResults.length !== 1 ? 's' : ''}
                  </span>
                </div>
                {searchResults.map((result) => (
                  <div
                    key={result.id}
                    className="p-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      handleSelect(result);
                    }}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-blue-500" />
                          <h4 className="font-medium text-gray-900">
                            {result.name}
                            {result.year && <span className="text-gray-600 ml-1">({result.year})</span>}
                          </h4>
                        </div>

                        {result.location && (
                          <div className="flex items-center gap-1 mt-1">
                            <MapPin className="w-3 h-3 text-gray-400" />
                            <span className="text-sm text-gray-600">{result.location}</span>
                          </div>
                        )}

                        <div className="flex items-center gap-3 mt-2 text-xs">
                          {result.categoryExists && (
                            <div className="flex items-center gap-1 text-green-600">
                              <CheckCircle className="w-3 h-3" />
                              <span>Commons category exists</span>
                              {result.fileCount !== undefined && (
                                <span className="text-gray-500">({result.fileCount} files)</span>
                              )}
                            </div>
                          )}

                          {!result.categoryExists && result.source === 'wikidata' && (
                            <div className="flex items-center gap-1 text-amber-600">
                              <AlertCircle className="w-3 h-3" />
                              <span>New Commons category</span>
                            </div>
                          )}

                          {result.wikidataUrl && (
                            <a
                              href={result.wikidataUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1 text-blue-600 hover:text-blue-800"
                              onMouseDown={(e) => e.stopPropagation()}
                              onClick={(e) => e.stopPropagation()}
                            >
                              <ExternalLink className="w-3 h-3" />
                              <span>Wikidata</span>
                            </a>
                          )}

                          {result.commonsCategoryUrl && result.categoryExists && (
                            <a
                              href={result.commonsCategoryUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1 text-green-600 hover:text-green-800"
                              onMouseDown={(e) => e.stopPropagation()}
                              onClick={(e) => e.stopPropagation()}
                            >
                              <ExternalLink className="w-3 h-3" />
                              <span>Commons</span>
                            </a>
                          )}
                        </div>

                        {result.commonsCategory && (
                          <div className="mt-2 text-xs text-gray-500">
                            Category: {result.commonsCategory}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </>
            )}

            {!loading && searchResults.length === 0 && searchTerm.length >= 3 && (
              <div className="p-4 text-center">
                <p className="text-sm text-gray-500 mb-2">
                  No existing events found
                </p>
                <p className="text-xs text-gray-400">
                  You can create a new event entry
                </p>
              </div>
            )}

            {searchTerm.length < 3 && (
              <div className="p-4 text-gray-500 text-center text-sm">
                Type at least 3 characters to search
              </div>
            )}
          </div>
        )}
      </div>

      {/* Selected Event Display */}
      {selectedEvent && (
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-blue-600" />
                <span className="font-medium text-gray-900">
                  {selectedEvent.name}
                  {selectedEvent.year && <span className="text-gray-600 ml-1">({selectedEvent.year})</span>}
                </span>
              </div>

              {selectedEvent.location && (
                <div className="flex items-center gap-1 mt-1">
                  <MapPin className="w-3 h-3 text-gray-400" />
                  <span className="text-sm text-gray-600">{selectedEvent.location}</span>
                </div>
              )}

              {selectedEvent.categoryExists && (
                <div className="flex items-center gap-1 mt-2 text-xs text-green-600">
                  <CheckCircle className="w-3 h-3" />
                  <span>Existing event on Commons</span>
                  {selectedEvent.fileCount !== undefined && (
                    <span className="text-gray-500">({selectedEvent.fileCount} files)</span>
                  )}
                </div>
              )}

              {!selectedEvent.categoryExists && (
                <div className="flex items-center gap-1 mt-2 text-xs text-amber-600">
                  <AlertCircle className="w-3 h-3" />
                  <span>New event - Category will be created</span>
                </div>
              )}
            </div>

            <button
              onClick={() => onEventSelect(null as any)}
              className="text-gray-400 hover:text-gray-600"
            >
              <span className="text-xl">&times;</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
