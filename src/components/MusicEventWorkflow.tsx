'use client';

import { useState, useEffect } from 'react';
import { Music, Calendar, MapPin, Users, Mic } from 'lucide-react';
import { MusicEventMetadata, MusicEventType, FestivalMetadata, ConcertMetadata, Festival, Concert } from '../types/music';
import { getLanguageForCountry } from '../utils/country-language-mapping';
import ArtistSelector from './ArtistSelector';
import CountrySelector from './CountrySelector';

interface MusicEventWorkflowProps {
  onMusicEventUpdate: (eventData: MusicEventMetadata) => void;
}

// Helper functions for localStorage
const getStoredAuthor = () => {
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem('wikimedia-author');
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch {
        return { username: '', fullName: '' };
      }
    }
  }
  return { username: '', fullName: '' };
};

const storeAuthor = (username: string, fullName: string) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('wikimedia-author', JSON.stringify({ username, fullName }));
  }
};

export default function MusicEventWorkflow({ onMusicEventUpdate }: MusicEventWorkflowProps) {
  const [eventType, setEventType] = useState<MusicEventType | null>(null);
  const [currentLanguage, setCurrentLanguage] = useState<string>('en');
  const storedAuthor = getStoredAuthor();
  
  const [festivalData, setFestivalData] = useState<FestivalMetadata>({
    festival: {
      id: '',
      name: '',
      year: '',
      location: '',
      country: ''
    },
    selectedBands: [],
    addToWikiPortraitsConcerts: false,
    authorUsername: storedAuthor.username,
    authorFullName: storedAuthor.fullName
  });
  
  const [concertData, setConcertData] = useState<ConcertMetadata>({
    concert: {
      id: '',
      artist: {
        id: '',
        name: ''
      },
      venue: '',
      date: '',
      city: '',
      country: ''
    },
    addToWikiPortraitsConcerts: false,
    authorUsername: storedAuthor.username,
    authorFullName: storedAuthor.fullName
  });

  const [currentStep, setCurrentStep] = useState<'type' | 'details'>('type');

  // Update language when festival country changes
  useEffect(() => {
    if (eventType === 'festival' && festivalData.festival.country) {
      const newLanguage = getLanguageForCountry(festivalData.festival.country);
      setCurrentLanguage(newLanguage);
    }
  }, [eventType, festivalData.festival.country]);

  // Update language when concert country changes
  useEffect(() => {
    if (eventType === 'concert' && concertData.concert.country) {
      const newLanguage = getLanguageForCountry(concertData.concert.country);
      setCurrentLanguage(newLanguage);
    }
  }, [eventType, concertData.concert.country]);

  const handleEventTypeSelect = (type: MusicEventType) => {
    setEventType(type);
    setCurrentStep('details');
    updateEventData(type);
  };

  const updateEventData = (type: MusicEventType = eventType!) => {
    const eventData: MusicEventMetadata = {
      eventType: type,
      ...(type === 'festival' ? { festivalData } : { concertData })
    };
    onMusicEventUpdate(eventData);
  };

  const handleFestivalChange = (field: keyof Festival, value: string) => {
    const updatedFestival = { ...festivalData.festival, [field]: value };
    const updatedData = { ...festivalData, festival: updatedFestival };
    setFestivalData(updatedData);
    
    const eventData: MusicEventMetadata = {
      eventType: 'festival',
      festivalData: updatedData
    };
    onMusicEventUpdate(eventData);
  };

  const handleConcertChange = (field: keyof Concert, value: string) => {
    const updatedConcert = { ...concertData.concert, [field]: value };
    const updatedData = { ...concertData, concert: updatedConcert };
    setConcertData(updatedData);
    
    const eventData: MusicEventMetadata = {
      eventType: 'concert',
      concertData: updatedData
    };
    onMusicEventUpdate(eventData);
  };


  const handleWikiPortraitsToggle = (checked: boolean) => {
    if (eventType === 'festival') {
      const updatedData = { ...festivalData, addToWikiPortraitsConcerts: checked };
      setFestivalData(updatedData);
      onMusicEventUpdate({ eventType: 'festival', festivalData: updatedData });
    } else if (eventType === 'concert') {
      const updatedData = { ...concertData, addToWikiPortraitsConcerts: checked };
      setConcertData(updatedData);
      onMusicEventUpdate({ eventType: 'concert', concertData: updatedData });
    }
  };

  const handleAuthorUsernameChange = (username: string) => {
    if (eventType === 'festival') {
      const updatedData = { ...festivalData, authorUsername: username };
      setFestivalData(updatedData);
      onMusicEventUpdate({ eventType: 'festival', festivalData: updatedData });
      storeAuthor(username, festivalData.authorFullName || '');
    } else if (eventType === 'concert') {
      const updatedData = { ...concertData, authorUsername: username };
      setConcertData(updatedData);
      onMusicEventUpdate({ eventType: 'concert', concertData: updatedData });
      storeAuthor(username, concertData.authorFullName || '');
    }
  };

  const handleAuthorFullNameChange = (fullName: string) => {
    if (eventType === 'festival') {
      const updatedData = { ...festivalData, authorFullName: fullName };
      setFestivalData(updatedData);
      onMusicEventUpdate({ eventType: 'festival', festivalData: updatedData });
      storeAuthor(festivalData.authorUsername || '', fullName);
    } else if (eventType === 'concert') {
      const updatedData = { ...concertData, authorFullName: fullName };
      setConcertData(updatedData);
      onMusicEventUpdate({ eventType: 'concert', concertData: updatedData });
      storeAuthor(concertData.authorUsername || '', fullName);
    }
  };


  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
      <h3 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
        <Music className="w-6 h-6 mr-2 text-purple-600" />
        Music Event Setup
      </h3>

      {/* Step Navigation */}
      <div className="flex mb-8 border-b border-gray-200">
        {[
          { key: 'type', label: 'Event Type', icon: Music },
          { key: 'details', label: 'Event Details', icon: Calendar }
        ].map((step) => {
          const Icon = step.icon;
          const isActive = currentStep === step.key;
          const isCompleted = (step.key === 'type' && eventType) ||
                             (step.key === 'details' && eventType && (
                               (eventType === 'festival' && festivalData.festival.name && festivalData.festival.year && festivalData.selectedBands.length > 0) ||
                               (eventType === 'concert' && concertData.concert.venue && concertData.concert.date && concertData.concert.artist.name)
                             ));
          
          return (
            <button
              key={step.key}
              onClick={() => setCurrentStep(step.key as 'type' | 'details')}
              disabled={!eventType && step.key !== 'type'}
              className={`flex items-center px-4 py-3 border-b-2 transition-colors ${
                isActive
                  ? 'border-purple-500 text-purple-600'
                  : isCompleted
                  ? 'border-purple-300 text-purple-500 hover:text-purple-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 disabled:text-gray-300'
              }`}
            >
              <Icon className="w-4 h-4 mr-2" />
              {step.label}
            </button>
          );
        })}
      </div>

      {/* Event Type Selection */}
      {currentStep === 'type' && (
        <div className="space-y-4">
          <h4 className="text-lg font-medium text-gray-900 mb-4">Select Event Type</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button
              onClick={() => handleEventTypeSelect('festival')}
              className={`p-6 border-2 rounded-lg text-left transition-colors ${
                eventType === 'festival'
                  ? 'border-purple-500 bg-purple-50'
                  : 'border-gray-200 hover:border-purple-300'
              }`}
            >
              <Users className="w-8 h-8 text-purple-600 mb-3" />
              <h5 className="text-lg font-medium text-gray-900 mb-2">Festival</h5>
              <p className="text-sm text-gray-600">
                Multi-band event with festival category and band subcategories
              </p>
            </button>

            <button
              onClick={() => handleEventTypeSelect('concert')}
              className={`p-6 border-2 rounded-lg text-left transition-colors ${
                eventType === 'concert'
                  ? 'border-purple-500 bg-purple-50'
                  : 'border-gray-200 hover:border-purple-300'
              }`}
            >
              <Mic className="w-8 h-8 text-purple-600 mb-3" />
              <h5 className="text-lg font-medium text-gray-900 mb-2">Concert</h5>
              <p className="text-sm text-gray-600">
                Single artist/band performance with direct categorization
              </p>
            </button>
          </div>

          {eventType && (
            <div className="flex justify-end mt-6">
              <button
                onClick={() => setCurrentStep('details')}
                className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700"
              >
                Next: Event Details
              </button>
            </div>
          )}
        </div>
      )}

      {/* Event Details */}
      {currentStep === 'details' && eventType === 'festival' && (
        <div className="space-y-4">
          <h4 className="text-lg font-medium text-gray-900 mb-4">Festival Details</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Festival Name
              </label>
              <input
                type="text"
                value={festivalData.festival.name}
                onChange={(e) => handleFestivalChange('name', e.target.value)}
                placeholder="e.g., Jærnåttå"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Year
              </label>
              <input
                type="text"
                value={festivalData.festival.year}
                onChange={(e) => handleFestivalChange('year', e.target.value)}
                placeholder="e.g., 2025"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <MapPin className="w-4 h-4 inline mr-1" />
                Location
              </label>
              <input
                type="text"
                value={festivalData.festival.location}
                onChange={(e) => handleFestivalChange('location', e.target.value)}
                placeholder="City or venue"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Country
              </label>
              <CountrySelector
                value={festivalData.festival.country}
                onChange={(country) => handleFestivalChange('country', country)}
                placeholder="Type to search countries (e.g., 'nor' for Norway)..."
              />
            </div>
          </div>

          {/* Band Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Band/Artist for this upload session *
            </label>
            <ArtistSelector
              onArtistSelect={(artist) => {
                const newBand = {
                  id: `band-${Date.now()}`,
                  name: artist.name,
                  wikipediaUrl: artist.wikipediaUrl
                };
                const updatedData = { 
                  ...festivalData, 
                  selectedBands: [newBand] // Only one band at a time
                };
                setFestivalData(updatedData);
                onMusicEventUpdate({ eventType: 'festival', festivalData: updatedData });
              }}
              selectedArtist={festivalData.selectedBands[0] || { id: '', name: '' }}
              placeholder="Search for band/artist..."
              label=""
              type="band"
              defaultLanguage={currentLanguage}
              currentLanguage={currentLanguage}
            />
            {festivalData.selectedBands[0] && (
              <p className="text-sm text-gray-600 mt-1">
                Selected: <strong>{festivalData.selectedBands[0].name}</strong>
              </p>
            )}
            {currentLanguage !== 'en' && festivalData.festival.country && (
              <p className="text-xs text-blue-600 mt-1">
                🌐 Search language auto-set to {currentLanguage.toUpperCase()} for {festivalData.festival.country}
              </p>
            )}
          </div>

          {/* Author fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Username (optional)
              </label>
              <input
                type="text"
                value={festivalData.authorUsername || ''}
                onChange={(e) => handleAuthorUsernameChange(e.target.value)}
                placeholder="YourUsername"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Full Name (optional)
              </label>
              <input
                type="text"
                value={festivalData.authorFullName || ''}
                onChange={(e) => handleAuthorFullNameChange(e.target.value)}
                placeholder="Your Full Name"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Will be formatted as [[User:Username|Full Name]] in Commons
          </p>

          <div className="flex items-center space-x-2 mt-4">
            <input
              type="checkbox"
              id="wikiPortraitsFestival"
              checked={festivalData.addToWikiPortraitsConcerts}
              onChange={(e) => handleWikiPortraitsToggle(e.target.checked)}
              className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
            />
            <label htmlFor="wikiPortraitsFestival" className="text-sm text-gray-700">
              Add to &quot;Category:WikiPortraits at Concerts&quot; as subcategory
            </label>
          </div>

          <div className="flex justify-between mt-6">
            <button
              onClick={() => setCurrentStep('type')}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
            >
              Back: Event Type
            </button>
            <button
              onClick={() => {/* Complete setup */}}
              disabled={!festivalData.festival.name || !festivalData.festival.year || !festivalData.selectedBands.length}
              className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              Complete Setup
            </button>
          </div>
        </div>
      )}

      {/* Concert Details */}
      {currentStep === 'details' && eventType === 'concert' && (
        <div className="space-y-4">
          <h4 className="text-lg font-medium text-gray-900 mb-4">Concert Details</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Calendar className="w-4 h-4 inline mr-1" />
                Concert Date
              </label>
              <input
                type="date"
                value={concertData.concert.date}
                onChange={(e) => handleConcertChange('date', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <MapPin className="w-4 h-4 inline mr-1" />
                Venue
              </label>
              <input
                type="text"
                value={concertData.concert.venue}
                onChange={(e) => handleConcertChange('venue', e.target.value)}
                placeholder="Venue name"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                City
              </label>
              <input
                type="text"
                value={concertData.concert.city}
                onChange={(e) => handleConcertChange('city', e.target.value)}
                placeholder="City"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Country
              </label>
              <CountrySelector
                value={concertData.concert.country}
                onChange={(country) => handleConcertChange('country', country)}
                placeholder="Type to search countries (e.g., 'ger' for Germany)..."
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tour (optional)
            </label>
            <input
              type="text"
              value={concertData.concert.tour || ''}
              onChange={(e) => handleConcertChange('tour', e.target.value)}
              placeholder="Tour name"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>

          {/* Artist Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Artist/Band *
            </label>
            <ArtistSelector
              onArtistSelect={(artist) => {
                const updatedArtist = { ...concertData.concert.artist, ...artist };
                const updatedConcert = { ...concertData.concert, artist: updatedArtist };
                const updatedData = { ...concertData, concert: updatedConcert };
                setConcertData(updatedData);
                
                const eventData = { eventType: 'concert' as const, concertData: updatedData };
                onMusicEventUpdate(eventData);
              }}
              selectedArtist={concertData.concert.artist}
              placeholder="Search for artist or band..."
              label=""
              type="artist"
              defaultLanguage={currentLanguage}
              currentLanguage={currentLanguage}
            />
            {currentLanguage !== 'en' && concertData.concert.country && (
              <p className="text-xs text-blue-600 mt-1">
                🌐 Search language auto-set to {currentLanguage.toUpperCase()} for {concertData.concert.country}
              </p>
            )}
          </div>

          {/* Author fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Username (optional)
              </label>
              <input
                type="text"
                value={concertData.authorUsername || ''}
                onChange={(e) => handleAuthorUsernameChange(e.target.value)}
                placeholder="YourUsername"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Full Name (optional)
              </label>
              <input
                type="text"
                value={concertData.authorFullName || ''}
                onChange={(e) => handleAuthorFullNameChange(e.target.value)}
                placeholder="Your Full Name"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Will be formatted as [[User:Username|Full Name]] in Commons
          </p>

          <div className="flex items-center space-x-2 mt-4">
            <input
              type="checkbox"
              id="wikiPortraitsConcert"
              checked={concertData.addToWikiPortraitsConcerts}
              onChange={(e) => handleWikiPortraitsToggle(e.target.checked)}
              className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
            />
            <label htmlFor="wikiPortraitsConcert" className="text-sm text-gray-700">
              Add to &quot;Category:WikiPortraits at Concerts&quot; as subcategory
            </label>
          </div>

          <div className="flex justify-between mt-6">
            <button
              onClick={() => setCurrentStep('type')}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
            >
              Back: Event Type
            </button>
            <button
              onClick={() => {/* Complete setup */}}
              disabled={!concertData.concert.venue || !concertData.concert.date || !concertData.concert.artist.name}
              className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              Complete Setup
            </button>
          </div>
        </div>
      )}

    </div>
  );
}