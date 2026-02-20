'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { ExternalLink } from 'lucide-react';
import { MusicArtist } from '@/types/music';
import { WikidataEntity } from '@/types/wikidata';
import { searchWikidataEntities, getWikidataEntity } from '@/utils/wikidata';
import ArtistSearchInput from './ArtistSearchInput';
import ArtistResultsList from './ArtistResultsList';
import { logger } from '@/utils/logger';

interface UnifiedArtistResult {
  id: string;
  name: string;
  description?: string;
  country?: string;
  countryCode?: string;
  musicbrainzId?: string;
  formedYear?: string;
  wikipediaUrl?: string;
  wikidataUrl?: string;
  isMusicRelated: boolean;
  entityType?: 'person' | 'group' | 'unknown';
  source: 'wikidata' | 'wikipedia';
  extract?: string;
}

interface ArtistSelectorProps {
  onArtistSelect: (artist: MusicArtist) => void;
  selectedArtist?: MusicArtist | null;
  placeholder?: string;
  label?: string;
  type?: 'artist' | 'band';
  returnType?: 'MusicArtist' | 'WikidataEntity';
  onWikidataEntitySelect?: (entity: WikidataEntity) => void;
}

export default function ArtistSelector({
  onArtistSelect,
  selectedArtist,
  placeholder = "Search for artist...",
  returnType = 'MusicArtist',
  onWikidataEntitySelect
}: ArtistSelectorProps) {
  const [searchQuery, setSearchQueryState] = useState('');
  const [searchResults, setSearchResults] = useState<UnifiedArtistResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchingRef = useRef(false); // Use ref to prevent concurrent searches

  // Wrapped setter with logging
  const setSearchQuery = (value: string) => {
    setSearchQueryState(value);
  };

  // Handle clicking outside to close dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowResults(false);
      }
    }

    if (showResults) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showResults]);

  const searchArtists = useCallback(async (query: string) => {
    // Prevent concurrent searches using ref
    if (searchingRef.current) {
      return;
    }

    searchingRef.current = true;
    setIsSearching(true);
    try {
      // Search for entities using the working wikidata utility
      const searchResults = await searchWikidataEntities(query, 8, 'en', 'item');
      
      if (searchResults.length === 0) {
        setSearchResults([]);
        setShowResults(true);
        return;
      }

      // Get full entity details for filtering and conversion
      const entityPromises = searchResults.map(result => 
        getWikidataEntity(result.id, 'en', 'labels|descriptions|claims|sitelinks')
      );
      
      const entities = await Promise.all(entityPromises);

      // Filter and convert to UnifiedArtistResult format
      const convertedResults: UnifiedArtistResult[] = entities
        .filter(entity => {
          // Check if entity is music-related (human or musical group)
          const instanceOf = entity.claims?.P31;
          if (!instanceOf) return false;
          
          return instanceOf.some((claim: any) => {
            const qid = claim.mainsnak?.datavalue?.value?.id;
            return qid === 'Q5' || // human
                   qid === 'Q215380' || // musical group
                   qid === 'Q2088357' || // musical ensemble
                   qid === 'Q5741069'; // rock band
          });
        })
        .map(entity => {
          // Determine entity type
          const instanceOf = entity.claims?.P31;
          const isHuman = instanceOf?.some((claim: any) => 
            claim.mainsnak?.datavalue?.value?.id === 'Q5'
          );
          
          // Get Wikipedia URL
          const enwikiSitelink = entity.sitelinks?.enwiki;
          const wikipediaUrl = enwikiSitelink 
            ? `https://en.wikipedia.org/wiki/${encodeURIComponent(enwikiSitelink.title)}`
            : undefined;

          return {
            id: entity.id,
            name: entity.labels?.en?.value || entity.id,
            description: entity.descriptions?.en?.value,
            wikipediaUrl,
            wikidataUrl: `https://www.wikidata.org/wiki/${entity.id}`,
            isMusicRelated: true,
            entityType: isHuman ? 'person' as const : 'group' as const,
            source: 'wikidata' as const
          };
        })
        .slice(0, 8); // Limit to 8 results

      setSearchResults(convertedResults);
      setShowResults(true);
    } catch (error) {
      logger.error('ArtistSelector', 'Error searching for artists', error);
      // Fallback to basic search results without filtering
      try {
        const basicResults = await searchWikidataEntities(query, 8, 'en', 'item');
        const fallbackResults: UnifiedArtistResult[] = basicResults.map(result => ({
          id: result.id,
          name: result.display?.label?.value || result.label || result.id,
          description: result.display?.description?.value || result.description,
          wikipediaUrl: undefined,
          wikidataUrl: `https://www.wikidata.org/wiki/${result.id}`,
          isMusicRelated: false,
          entityType: 'unknown' as const,
          source: 'wikidata' as const
        }));
        setSearchResults(fallbackResults);
        setShowResults(true);
      } catch (fallbackError) {
        logger.error('ArtistSelector', 'Fallback search also failed', fallbackError);
        setSearchResults([]);
      }
    } finally {
      setIsSearching(false);
      searchingRef.current = false;
    }
  }, []);

  useEffect(() => {
    const delayedSearch = setTimeout(() => {
      // Don't search if we have a selected artist and the query matches the artist name
      if (selectedArtist?.name && searchQuery === selectedArtist.name) {
        setSearchResults([]);
        setShowResults(false);
        return;
      }

      if (searchQuery.length >= 2) {
        searchArtists(searchQuery);
      } else {
        setSearchResults([]);
        setShowResults(false);
      }
    }, 300);

    return () => clearTimeout(delayedSearch);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery, selectedArtist?.name]); // Removed searchArtists from deps since it's stable

  const handleResultSelect = async (result: UnifiedArtistResult) => {
    if (returnType === 'WikidataEntity' && onWikidataEntitySelect) {
      try {
        // Fetch the full WikidataEntity
        const wikidataEntity = await getWikidataEntity(result.id);
        if (wikidataEntity) {
          onWikidataEntitySelect(wikidataEntity);
        }
      } catch (error) {
        logger.error('ArtistSelector', 'Failed to fetch WikidataEntity', error);
        // Fallback to MusicArtist format
      }
    } else {
      // Return MusicArtist format
      const artist: MusicArtist = {
        id: result.id,
        name: result.name,
        wikipediaUrl: result.wikipediaUrl,
        wikidataUrl: result.wikidataUrl,
        musicbrainzId: result.musicbrainzId,
        country: result.country,
        entityType: result.entityType,
        source: result.source
      };
      
      onArtistSelect(artist);
    }
    
    setSearchQuery(result.name);
    setShowResults(false);
  };

  const handleManualEntry = () => {
    if (searchQuery.trim()) {
      const artist: MusicArtist = {
        id: `manual-${Date.now()}`,
        name: searchQuery.trim()
      };
      
      onArtistSelect(artist);
      setShowResults(false);
    }
  };

  const clearSelection = () => {
    const emptyArtist: MusicArtist = {
      id: '',
      name: ''
    };
    onArtistSelect(emptyArtist);
    setSearchQuery('');
    setShowResults(false);
  };


  const handleFocus = () => {
    if (searchResults.length > 0) {
      setShowResults(true);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <ArtistSearchInput
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        placeholder={placeholder}
        isSearching={isSearching}
        selectedArtist={selectedArtist}
        onClearSelection={clearSelection}
        onFocus={handleFocus}
      />

      <ArtistResultsList
        results={searchResults}
        searchQuery={searchQuery}
        onResultSelect={handleResultSelect}
        onManualEntry={handleManualEntry}
        showResults={showResults}
      />

      {selectedArtist?.name && selectedArtist.wikipediaUrl && (
        <div className="mt-2 p-2 bg-success/10 border border-success/20 rounded-md">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <ExternalLink className="w-4 h-4 text-success mr-2" />
              <span className="text-sm text-success">
                Linked to Wikipedia: {selectedArtist.name}
              </span>
            </div>
            <a
              href={selectedArtist.wikipediaUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-success hover:text-success/80 text-sm"
            >
              View Page
            </a>
          </div>
        </div>
      )}
    </div>
  );
}