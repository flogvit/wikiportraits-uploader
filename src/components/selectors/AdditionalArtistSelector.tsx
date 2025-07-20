'use client';

import { useState, useEffect, useRef } from 'react';
import { Search, User, Music, Globe, Calendar } from 'lucide-react';
import { PendingWikidataEntity } from '@/types/music';
import { useWikidataPersons } from '@/hooks/useWikidataPersons';
import PerformerCard from '@/components/common/PerformerCard';
import { useUniversalForm, useUniversalFormEntities } from '@/providers/UniversalFormProvider';

interface AdditionalArtistSelectorProps {
  bandName?: string;
  bandId?: string;
  placeholder?: string;
  showTitle?: boolean;
}

export default function AdditionalArtistSelector({
  bandName,
  bandId,
  placeholder = "Search for additional artists and performers...",
  showTitle = true,
}: AdditionalArtistSelectorProps) {
  const form = useUniversalForm();
  const { people, addPerson, removePerson } = useUniversalFormEntities();
  
  // Convert UniversalForm people to old format for compatibility
  const allPerformers = people.map((person, index) => ({
    id: person.entity.id || `person-${index}`,
    name: person.entity.labels?.en?.value || 'Unknown',
    type: person.roles.includes('band-member') ? 'band_member' : 'additional_artist',
    data: {
      name: person.entity.labels?.en?.value || 'Unknown',
      instruments: person.metadata?.instruments || [],
      nationality: person.metadata?.nationality,
      birthDate: person.metadata?.birthDate,
      bandId: bandId,
      isBandMember: person.roles.includes('band-member'),
      wikidataUrl: person.metadata?.wikidataUrl,
      wikipediaUrl: person.metadata?.wikipediaUrl,
      imageUrl: person.metadata?.imageUrl
    },
    new: person.isNew || false
  }));
  
  const pendingPerformers = allPerformers.filter(p => p.new);
  const [isOpen, setIsOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const {
    searchResults,
    loading,
    error,
    searchTerm,
    setSearchTerm,
    searchArtists,
    getAdditionalArtists,
  } = useWikidataPersons(bandName, bandId, pendingPerformers);

  const currentBandId = bandId || `pending-band-${bandName}`;
  const additionalArtists = getAdditionalArtists(allPerformers, currentBandId);

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

  // Add search delay for artist search with improved debouncing
  useEffect(() => {
    const delayedSearch = setTimeout(() => {
      if (searchTerm.length >= 2) {
        searchArtists(searchTerm);
        setIsOpen(true);
      } else {
        setIsOpen(searchTerm.length > 0);
      }
    }, 300);

    return () => clearTimeout(delayedSearch);
  }, [searchTerm, searchArtists]);

  const togglePerformer = (performerId: string) => {
    // Check if performer is already in the performers array
    const existingPerformer = allPerformers.find(p => p.id === performerId);
    
    if (existingPerformer) {
      // Remove from performers
      removePerformerFromForm(performerId);
    } else {
      // Add to performers
      const searchResult = searchResults.find(p => p.id === performerId);
      if (searchResult) {
        // Create PendingWikidataEntity for additional artist
        const additionalArtist: PendingWikidataEntity = {
          id: searchResult.id,
          type: 'artist',
          status: 'created',
          name: searchResult.name,
          new: false,
          data: {
            name: searchResult.name,
            instruments: searchResult.instruments || [],
            nationality: searchResult.nationality,
            birthDate: searchResult.birthDate,
            bandId: searchResult.bandQID,
            isBandMember: false, // This is an additional artist, not a band member
            wikidataUrl: searchResult.wikidataUrl,
            wikipediaUrl: searchResult.wikipediaUrl,
            imageUrl: undefined // Will be fetched asynchronously
          }
        };
        // Add to UniversalForm entities
        addPerson({
          entity: {
            id: searchResult.id,
            type: 'item',
            labels: {
              en: {
                language: 'en',
                value: searchResult.name
              }
            },
            descriptions: {},
            claims: {},
            sitelinks: searchResult.wikipediaUrl ? {
              enwiki: {
                site: 'enwiki',
                title: searchResult.wikipediaUrl.split('/').pop() || searchResult.name
              }
            } : {}
          },
          roles: ['performer', 'featured-person'],
          isNew: false,
          source: 'additional-artist-selector',
          metadata: {
            name: searchResult.name,
            instruments: searchResult.instruments || [],
            nationality: searchResult.nationality,
            birthDate: searchResult.birthDate,
            wikidataUrl: searchResult.wikidataUrl,
            wikipediaUrl: searchResult.wikipediaUrl,
            imageUrl: undefined
          }
        });
        
        // Fetch image URL asynchronously
        fetchImageForArtist(searchResult.id, searchResult.name);
      }
    }
    
    setSearchTerm('');
    setIsOpen(false);
  };

  const handleRemove = (performerId: string) => {
    const personIndex = people.findIndex(p => p.entity.id === performerId);
    if (personIndex >= 0) {
      removePerson(personIndex);
    }
  };

  const fetchImageForArtist = async (artistId: string, artistName: string) => {
    try {
      // Use our API route to fetch image URL
      const response = await fetch(`/api/music/artist-image?artistId=${encodeURIComponent(artistId)}`);
      
      if (!response.ok) {
        console.error(`Failed to fetch image for artist ${artistName}:`, response.status);
        return;
      }

      const data = await response.json();
      
      if (data.imageUrl) {
        // Update the person with the image URL
        const personIndex = people.findIndex(p => p.entity.id === artistId);
        if (personIndex >= 0) {
          const person = people[personIndex];
          const updatedPerson = {
            ...person,
            metadata: {
              ...person.metadata,
              imageUrl: data.imageUrl
            }
          };
          
          // Update the person in the form
          removePerson(personIndex);
          addPerson(updatedPerson);
          
          console.log(`✅ Updated image for ${artistName}: ${data.imageUrl}`);
        }
      } else {
        console.log(`ℹ️ No image found for ${artistName} (${artistId})`);
      }
    } catch (error) {
      console.error(`Error fetching image for artist ${artistName}:`, error);
    }
  };

  // Filter search results to exclude already selected performers  
  const filteredSearchResults = searchResults.filter(performer => 
    !allPerformers.find(p => p.id === performer.id)
  );
  
  // Show search results only when searching (2+ characters) and there are unselected results
  const hasSearchResults = searchTerm.length >= 2 && filteredSearchResults.length > 0;

  const selectedAdditionalArtists = additionalArtists;

  return (
    <div className="space-y-4">
      {/* Additional Artists Label and Search input */}
      <div className="space-y-2">
        <div className="relative" ref={dropdownRef}>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            ref={inputRef}
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={placeholder}
            onFocus={() => {
              setIsOpen(true);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                setIsOpen(false);
                setSearchTerm('');
                inputRef.current?.blur();
              }
            }}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Dropdown - show search results only */}
        {isOpen && (
          <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-64 overflow-y-auto">
            {/* Show search results when searching */}
            {hasSearchResults && (
              <>
                <div className="px-3 py-2 bg-green-50 border-b border-green-200">
                  <span className="text-xs font-medium text-green-700">Search Results - Click to Add</span>
                </div>
                {filteredSearchResults.map(performer => (
                  <div
                    key={performer.id}
                    className="p-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      togglePerformer(performer.id);
                    }}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-gray-400" />
                          <h3 className="font-medium text-gray-900">{performer.name}</h3>
                        </div>
                        
                        {performer.instruments && performer.instruments.length > 0 && (
                          <div className="flex items-center gap-1 mt-1">
                            <Music className="w-3 h-3 text-gray-400" />
                            <span className="text-sm text-gray-600">
                              {performer.instruments.join(', ')}
                            </span>
                          </div>
                        )}
                        
                        <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                          {performer.birthDate && (
                            <div className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              <span>{new Date(performer.birthDate).getFullYear()}</span>
                            </div>
                          )}
                          
                          {performer.nationality && (
                            <span>{performer.nationality}</span>
                          )}
                          
                          {performer.wikidataUrl && (
                            <a
                              href={performer.wikidataUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1 text-blue-600 hover:text-blue-800"
                              onMouseDown={(e) => e.stopPropagation()}
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Globe className="w-3 h-3" />
                              <span>Wikidata</span>
                            </a>
                          )}
                          
                          {performer.wikipediaUrl && (
                            <a
                              href={performer.wikipediaUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1 text-green-600 hover:text-green-800"
                              onMouseDown={(e) => e.stopPropagation()}
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Globe className="w-3 h-3" />
                              <span>Wikipedia</span>
                            </a>
                          )}
                        </div>
                      </div>
                      
                      {performer.imageUrl && (
                        <img
                          src={performer.imageUrl}
                          alt={performer.name}
                          className="w-12 h-12 rounded-full object-cover ml-3"
                        />
                      )}
                    </div>
                  </div>
                ))}
              </>
            )}
            
            {/* Show loading state when searching */}
            {searchTerm.length >= 2 && loading && (
              <div className="p-4 text-gray-500 text-center">
                Searching Wikidata...
              </div>
            )}
            
            {/* Show empty search results */}
            {searchTerm.length >= 2 && !hasSearchResults && !loading && (
              <div className="p-4 text-gray-500 text-center">
                No artists found
              </div>
            )}
            
            {/* Show instructions when not searching */}
            {searchTerm.length < 2 && !loading && (
              <div className="p-4 text-gray-500 text-center">
                Type to search for additional artists and performers
              </div>
            )}
          </div>
        )}
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}
    </div>
  );
}