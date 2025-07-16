'use client';

import { useEffect } from 'react';
import { MusicEventMetadata } from '@/types/music';
import { getItem, KEYS } from '@/utils/localStorage';
import EventDetailsForm from './EventDetailsForm';

interface FestivalDetailsFormProps {
  musicEventData: MusicEventMetadata;
  onMusicEventUpdate: (eventData: MusicEventMetadata) => void;
  onComplete?: () => void;
}

export default function FestivalDetailsForm({ 
  musicEventData, 
  onMusicEventUpdate, 
  onComplete 
}: FestivalDetailsFormProps) {
  // Load stored values when component mounts or when musicEventData changes
  useEffect(() => {
    if (musicEventData?.eventType === 'festival' && onMusicEventUpdate) {
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

      // Author fields are now handled by the photographer wikidata ID

      // Update band if stored values exist and current band is empty
      if (storedBandName && (!musicEventData.festivalData?.selectedBands?.length || !musicEventData.festivalData.selectedBands[0]?.name)) {
        const storedBand = {
          id: storedBandId || `band-${Date.now()}`,
          name: storedBandName,
          wikipediaUrl: storedBandWikipedia || undefined,
          wikidataUrl: storedBandWikidata || undefined,
          musicbrainzId: storedBandMusicbrainz || undefined,
          country: storedBandCountry || undefined,
          entityType: 'group' as const,
          source: 'wikidata' as const
        };
        
        updates.festivalData!.selectedBands = [storedBand];
        needsUpdate = true;
      }

      if (needsUpdate) {
        onMusicEventUpdate(updates as MusicEventMetadata);
      }
    }
  }, [musicEventData, onMusicEventUpdate]);

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-card-foreground mb-4">Festival Details</h3>
      <EventDetailsForm
        onComplete={onComplete}
      />
    </div>
  );
}