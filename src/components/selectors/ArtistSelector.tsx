'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { ExternalLink } from 'lucide-react';
import { MusicArtist } from '@/types/music';
import ArtistSearchInput from './ArtistSearchInput';
import ArtistResultsList from './ArtistResultsList';

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
  defaultLanguage?: string;
  currentLanguage?: string;
}

export default function ArtistSelector({
  onArtistSelect,
  selectedArtist,
  placeholder = "Search for artist...",
  label = "Artist",
  defaultLanguage = 'en',
  currentLanguage
}: ArtistSelectorProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UnifiedArtistResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState(currentLanguage || defaultLanguage);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Update selected language when currentLanguage prop changes
  useEffect(() => {
    if (currentLanguage) {
      setSelectedLanguage(currentLanguage);
    }
  }, [currentLanguage]);

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
    setIsSearching(true);
    try {
      const response = await fetch(`/api/music/artist-search?q=${encodeURIComponent(query)}&limit=8&lang=${selectedLanguage}`);
      const data = await response.json();
      
      if (data.results) {
        setSearchResults(data.results);
        setShowResults(true);
      }
    } catch (error) {
      console.error('Error searching for artists:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }, [selectedLanguage]);

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
  }, [searchQuery, selectedLanguage, searchArtists, selectedArtist]);

  const handleResultSelect = (result: UnifiedArtistResult) => {
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

  const handleLanguageChange = (language: string) => {
    setSelectedLanguage(language);
    setSearchResults([]);
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
        selectedLanguage={selectedLanguage}
        onLanguageChange={handleLanguageChange}
      />

      <ArtistResultsList
        results={searchResults}
        searchQuery={searchQuery}
        selectedLanguage={selectedLanguage}
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