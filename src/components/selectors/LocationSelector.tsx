'use client';

import { useState, useEffect } from 'react';
import { MapPin, X } from 'lucide-react';
import { searchWikidataEntities } from '@/utils/wikidata';

interface LocationResult {
  id: string;
  name: string;
  description?: string;
  country?: string;
  countryQid?: string;
  wikidataId: string;
  wikidataUrl: string;
}

interface LocationSelectorProps {
  onLocationSelect: (location: LocationResult | null) => void;
  selectedLocation: LocationResult | null;
  placeholder?: string;
  locationType?: 'city' | 'venue' | 'any';
}

export default function LocationSelector({
  onLocationSelect,
  selectedLocation,
  placeholder = 'Search for location...',
  locationType = 'any'
}: LocationSelectorProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<LocationResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);

  useEffect(() => {
    const searchLocations = async () => {
      if (query.length < 2) {
        setResults([]);
        return;
      }

      setLoading(true);
      try {
        // Search Wikidata for locations
        const wikidataResults = await searchWikidataEntities(query, 10, 'en');

        const locationResults: LocationResult[] = [];

        for (const result of wikidataResults) {
          try {
            const { getWikidataEntity } = await import('@/utils/wikidata');
            const entity = await getWikidataEntity(result.id, 'en', 'labels|descriptions|claims');

            // Check instance of (P31)
            const instanceOf = entity.claims?.P31?.map((claim: any) =>
              claim.mainsnak?.datavalue?.value?.id
            ) || [];

            // Filter by location type
            const isCity = instanceOf.some((qid: string) =>
              ['Q515', 'Q486972', 'Q1549591', 'Q3957'].includes(qid)
            ); // city, settlement, big city, town

            const isVenue = instanceOf.some((qid: string) =>
              ['Q41176', 'Q17350442', 'Q24354', 'Q188055'].includes(qid)
            ); // venue, music venue, theater, arena

            const isCountry = instanceOf.some((qid: string) =>
              qid === 'Q6256'
            ); // country

            // Skip if doesn't match type filter
            if (locationType === 'city' && !isCity) continue;
            if (locationType === 'venue' && !isVenue) continue;

            // Get country if location is not a country
            let country = '';
            let countryQid = '';
            if (!isCountry) {
              const countryClaim = entity.claims?.P17?.[0];
              if (countryClaim) {
                countryQid = countryClaim.mainsnak?.datavalue?.value?.id;
                if (countryQid) {
                  const countryEntity = await getWikidataEntity(countryQid, 'en', 'labels');
                  country = countryEntity.labels?.en?.value || '';
                }
              }
            }

            locationResults.push({
              id: entity.id,
              name: entity.labels?.en?.value || '',
              description: entity.descriptions?.en?.value,
              country,
              countryQid,
              wikidataId: entity.id,
              wikidataUrl: `https://www.wikidata.org/wiki/${entity.id}`
            });
          } catch (error) {
            console.error('Error processing location result:', error);
          }
        }

        setResults(locationResults);
      } catch (error) {
        console.error('Error searching locations:', error);
        setResults([]);
      } finally {
        setLoading(false);
      }
    };

    const debounce = setTimeout(searchLocations, 300);
    return () => clearTimeout(debounce);
  }, [query, locationType]);

  const handleSelect = (location: LocationResult) => {
    onLocationSelect(location);
    setShowResults(false);
    setQuery('');
  };

  const handleClear = () => {
    onLocationSelect(null);
    setQuery('');
  };

  return (
    <div className="relative">
      {selectedLocation ? (
        <div className="flex items-center gap-2 px-3 py-2 bg-green-50 border border-green-200 rounded-md">
          <MapPin className="w-4 h-4 text-green-600" />
          <div className="flex-1">
            <p className="text-sm font-medium text-green-900">{selectedLocation.name}</p>
            {selectedLocation.country && (
              <p className="text-xs text-green-700">{selectedLocation.country}</p>
            )}
          </div>
          <button
            onClick={handleClear}
            className="text-green-600 hover:text-green-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <>
          <div className="relative">
            <input
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setShowResults(true);
              }}
              onFocus={() => setShowResults(true)}
              placeholder={placeholder}
              className="w-full px-3 py-2 pl-10 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary text-card-foreground bg-card"
            />
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          </div>

          {/* Results dropdown */}
          {showResults && query.length >= 2 && (
            <div className="absolute z-10 mt-1 w-full bg-card border border-border rounded-md shadow-lg max-h-96 overflow-y-auto">
              {loading ? (
                <div className="p-4 text-center text-muted-foreground">
                  Searching...
                </div>
              ) : results.length > 0 ? (
                results.map((location) => (
                  <button
                    key={location.id}
                    onClick={() => handleSelect(location)}
                    className="w-full px-4 py-3 text-left hover:bg-muted/50 border-b border-border last:border-b-0"
                  >
                    <div className="flex items-start gap-2">
                      <MapPin className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-card-foreground">{location.name}</p>
                        {location.description && (
                          <p className="text-xs text-muted-foreground">{location.description}</p>
                        )}
                        {location.country && (
                          <p className="text-xs text-blue-600 mt-1">{location.country}</p>
                        )}
                      </div>
                    </div>
                  </button>
                ))
              ) : (
                <div className="p-4 text-center text-muted-foreground">
                  No locations found
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
