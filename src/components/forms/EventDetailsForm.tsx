'use client';

import { Controller, useFormContext } from 'react-hook-form';
import { setItem, KEYS } from '@/utils/localStorage';
import { WorkflowFormData } from '../workflow/providers/WorkflowFormProvider';
import CountrySelector from '@/components/selectors/CountrySelector';
import ArtistSelector from '@/components/selectors/ArtistSelector';
import BandMemberSelector from '@/components/selectors/BandMemberSelector';
import { PendingWikidataEntity } from '@/types/music';


interface EventDetailsFormProps {
  onComplete?: () => void;
}

export default function EventDetailsForm({ 
  onComplete 
}: EventDetailsFormProps) {
  const { control, watch, setValue } = useFormContext<WorkflowFormData>();

  const eventDetails = watch('eventDetails');
  const pendingWikidataEntities = watch('pendingWikidataEntities') || [];
  const canComplete = eventDetails.festivalName && 
                     eventDetails.year && 
                     eventDetails.selectedBand?.name;

  // Handle adding pending Wikidata entities
  const handlePendingMemberAdd = (member: PendingWikidataEntity) => {
    const updatedEntities = [...pendingWikidataEntities, member];
    setValue('pendingWikidataEntities', updatedEntities);
  };

  // Handle syncing pending members from localStorage to form state
  const handlePendingMembersSync = (members: PendingWikidataEntity[]) => {
    const updatedEntities = [...pendingWikidataEntities, ...members];
    setValue('pendingWikidataEntities', updatedEntities);
  };

  // Note: Form data is now managed by WorkflowFormProvider
  // No need to update parent component - data flows through unified form context

  return (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-card-foreground mb-1">Festival Name *</label>
        <Controller
          name="eventDetails.festivalName"
          control={control}
          render={({ field, fieldState }) => (
            <>
              <input
                {...field}
                type="text"
                value={field.value || ''}
                onChange={(e) => {
                  field.onChange(e.target.value);
                  setItem(KEYS.FESTIVAL_NAME, e.target.value);
                }}
                placeholder="e.g., Coachella"
                className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary text-card-foreground bg-card"
              />
              {fieldState.error && (
                <p className="text-sm text-red-500 mt-1">{fieldState.error.message}</p>
              )}
            </>
          )}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-card-foreground mb-1">Year *</label>
        <Controller
          name="eventDetails.year"
          control={control}
          render={({ field, fieldState }) => (
            <>
              <input
                {...field}
                type="text"
                value={field.value || ''}
                onChange={(e) => {
                  field.onChange(e.target.value);
                  setItem(KEYS.FESTIVAL_YEAR, e.target.value);
                }}
                placeholder="2025"
                className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary text-card-foreground bg-card"
              />
              {fieldState.error && (
                <p className="text-sm text-red-500 mt-1">{fieldState.error.message}</p>
              )}
            </>
          )}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-card-foreground mb-1">Location</label>
        <Controller
          name="eventDetails.location"
          control={control}
          render={({ field }) => (
            <input
              {...field}
              type="text"
              value={field.value || ''}
              onChange={(e) => {
                field.onChange(e.target.value);
                setItem(KEYS.FESTIVAL_LOCATION, e.target.value);
              }}
              placeholder="City, State/Province"
              className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary text-card-foreground bg-card"
            />
          )}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-card-foreground mb-1">Country</label>
        <Controller
          name="eventDetails.country"
          control={control}
          render={({ field }) => (
            <CountrySelector
              value={field.value || ''}
              onChange={(country) => {
                field.onChange(country);
                setItem(KEYS.FESTIVAL_COUNTRY, country);
              }}
              placeholder="Select country"
            />
          )}
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
            
            setValue('eventDetails.selectedBand', newBand);
          }}
          selectedArtist={eventDetails.selectedBand ? {
            id: eventDetails.selectedBand.id || 'empty',
            name: eventDetails.selectedBand.name || ''
          } : { id: 'empty', name: '' }}
          placeholder="Search for band/artist..."
          label=""
          type="band"
        />
        {eventDetails.selectedBand?.name && (
          <p className="text-sm text-muted-foreground mt-1">
            Selected: <strong>{eventDetails.selectedBand.name}</strong>
          </p>
        )}
      </div>

      {/* Artists Section */}
      {eventDetails.selectedBand?.name && (
        <div>
          <label className="block text-sm font-medium text-card-foreground mb-1">
            Artists & Performers
          </label>
          <p className="text-sm text-muted-foreground mb-3">
            Search for and select artists, band members, and performers who will be featured in your images. This includes band members, guest artists, and opening acts.
          </p>
          <Controller
            name="eventDetails.selectedBandMembers"
            control={control}
            render={({ field }) => (
              <BandMemberSelector
                bandName={eventDetails.selectedBand?.name}
                bandId={eventDetails.selectedBand?.wikidataUrl?.split('/').pop()}
                selectedMembers={field.value || []}
                onMembersChange={field.onChange}
                onPendingMemberAdd={handlePendingMemberAdd}
                onPendingMembersSync={handlePendingMembersSync}
                pendingMembers={pendingWikidataEntities}
                placeholder="Search for artists, band members, and performers..."
              />
            )}
          />
        </div>
      )}

      {/* Photographer info is now automatically populated from authenticated user's Q-ID */}
      <div className="p-4 bg-muted/50 rounded-lg border border-border">
        <p className="text-sm text-muted-foreground">
          <strong>Photographer:</strong> Images will be automatically attributed to your authenticated photographer profile.
        </p>
      </div>

      <div className="flex items-center space-x-2">
        <Controller
          name="eventDetails.addToWikiPortraitsConcerts"
          control={control}
          render={({ field }) => (
            <input
              {...field}
              type="checkbox"
              id="wikiPortraitsFestival"
              checked={field.value}
              onChange={(e) => field.onChange(e.target.checked)}
              className="rounded border-border text-primary focus:ring-primary"
              value={undefined}
            />
          )}
        />
        <label htmlFor="wikiPortraitsFestival" className="text-sm text-muted-foreground">
          Add to &quot;Category:WikiPortraits at Concerts&quot; as subcategory
        </label>
      </div>

      {canComplete && (
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
  );
}