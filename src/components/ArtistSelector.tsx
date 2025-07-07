'use client';

import { useState, useEffect, useCallback } from 'react';
import { Search, Music, ExternalLink } from 'lucide-react';
import { MusicArtist } from '@/types/music';

interface WikipediaSearchResult {
  id: string;
  title: string;
  description: string;
  url: string;
  wikipedia_url: string;
  isMusicRelated?: boolean;
  extract?: string;
}

interface ArtistSelectorProps {
  onArtistSelect: (artist: MusicArtist) => void;
  selectedArtist?: MusicArtist | null;
  placeholder?: string;
  label?: string;
  type?: 'artist' | 'band';
  defaultLanguage?: string;
}

export default function ArtistSelector({
  onArtistSelect,
  selectedArtist,
  placeholder = "Search for artist...",
  label = "Artist",
  defaultLanguage = 'en'
}: ArtistSelectorProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<WikipediaSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState(defaultLanguage);

  const searchWikipedia = useCallback(async (query: string) => {
    setIsSearching(true);
    try {
      const response = await fetch(`/api/wikipedia/music-search?q=${encodeURIComponent(query)}&limit=8&lang=${selectedLanguage}`);
      const data = await response.json();
      
      if (data.results) {
        setSearchResults(data.results);
        setShowResults(true);
      }
    } catch (error) {
      console.error('Error searching Wikipedia:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }, [selectedLanguage]);

  useEffect(() => {
    const delayedSearch = setTimeout(() => {
      if (searchQuery.length >= 2) {
        searchWikipedia(searchQuery);
      } else {
        setSearchResults([]);
        setShowResults(false);
      }
    }, 300);

    return () => clearTimeout(delayedSearch);
  }, [searchQuery, selectedLanguage, searchWikipedia]);

  const handleResultSelect = (result: WikipediaSearchResult) => {
    const artist: MusicArtist = {
      id: result.id,
      name: result.title,
      wikipediaUrl: result.wikipedia_url
    };
    
    onArtistSelect(artist);
    setSearchQuery(result.title);
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

  const languages = [
    { code: 'en', name: 'English', flag: '🇺🇸' },
    { code: 'no', name: 'Norwegian', flag: '🇳🇴' },
    { code: 'da', name: 'Danish', flag: '🇩🇰' },
    { code: 'sv', name: 'Swedish', flag: '🇸🇪' },
    { code: 'de', name: 'German', flag: '🇩🇪' },
    { code: 'fr', name: 'French', flag: '🇫🇷' },
    { code: 'es', name: 'Spanish', flag: '🇪🇸' },
    { code: 'it', name: 'Italian', flag: '🇮🇹' }
  ];

  return (
    <div className="relative">
      <div className="flex items-center justify-between mb-2">
        <label className="block text-sm font-medium text-gray-700">
          <Music className="w-4 h-4 inline mr-1" />
          {label}
        </label>
        <select
          value={selectedLanguage}
          onChange={(e) => {
            setSelectedLanguage(e.target.value);
            setSearchResults([]);
            setShowResults(false);
          }}
          className="text-xs px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-purple-500"
        >
          {languages.map((lang) => (
            <option key={lang.code} value={lang.code}>
              {lang.flag} {lang.name}
            </option>
          ))}
        </select>
      </div>
      
      <div className="relative">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
            }}
            placeholder={placeholder}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
            onFocus={() => {
              if (searchResults.length > 0) {
                setShowResults(true);
              }
            }}
          />
          {selectedArtist?.name && (
            <button
              onClick={clearSelection}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              type="button"
            >
              ×
            </button>
          )}
        </div>

        {isSearching && (
          <div className="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-md shadow-lg z-10 p-2">
            <div className="text-sm text-gray-500 text-center">
              Searching {languages.find(l => l.code === selectedLanguage)?.flag} {languages.find(l => l.code === selectedLanguage)?.name} Wikipedia...
            </div>
          </div>
        )}

        {showResults && searchResults.length > 0 && (
          <div className="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-md shadow-lg z-10 max-h-80 overflow-y-auto">
            <div className="px-3 py-2 bg-gray-50 border-b text-xs text-gray-600">
              {languages.find(l => l.code === selectedLanguage)?.flag} Searching {languages.find(l => l.code === selectedLanguage)?.name} Wikipedia
            </div>
            {searchResults.map((result) => (
              <button
                key={result.id}
                onClick={() => handleResultSelect(result)}
                className="w-full px-4 py-3 text-left hover:bg-gray-50 border-b border-gray-100 last:border-b-0 focus:outline-none focus:bg-gray-50"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">{result.title}</div>
                    {result.extract && (
                      <div className="text-sm text-gray-600 mt-1 line-clamp-2">
                        {result.extract}
                      </div>
                    )}
                    {result.isMusicRelated && (
                      <div className="flex items-center mt-1">
                        <Music className="w-3 h-3 text-purple-500 mr-1" />
                        <span className="text-xs text-purple-600">Music Related</span>
                      </div>
                    )}
                  </div>
                  <ExternalLink className="w-4 h-4 text-gray-400 ml-2 flex-shrink-0" />
                </div>
              </button>
            ))}
            
            {searchQuery.trim() && (
              <button
                onClick={handleManualEntry}
                className="w-full px-4 py-3 text-left hover:bg-purple-50 border-t border-gray-200 focus:outline-none focus:bg-purple-50"
              >
                <div className="flex items-center">
                  <div className="w-8 h-8 bg-purple-100 rounded-md flex items-center justify-center mr-3">
                    <Music className="w-4 h-4 text-purple-600" />
                  </div>
                  <div>
                    <div className="font-medium text-gray-900">Add &quot;{searchQuery}&quot;</div>
                    <div className="text-sm text-gray-600">Add manually (no Wikipedia link)</div>
                  </div>
                </div>
              </button>
            )}
          </div>
        )}

        {showResults && searchResults.length === 0 && !isSearching && searchQuery.length >= 2 && (
          <div className="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-md shadow-lg z-10 p-4">
            <div className="text-sm text-gray-500 text-center mb-3">No Wikipedia results found</div>
            <button
              onClick={handleManualEntry}
              className="w-full px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              Add &quot;{searchQuery}&quot; manually
            </button>
          </div>
        )}
      </div>

      {selectedArtist?.name && selectedArtist.wikipediaUrl && (
        <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded-md">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <ExternalLink className="w-4 h-4 text-green-600 mr-2" />
              <span className="text-sm text-green-800">
                Linked to Wikipedia: {selectedArtist.name}
              </span>
            </div>
            <a
              href={selectedArtist.wikipediaUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-green-600 hover:text-green-800 text-sm"
            >
              View Page
            </a>
          </div>
        </div>
      )}
    </div>
  );
}