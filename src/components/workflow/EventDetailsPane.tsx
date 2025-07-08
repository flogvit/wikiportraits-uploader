'use client';

import { useEffect } from 'react';
import { Calendar } from 'lucide-react';
import { SoccerMatchMetadata, SoccerPlayer } from '@/components/SoccerMatchWorkflow';
import { MusicEventMetadata } from '@/types/music';
import { getItem, setItem, KEYS } from '@/utils/localStorage';
import { UploadType } from '@/components/UploadTypeSelector';
import SoccerMatchWorkflow from '@/components/SoccerMatchWorkflow';
import CountrySelector from '@/components/CountrySelector';
import ArtistSelector from '@/components/ArtistSelector';

interface EventDetailsPaneProps {
  uploadType: UploadType;
  soccerMatchData?: SoccerMatchMetadata | null;
  selectedPlayers?: SoccerPlayer[];
  musicEventData?: MusicEventMetadata | null;
  onSoccerDataUpdate?: (matchData: SoccerMatchMetadata, players: SoccerPlayer[]) => void;
  onMusicEventUpdate?: (eventData: MusicEventMetadata) => void;
  onComplete?: () => void;
}

export default function EventDetailsPane({
  uploadType,
  soccerMatchData,
  selectedPlayers = [],
  musicEventData,
  onSoccerDataUpdate,
  onMusicEventUpdate,
  onComplete
}: EventDetailsPaneProps) {
  // Load stored values when component mounts or when musicEventData changes
  useEffect(() => {
    if (uploadType === 'music' && musicEventData?.eventType === 'festival' && onMusicEventUpdate) {
      const storedUsername = getItem(KEYS.AUTHOR_USERNAME);
      const storedFullName = getItem(KEYS.AUTHOR_FULLNAME);
      const storedFestivalName = getItem(KEYS.FESTIVAL_NAME);
      const storedFestivalYear = getItem(KEYS.FESTIVAL_YEAR);
      const storedFestivalLocation = getItem(KEYS.FESTIVAL_LOCATION);
      const storedFestivalCountry = getItem(KEYS.FESTIVAL_COUNTRY);
      const storedBandId = getItem(KEYS.FESTIVAL_BAND_ID);
      const storedBandName = getItem(KEYS.FESTIVAL_BAND_NAME);
      const storedBandWikipedia = getItem(KEYS.FESTIVAL_BAND_WIKIPEDIA);
      const storedBandWikidata = getItem(KEYS.FESTIVAL_BAND_WIKIDATA);
      const storedBandMusicbrainz = getItem(KEYS.FESTIVAL_BAND_MUSICBRAINZ);
      const storedBandCountry = getItem(KEYS.FESTIVAL_BAND_COUNTRY);

      let needsUpdate = false;
      const updates: Partial<MusicEventMetadata> = { ...musicEventData };

      // Initialize festivalData if it doesn't exist
      if (!updates.festivalData) {
        updates.festivalData = { ...musicEventData.festivalData! };
        needsUpdate = true;
      }

      // Update festival basic details if stored values exist and current values are empty
      const currentFestival = musicEventData.festivalData?.festival;
      if (storedFestivalName && !currentFestival?.name) {
        updates.festivalData!.festival = {
          ...updates.festivalData!.festival,
          name: storedFestivalName
        };
        needsUpdate = true;
      }
      if (storedFestivalYear && !currentFestival?.year) {
        updates.festivalData!.festival = {
          ...updates.festivalData!.festival,
          year: storedFestivalYear
        };
        needsUpdate = true;
      }
      if (storedFestivalLocation && !currentFestival?.location) {
        updates.festivalData!.festival = {
          ...updates.festivalData!.festival,
          location: storedFestivalLocation
        };
        needsUpdate = true;
      }
      if (storedFestivalCountry && !currentFestival?.country) {
        updates.festivalData!.festival = {
          ...updates.festivalData!.festival,
          country: storedFestivalCountry
        };
        needsUpdate = true;
      }

      // Update author fields if stored values exist and current values are empty
      if ((storedUsername || storedFullName) && (!musicEventData.festivalData?.authorUsername && !musicEventData.festivalData?.authorFullName)) {
        updates.festivalData!.authorUsername = storedUsername;
        updates.festivalData!.authorFullName = storedFullName;
        needsUpdate = true;
      }

      // Update band if stored values exist and current band is empty
      if (storedBandName && (!musicEventData.festivalData?.selectedBands?.length || !musicEventData.festivalData.selectedBands[0]?.name)) {
        const storedBand = {
          id: storedBandId || `band-${Date.now()}`,
          name: storedBandName,
          wikipediaUrl: storedBandWikipedia || undefined,
          wikidataUrl: storedBandWikidata || undefined,
          musicbrainzId: storedBandMusicbrainz || undefined,
          country: storedBandCountry || undefined,
          entityType: undefined,
          source: undefined
        };

        updates.festivalData!.selectedBands = [storedBand];
        needsUpdate = true;
      }

      if (needsUpdate) {
        onMusicEventUpdate(updates as MusicEventMetadata);
      }
    }
  }, [uploadType, musicEventData?.eventType, onMusicEventUpdate]);

  if (!onMusicEventUpdate || !musicEventData) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <Calendar className="w-12 h-12 text-primary mx-auto mb-4" />
        <h2 className="text-2xl font-semibold text-card-foreground mb-2">Event Details</h2>
        <p className="text-muted-foreground">
          Configure your {uploadType} event details for proper categorization
        </p>
      </div>

      {uploadType === 'soccer' && onSoccerDataUpdate ? (
        <SoccerMatchWorkflow
          onSoccerDataUpdate={onSoccerDataUpdate}
          soccerMatchData={soccerMatchData}
          selectedPlayers={selectedPlayers}
        />
      ) : uploadType === 'music' ? (
        <div className="bg-card rounded-lg shadow-sm border border-border p-6">
          {!musicEventData.eventType ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Please select an event type first.</p>
            </div>
          ) : musicEventData.eventType === 'festival' ? (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-card-foreground mb-4">Festival Details</h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-card-foreground mb-1">Festival Name</label>
                  <input
                    type="text"
                    value={musicEventData.festivalData?.festival.name || ''}
                    onChange={(e) => {
                      setItem(KEYS.FESTIVAL_NAME, e.target.value);
                      onMusicEventUpdate({
                        ...musicEventData,
                        festivalData: {
                          ...musicEventData.festivalData!,
                          festival: { ...musicEventData.festivalData!.festival, name: e.target.value }
                        }
                      });
                    }}
                    placeholder="e.g., Coachella"
                    className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary text-card-foreground bg-card"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-card-foreground mb-1">Year</label>
                  <input
                    type="text"
                    value={musicEventData.festivalData?.festival.year || ''}
                    onChange={(e) => {
                      setItem(KEYS.FESTIVAL_YEAR, e.target.value);
                      onMusicEventUpdate({
                        ...musicEventData,
                        festivalData: {
                          ...musicEventData.festivalData!,
                          festival: { ...musicEventData.festivalData!.festival, year: e.target.value }
                        }
                      });
                    }}
                    placeholder="2025"
                    className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary text-card-foreground bg-card"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-card-foreground mb-1">Location</label>
                <input
                  type="text"
                  value={musicEventData.festivalData?.festival.location || ''}
                  onChange={(e) => {
                    setItem(KEYS.FESTIVAL_LOCATION, e.target.value);
                    onMusicEventUpdate({
                      ...musicEventData,
                      festivalData: {
                        ...musicEventData.festivalData!,
                        festival: { ...musicEventData.festivalData!.festival, location: e.target.value }
                      }
                    });
                  }}
                  placeholder="City, State/Province"
                  className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary text-card-foreground bg-card"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-card-foreground mb-1">Country</label>
                <CountrySelector
                  value={musicEventData.festivalData?.festival.country || ''}
                  onChange={(country) => {
                    setItem(KEYS.FESTIVAL_COUNTRY, country);
                    onMusicEventUpdate({
                      ...musicEventData,
                      festivalData: {
                        ...musicEventData.festivalData!,
                        festival: { ...musicEventData.festivalData!.festival, country }
                      }
                    });
                  }}
                  placeholder="Select country"
                />
              </div>

              {/* Artist Selection for Festival */}
              <div>
                <label className="block text-sm font-medium text-card-foreground mb-1">
                  Band/Artist for this upload session *
                </label>
                <ArtistSelector
                  onArtistSelect={(artist) => {
                    const newBand = {
                      id: artist.id || `band-${Date.now()}`,
                      name: artist.name,
                      wikipediaUrl: artist.wikipediaUrl,
                      wikidataUrl: artist.wikidataUrl,
                      musicbrainzId: artist.musicbrainzId,
                      country: artist.country,
                      entityType: artist.entityType,
                      source: artist.source
                    };
                    
                    // Store band data in localStorage
                    setItem(KEYS.FESTIVAL_BAND_ID, newBand.id);
                    setItem(KEYS.FESTIVAL_BAND_NAME, newBand.name);
                    setItem(KEYS.FESTIVAL_BAND_WIKIPEDIA, newBand.wikipediaUrl || '');
                    setItem(KEYS.FESTIVAL_BAND_WIKIDATA, newBand.wikidataUrl || '');
                    setItem(KEYS.FESTIVAL_BAND_MUSICBRAINZ, newBand.musicbrainzId || '');
                    setItem(KEYS.FESTIVAL_BAND_COUNTRY, newBand.country || '');
                    
                    onMusicEventUpdate({
                      ...musicEventData,
                      festivalData: {
                        ...musicEventData.festivalData!,
                        selectedBands: [newBand] // Only one band at a time
                      }
                    });
                  }}
                  selectedArtist={musicEventData.festivalData?.selectedBands?.[0] || { id: '', name: '' }}
                  placeholder="Search for band/artist..."
                  label=""
                  type="band"
                  defaultLanguage={musicEventData.festivalData?.festival.country ? 'auto' : 'en'}
                  currentLanguage={musicEventData.festivalData?.festival.country ? 'auto' : 'en'}
                />
                {musicEventData.festivalData?.selectedBands?.[0] && (
                  <p className="text-sm text-muted-foreground mt-1">
                    Selected: <strong>{musicEventData.festivalData.selectedBands[0].name}</strong>
                  </p>
                )}
              </div>

              {/* Author fields for Festival */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-card-foreground mb-1">
                    Username (optional)
                  </label>
                  <input
                    type="text"
                    value={musicEventData.festivalData?.authorUsername || ''}
                    onChange={(e) => {
                      setItem(KEYS.AUTHOR_USERNAME, e.target.value);
                      onMusicEventUpdate({
                        ...musicEventData,
                        festivalData: {
                          ...musicEventData.festivalData!,
                          authorUsername: e.target.value
                        }
                      });
                    }}
                    placeholder="YourUsername"
                    className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary text-card-foreground bg-card"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-card-foreground mb-1">
                    Full Name (optional)
                  </label>
                  <input
                    type="text"
                    value={musicEventData.festivalData?.authorFullName || ''}
                    onChange={(e) => {
                      setItem(KEYS.AUTHOR_FULLNAME, e.target.value);
                      onMusicEventUpdate({
                        ...musicEventData,
                        festivalData: {
                          ...musicEventData.festivalData!,
                          authorFullName: e.target.value
                        }
                      });
                    }}
                    placeholder="Your Full Name"
                    className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary text-card-foreground bg-card"
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Will be formatted as [[User:Username|Full Name]] in Commons
              </p>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="wikiPortraitsFestival"
                  checked={musicEventData.festivalData?.addToWikiPortraitsConcerts || false}
                  onChange={(e) => onMusicEventUpdate({
                    ...musicEventData,
                    festivalData: {
                      ...musicEventData.festivalData!,
                      addToWikiPortraitsConcerts: e.target.checked
                    }
                  })}
                  className="rounded border-border text-primary focus:ring-primary"
                />
                <label htmlFor="wikiPortraitsFestival" className="text-sm text-muted-foreground">
                  Add to "Category:WikiPortraits at Concerts" as subcategory
                </label>
              </div>

              {musicEventData.festivalData?.festival.name && 
               musicEventData.festivalData.festival.year && 
               musicEventData.festivalData.selectedBands?.length > 0 && (
                <div className="text-center">
                  <button
                    onClick={() => onComplete?.()}
                    className="px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                  >
                    Festival Details Complete - Continue to Categories
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-card-foreground mb-4">Concert Details</h3>
              {/* Concert form would go here - similar structure to festival */}
              <p className="text-muted-foreground">Concert form implementation needed...</p>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}