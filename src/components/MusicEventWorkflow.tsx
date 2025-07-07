'use client';

import { useState } from 'react';
import { Music, Calendar, MapPin, Users, Mic } from 'lucide-react';
import { MusicEventMetadata, MusicEventType, FestivalMetadata, ConcertMetadata, Festival, Concert, Band, MusicArtist } from '../types/music';
import ArtistSelector from './ArtistSelector';

interface MusicEventWorkflowProps {
  onMusicEventUpdate: (eventData: MusicEventMetadata) => void;
}

export default function MusicEventWorkflow({ onMusicEventUpdate }: MusicEventWorkflowProps) {
  const [eventType, setEventType] = useState<MusicEventType | null>(null);
  const [festivalData, setFestivalData] = useState<FestivalMetadata>({
    festival: {
      id: '',
      name: '',
      year: '',
      location: '',
      country: ''
    },
    selectedBands: [],
    addToWikiPortraitsConcerts: false
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
    addToWikiPortraitsConcerts: false
  });

  const [currentStep, setCurrentStep] = useState<'type' | 'details' | 'artists'>('type');

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

  const handleArtistChange = (field: keyof MusicArtist, value: string) => {
    const updatedArtist = { ...concertData.concert.artist, [field]: value };
    const updatedConcert = { ...concertData.concert, artist: updatedArtist };
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

  const addBandToFestival = () => {
    const newBand: Band = {
      id: `band-${Date.now()}`,
      name: '',
      genre: '',
      country: ''
    };
    const updatedBands = [...festivalData.selectedBands, newBand];
    const updatedData = { ...festivalData, selectedBands: updatedBands };
    setFestivalData(updatedData);
    onMusicEventUpdate({ eventType: 'festival', festivalData: updatedData });
  };

  const removeBandFromFestival = (bandId: string) => {
    const updatedBands = festivalData.selectedBands.filter(band => band.id !== bandId);
    const updatedData = { ...festivalData, selectedBands: updatedBands };
    setFestivalData(updatedData);
    onMusicEventUpdate({ eventType: 'festival', festivalData: updatedData });
  };

  const updateBand = (bandId: string, field: keyof Band, value: string) => {
    const updatedBands = festivalData.selectedBands.map(band =>
      band.id === bandId ? { ...band, [field]: value } : band
    );
    const updatedData = { ...festivalData, selectedBands: updatedBands };
    setFestivalData(updatedData);
    onMusicEventUpdate({ eventType: 'festival', festivalData: updatedData });
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
          { key: 'details', label: 'Event Details', icon: Calendar },
          { key: 'artists', label: eventType === 'festival' ? 'Bands' : 'Artist', icon: eventType === 'festival' ? Users : Mic }
        ].map((step) => {
          const Icon = step.icon;
          const isActive = currentStep === step.key;
          const isCompleted = (step.key === 'type' && eventType) ||
                             (step.key === 'details' && eventType && (
                               (eventType === 'festival' && festivalData.festival.name && festivalData.festival.year) ||
                               (eventType === 'concert' && concertData.concert.venue && concertData.concert.date)
                             )) ||
                             (step.key === 'artists' && (
                               (eventType === 'festival' && festivalData.selectedBands.length > 0) ||
                               (eventType === 'concert' && concertData.concert.artist.name)
                             ));
          
          return (
            <button
              key={step.key}
              onClick={() => setCurrentStep(step.key as 'type' | 'details' | 'artists')}
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
              <input
                type="text"
                value={festivalData.festival.country}
                onChange={(e) => handleFestivalChange('country', e.target.value)}
                placeholder="Country"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
          </div>

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
              onClick={() => setCurrentStep('artists')}
              disabled={!festivalData.festival.name || !festivalData.festival.year}
              className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              Next: Select Bands
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
              <input
                type="text"
                value={concertData.concert.country}
                onChange={(e) => handleConcertChange('country', e.target.value)}
                placeholder="Country"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
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
              onClick={() => setCurrentStep('artists')}
              disabled={!concertData.concert.venue || !concertData.concert.date}
              className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              Next: Artist Details
            </button>
          </div>
        </div>
      )}

      {/* Festival Bands */}
      {currentStep === 'artists' && eventType === 'festival' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h4 className="text-lg font-medium text-gray-900">Festival Bands</h4>
            <button
              onClick={addBandToFestival}
              className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700"
            >
              Add Band
            </button>
          </div>

          {festivalData.selectedBands.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No bands added yet. Click &quot;Add Band&quot; to get started.</p>
          ) : (
            <div className="space-y-4">
              {festivalData.selectedBands.map((band) => (
                <div key={band.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="space-y-4">
                    <ArtistSelector
                      onArtistSelect={(artist) => {
                        updateBand(band.id, 'name', artist.name);
                        updateBand(band.id, 'id', artist.id);
                        if (artist.wikipediaUrl) {
                          updateBand(band.id, 'wikipediaUrl', artist.wikipediaUrl);
                        }
                      }}
                      selectedArtist={band}
                      placeholder="Search for band..."
                      label="Band Name"
                      type="band"
                      defaultLanguage={festivalData.festival.country?.toLowerCase() === 'norway' ? 'no' : 'en'}
                    />
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Genre</label>
                        <input
                          type="text"
                          value={band.genre || ''}
                          onChange={(e) => updateBand(band.id, 'genre', e.target.value)}
                          placeholder="Music genre"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
                        <input
                          type="text"
                          value={band.country || ''}
                          onChange={(e) => updateBand(band.id, 'country', e.target.value)}
                          placeholder="Country of origin"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                        />
                      </div>
                    </div>
                    
                    <div className="flex justify-end">
                      <button
                        onClick={() => removeBandFromFestival(band.id)}
                        className="px-3 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                      >
                        Remove Band
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="flex justify-between mt-6">
            <button
              onClick={() => setCurrentStep('details')}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
            >
              Back: Festival Details
            </button>
            <button
              onClick={() => {/* Complete setup */}}
              className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700"
            >
              Complete Setup
            </button>
          </div>
        </div>
      )}

      {/* Concert Artist */}
      {currentStep === 'artists' && eventType === 'concert' && (
        <div className="space-y-4">
          <h4 className="text-lg font-medium text-gray-900 mb-4">Artist Details</h4>
          
          <ArtistSelector
            onArtistSelect={(artist) => {
              const updatedArtist = { ...concertData.concert.artist, ...artist };
              const updatedConcert = { ...concertData.concert, artist: updatedArtist };
              const updatedData = { ...concertData, concert: updatedConcert };
              setConcertData(updatedData);
              
              const eventData: MusicEventMetadata = {
                eventType: 'concert',
                concertData: updatedData
              };
              onMusicEventUpdate(eventData);
            }}
            selectedArtist={concertData.concert.artist}
            placeholder="Search for artist or band..."
            label="Artist/Band Name"
            type="artist"
            defaultLanguage={concertData.concert.country?.toLowerCase() === 'norway' ? 'no' : 'en'}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Genre
              </label>
              <input
                type="text"
                value={concertData.concert.artist.genre || ''}
                onChange={(e) => handleArtistChange('genre', e.target.value)}
                placeholder="Music genre"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Artist Country
              </label>
              <input
                type="text"
                value={concertData.concert.artist.country || ''}
                onChange={(e) => handleArtistChange('country', e.target.value)}
                placeholder="Country of origin"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
          </div>

          <div className="flex justify-between mt-6">
            <button
              onClick={() => setCurrentStep('details')}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
            >
              Back: Concert Details
            </button>
            <button
              onClick={() => {/* Complete setup */}}
              className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700"
            >
              Complete Setup
            </button>
          </div>
        </div>
      )}
    </div>
  );
}