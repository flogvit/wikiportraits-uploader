'use client';

import { useState, useEffect, useRef } from 'react';
import { UserPlus, ChevronDown, Plus, X, Search, User } from 'lucide-react';
import { PendingWikidataEntity, PendingBandMemberData } from '@/types/music';
import { COMMON_INSTRUMENTS, COMMON_ROLES, InstrumentRole, useWikidataPersons } from '@/hooks/useWikidataPersons';
import CountrySelector from './CountrySelector';
import PerformerCard from '@/components/common/PerformerCard';
import { useUniversalForm, useUniversalFormEntities } from '@/providers/UniversalFormProvider';
import { WDPerson } from '@/classes';

interface NewPerformerSelectorProps {
  bandName?: string;
  bandId?: string;
  showTitle?: boolean;
}

export default function NewPerformerSelector({
  bandName,
  bandId,
  showTitle = true,
}: NewPerformerSelectorProps) {
  const { getValues, setValue } = useUniversalForm();
  const entities = useUniversalFormEntities();
  const people = entities.people || [];
  const pendingPerformers = people.filter((p: any) => p.new === true);
  const [showAddArtistForm, setShowAddArtistForm] = useState(false);
  const [newArtistName, setNewArtistName] = useState('');
  const [newArtistInstruments, setNewArtistInstruments] = useState<string[]>([]);
  const [newArtistNationality, setNewArtistNationality] = useState('');
  const [newArtistGender, setNewArtistGender] = useState('');
  const [newArtistLegalName, setNewArtistLegalName] = useState('');
  const [newArtistBirthDate, setNewArtistBirthDate] = useState('');
  const [newArtistIsBandMember, setNewArtistIsBandMember] = useState(false);
  const [showInstrumentDropdown, setShowInstrumentDropdown] = useState(false);
  const [customInstrument, setCustomInstrument] = useState('');

  // Wikidata search state
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const searchDropdownRef = useRef<HTMLDivElement>(null);

  // Use the Wikidata search hook
  const {
    searchResults,
    loading: searchLoading,
    searchArtists,
  } = useWikidataPersons(bandName, bandId, []);

  const pendingPerformersForDisplay = pendingPerformers;

  // Handle clicking outside search dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchDropdownRef.current && !searchDropdownRef.current.contains(event.target as Node)) {
        setShowSearchResults(false);
      }
    }

    if (showSearchResults) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showSearchResults]);

  // Search Wikidata when user types
  useEffect(() => {
    const delayedSearch = setTimeout(() => {
      if (searchTerm.length >= 2) {
        searchArtists(searchTerm);
        setShowSearchResults(true);
      } else {
        setShowSearchResults(false);
      }
    }, 300);

    return () => clearTimeout(delayedSearch);
  }, [searchTerm, searchArtists]);

  // Filter out already selected performers from search results
  const filteredSearchResults = searchResults.filter(result =>
    !people.find(p => p.id === result.id)
  );

  const handleSelectExistingArtist = async (artistId: string) => {
    const artist = searchResults.find(a => a.id === artistId);
    if (!artist) return;

    // Create WikidataEntity from search result
    const baseEntity = {
      id: artist.id,
      type: 'item' as const,
      labels: {
        en: {
          language: 'en',
          value: artist.name
        }
      },
      descriptions: {},
      claims: {},
      sitelinks: artist.wikipediaUrl ? {
        enwiki: {
          site: 'enwiki',
          title: artist.wikipediaUrl.split('/').pop() || artist.name
        }
      } : {}
    };

    // Use WDPerson class to add properties
    const wdPerson = new WDPerson(baseEntity);

    // Add instruments
    if (artist.instruments && artist.instruments.length > 0) {
      artist.instruments.forEach(instrument => {
        wdPerson.addInstrument(instrument);
      });
    }

    // Add to band if band member checkbox was selected in manual form
    if (bandId && newArtistIsBandMember) {
      wdPerson.addBandMembership(bandId);
    }

    entities.addPerson(wdPerson.rawEntity);

    // Fetch image URL asynchronously
    fetchImageForArtist(artist.id, artist.name);

    // Reset search and form
    setSearchTerm('');
    setShowSearchResults(false);
    setShowAddArtistForm(false);
    resetForm();
  };

  const fetchImageForArtist = async (artistId: string, artistName: string) => {
    try {
      const response = await fetch(`/api/music/artist-image?artistId=${encodeURIComponent(artistId)}`);

      if (!response.ok) {
        console.error(`Failed to fetch image for artist ${artistName}:`, response.status);
        return;
      }

      const data = await response.json();

      if (data.imageUrl) {
        const personIndex = people.findIndex(p => p.id === artistId);
        if (personIndex >= 0) {
          const person = people[personIndex];
          const wdPerson = new WDPerson(person);
          wdPerson.setImage(data.imageUrl);
          entities.removePerson(personIndex);
          entities.addPerson(wdPerson.rawEntity);
        }
      }
    } catch (error) {
      console.error(`Error fetching image for artist ${artistName}:`, error);
    }
  };

  const resetForm = () => {
    setNewArtistName('');
    setNewArtistInstruments([]);
    setNewArtistNationality('');
    setNewArtistGender('');
    setNewArtistLegalName('');
    setNewArtistBirthDate('');
    setNewArtistIsBandMember(false);
  };

  const addInstrumentRole = (item: InstrumentRole) => {
    if (!newArtistInstruments.includes(item.name)) {
      setNewArtistInstruments([...newArtistInstruments, item.name]);
    }
    setShowInstrumentDropdown(false);
  };

  const addCustomInstrument = () => {
    if (customInstrument.trim() && !newArtistInstruments.includes(customInstrument.trim())) {
      setNewArtistInstruments([...newArtistInstruments, customInstrument.trim()]);
      setCustomInstrument('');
    }
  };

  const removeInstrumentRole = (instrument: string) => {
    setNewArtistInstruments(newArtistInstruments.filter(i => i !== instrument));
  };

  const handleAddArtist = async () => {
    if (!newArtistName.trim()) return;

    const newArtist: PendingWikidataEntity = {
      id: `pending-artist-${Date.now()}`,
      type: 'band_member',
      status: 'pending',
      name: newArtistName,
      new: true,
      data: {
        name: newArtistName,
        legalName: newArtistLegalName || undefined,
        instruments: newArtistInstruments,
        nationality: newArtistNationality || undefined,
        gender: newArtistGender as any || undefined,
        birthDate: newArtistBirthDate || undefined,
        isBandMember: newArtistIsBandMember,
        bandId: bandId || `pending-band-${bandName}`,
      } as PendingBandMemberData
    };

    // Add to form - add to entities.people
    entities.addPerson(newArtist as any);

    // Reset form
    resetForm();
    setSearchTerm('');
    setShowAddArtistForm(false);
  };

  const handleRemove = (performerId: string) => {
    const currentPeople = getValues('entities.people') || [];
    const index = currentPeople.findIndex((p: any) => p.id === performerId);
    if (index >= 0) {
      entities.removePerson(index);
    }
  };

  const selectedPendingPerformers = pendingPerformersForDisplay;

  return (
    <div className="space-y-4">
      {/* Add New Artist Section */}
      <div className="space-y-2">
        <div className="flex gap-2">
          <button
            onClick={() => setShowAddArtistForm(!showAddArtistForm)}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm"
          >
            <UserPlus className="w-4 h-4" />
            Add New Artist
          </button>
        </div>
      </div>

      {/* Add Artist Form */}
      {showAddArtistForm && (
        <div className="p-4 border border-gray-200 rounded-lg bg-gray-50">
          <h3 className="font-medium text-gray-900 mb-3">Add New Artist</h3>

          <div className="space-y-3">
            {/* Wikidata Search First */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Search Wikidata First
              </label>
              <p className="text-xs text-gray-500 mb-2">
                Before creating a new entry, search to see if this artist already exists on Wikidata
              </p>
              <div className="relative" ref={searchDropdownRef}>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Type artist name to search Wikidata..."
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                {/* Search Results Dropdown */}
                {showSearchResults && searchTerm.length >= 2 && (
                  <div className="absolute z-20 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-64 overflow-y-auto">
                    {searchLoading && (
                      <div className="p-4 text-gray-500 text-center text-sm">
                        Searching Wikidata...
                      </div>
                    )}

                    {!searchLoading && filteredSearchResults.length > 0 && (
                      <>
                        <div className="px-3 py-2 bg-blue-50 border-b border-blue-200">
                          <span className="text-xs font-medium text-blue-700">
                            Found on Wikidata - Click to Link
                          </span>
                        </div>
                        {filteredSearchResults.map(result => (
                          <div
                            key={result.id}
                            className="p-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100"
                            onMouseDown={(e) => {
                              e.preventDefault();
                              handleSelectExistingArtist(result.id);
                            }}
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <User className="w-4 h-4 text-blue-500" />
                                  <h4 className="font-medium text-gray-900">{result.name}</h4>
                                </div>
                                {result.instruments && result.instruments.length > 0 && (
                                  <p className="text-xs text-gray-600 mt-1">
                                    {result.instruments.join(', ')}
                                  </p>
                                )}
                                <p className="text-xs text-gray-500 mt-1">
                                  Wikidata ID: {result.id}
                                </p>
                              </div>
                              {result.imageUrl && (
                                <img
                                  src={result.imageUrl}
                                  alt={result.name}
                                  className="w-10 h-10 rounded-full object-cover ml-3"
                                />
                              )}
                            </div>
                          </div>
                        ))}
                      </>
                    )}

                    {!searchLoading && filteredSearchResults.length === 0 && (
                      <div className="p-4 text-center">
                        <p className="text-sm text-gray-500 mb-2">
                          No existing artists found on Wikidata
                        </p>
                        <p className="text-xs text-gray-400">
                          Fill in the form below to create a new entry
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Separator */}
            <div className="flex items-center gap-3 my-4">
              <div className="flex-1 border-t border-gray-300"></div>
              <span className="text-xs text-gray-500 font-medium">OR CREATE NEW</span>
              <div className="flex-1 border-t border-gray-300"></div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Artist Name *
              </label>
              <input
                type="text"
                value={newArtistName}
                onChange={(e) => setNewArtistName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="e.g., John Doe"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Legal Name (if different)
              </label>
              <input
                type="text"
                value={newArtistLegalName}
                onChange={(e) => setNewArtistLegalName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="e.g., Jonathan Smith"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Instruments/Role
              </label>
              
              {/* Selected instruments/roles display */}
              {newArtistInstruments.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-2">
                  {newArtistInstruments.map((instrument) => (
                    <div
                      key={instrument}
                      className="flex items-center gap-1 px-2 py-1 bg-blue-100 border border-blue-300 rounded-full text-sm"
                    >
                      <span>{instrument}</span>
                      <button
                        onClick={() => removeInstrumentRole(instrument)}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Dropdown for selecting instruments/roles */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowInstrumentDropdown(!showInstrumentDropdown)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent flex items-center justify-between"
                >
                  <span className="text-gray-500">Select instruments/roles...</span>
                  <ChevronDown className="w-4 h-4" />
                </button>

                {showInstrumentDropdown && (
                  <div className="absolute top-full left-0 right-0 bg-white border border-gray-300 rounded-lg shadow-lg z-10 mt-1 max-h-60 overflow-y-auto">
                    {/* Instruments section */}
                    <div className="px-3 py-2 bg-gray-50 border-b text-xs font-medium text-gray-700">
                      Instruments
                    </div>
                    {COMMON_INSTRUMENTS.map((instrument) => (
                      <button
                        key={instrument.id}
                        type="button"
                        onClick={() => addInstrumentRole(instrument)}
                        className="w-full px-3 py-2 text-left hover:bg-gray-50 border-b border-gray-100"
                        disabled={newArtistInstruments.includes(instrument.name)}
                      >
                        <span className={newArtistInstruments.includes(instrument.name) ? 'text-gray-400' : 'text-gray-900'}>
                          {instrument.name}
                        </span>
                        <span className="text-gray-500 text-xs ml-2">({instrument.id})</span>
                      </button>
                    ))}
                    
                    {/* Roles section */}
                    <div className="px-3 py-2 bg-gray-50 border-b text-xs font-medium text-gray-700">
                      Roles
                    </div>
                    {COMMON_ROLES.map((role) => (
                      <button
                        key={role.id}
                        type="button"
                        onClick={() => addInstrumentRole(role)}
                        className="w-full px-3 py-2 text-left hover:bg-gray-50 border-b border-gray-100"
                        disabled={newArtistInstruments.includes(role.name)}
                      >
                        <span className={newArtistInstruments.includes(role.name) ? 'text-gray-400' : 'text-gray-900'}>
                          {role.name}
                        </span>
                        <span className="text-gray-500 text-xs ml-2">({role.id})</span>
                      </button>
                    ))}
                    
                    {/* Custom instrument input */}
                    <div className="px-3 py-2 border-t border-gray-200">
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={customInstrument}
                          onChange={(e) => setCustomInstrument(e.target.value)}
                          placeholder="Custom instrument/role..."
                          className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              addCustomInstrument();
                            }
                          }}
                        />
                        <button
                          type="button"
                          onClick={addCustomInstrument}
                          disabled={!customInstrument.trim()}
                          className="px-2 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Birth Date
              </label>
              <input
                type="date"
                value={newArtistBirthDate}
                onChange={(e) => setNewArtistBirthDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="e.g., 1990-05-15"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Country of Citizenship
              </label>
              <CountrySelector
                value={newArtistNationality}
                onChange={(country) => setNewArtistNationality(country)}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Gender
              </label>
              <select
                value={newArtistGender}
                onChange={(e) => setNewArtistGender(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Select gender</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="non-binary gender">Non-binary</option>
                <option value="trans man">Trans man</option>
                <option value="trans woman">Trans woman</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isBandMember"
                checked={newArtistIsBandMember}
                onChange={(e) => setNewArtistIsBandMember(e.target.checked)}
                className="rounded border-gray-300"
              />
              <label htmlFor="isBandMember" className="text-sm text-gray-700">
                This person is a band member (not a guest or opening act)
              </label>
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleAddArtist}
                disabled={!newArtistName.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Add Artist
              </button>
              <button
                onClick={() => setShowAddArtistForm(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}