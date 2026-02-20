'use client';

import { useState, useEffect } from 'react';
import { Controller } from 'react-hook-form';
import { ArrowRight } from 'lucide-react';
import { useUniversalForm, useUniversalFormEventDetails } from '@/providers/UniversalFormProvider';
import CountrySelector from '@/components/selectors/CountrySelector';
import EventSelector from '@/components/selectors/EventSelector';
import LocationSelector from '@/components/selectors/LocationSelector';
import { dateToYear, yearInputToDate, isValidYearInput, isValidCompleteYear } from '@/utils/date-utils';


interface EventDetailsFormProps {
  onComplete?: () => void;
}

export default function EventDetailsForm({
  onComplete
}: EventDetailsFormProps) {
  const form = useUniversalForm();
  const { common } = useUniversalFormEventDetails();

  // Local state for year input to allow smooth typing
  const [yearInput, setYearInput] = useState(
    common?.date ? dateToYear(common.date)?.toString() || '' : ''
  );

  // State for selected event from search
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [selectedLocation, setSelectedLocation] = useState<any>(null);

  // Restore selected event from form data on mount (for page reloads)
  useEffect(() => {
    const formEventDetails = form.watch('eventDetails');
    // Only restore if we don't have a selected event AND we have the necessary data
    // This prevents re-creating the event after user explicitly deselects it
    if (!selectedEvent && common?.title && formEventDetails?.commonsCategory) {
      // Reconstruct the selected event from form data
      const restoredEvent = {
        id: formEventDetails.wikidataId || `commons-${formEventDetails.commonsCategory}`,
        name: common.title,
        year: common.date ? new Date(common.date).getFullYear().toString() : undefined,
        location: formEventDetails.location,
        country: formEventDetails.country,
        wikidataId: formEventDetails.wikidataId,
        wikidataUrl: formEventDetails.wikidataId ? `https://www.wikidata.org/wiki/${formEventDetails.wikidataId}` : undefined,
        commonsCategory: formEventDetails.commonsCategory,
        commonsCategoryUrl: `https://commons.wikimedia.org/wiki/Category:${encodeURIComponent(formEventDetails.commonsCategory)}`,
        categoryExists: formEventDetails.categoryExists,
        source: (formEventDetails.wikidataId && formEventDetails.categoryExists) ? 'both' : formEventDetails.wikidataId ? 'wikidata' : 'commons',
        participants: formEventDetails.participants || []
      };
      setSelectedEvent(restoredEvent);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount

  // Store Commons category and Wikidata ID in form
  useEffect(() => {
    if (selectedEvent) {
      if (selectedEvent.commonsCategory) {
        form.setValue('eventDetails.commonsCategory' as any, selectedEvent.commonsCategory, { shouldDirty: false });
      }
      if (selectedEvent.wikidataId) {
        form.setValue('eventDetails.wikidataId' as any, selectedEvent.wikidataId, { shouldDirty: false });
        // Also store that the event entity exists
        form.setValue('eventDetails.eventWikidataId' as any, selectedEvent.wikidataId, { shouldDirty: false });
      }
      if (selectedEvent.categoryExists !== undefined) {
        form.setValue('eventDetails.categoryExists' as any, selectedEvent.categoryExists, { shouldDirty: false });
      }
      if (selectedEvent.participants) {
        form.setValue('eventDetails.participants' as any, selectedEvent.participants, { shouldDirty: false });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedEvent]);

  // Map to old format for compatibility
  const eventDetails = {
    name: common?.title || '',
    year: yearInput || (common?.date ? dateToYear(common.date)?.toString() || '' : ''),
    location: form.watch('eventDetails.custom')?.fields?.location || '',
    country: form.watch('eventDetails.custom')?.fields?.country || ''
  };

  const canComplete = eventDetails.name && eventDetails.year;

  // Note: Form data is now managed by UniversalFormProvider
  // No need to update parent component - data flows through unified form context

  const handleEventSelect = (event: any) => {
    if (!event) {
      setSelectedEvent(null);
      // Clear all event-related fields when deselecting
      form.setValue('eventDetails.title', '');
      form.setValue('eventDetails.date' as any, undefined);
      form.setValue('eventDetails.location' as any, '');
      form.setValue('eventDetails.country' as any, '');
      form.setValue('eventDetails.commonsCategory' as any, undefined, { shouldDirty: false });
      form.setValue('eventDetails.wikidataId' as any, undefined, { shouldDirty: false });
      form.setValue('eventDetails.eventWikidataId' as any, undefined, { shouldDirty: false });
      form.setValue('eventDetails.categoryExists' as any, undefined, { shouldDirty: false });
      form.setValue('eventDetails.participants' as any, [], { shouldDirty: false });
      setYearInput(''); // Also clear the year input state
      return;
    }

    setSelectedEvent(event);

    // Auto-fill form fields from selected event
    if (event.name) {
      form.setValue('eventDetails.title', event.name);
    }

    // Use actual event date if available, otherwise fall back to year
    if (event.date) {
      // Event has specific date from Wikidata (P585 or P580)
      form.setValue('eventDetails.date' as any, event.date);
      const dateObj = new Date(event.date);
      setYearInput(dateObj.getFullYear().toString());

      // Set end date if available (P582)
      if (event.endDate) {
        form.setValue('eventDetails.endDate' as any, event.endDate);
      } else {
        // Single-day event - set end date to same as start
        form.setValue('eventDetails.endDate' as any, event.date);
      }
    } else if (event.year) {
      // Only year available - set to January 1st as placeholder
      setYearInput(event.year);
      const yearDate = yearInputToDate(event.year);
      if (yearDate) {
        form.setValue('eventDetails.date' as any, yearDate);
        form.setValue('eventDetails.endDate' as any, yearDate);
      }
    }

    // Set location and country with QIDs
    form.setValue('eventDetails.location', event.location || '');
    form.setValue('eventDetails.locationQid' as any, event.locationQid || undefined);
    form.setValue('eventDetails.country', event.country || '');
    form.setValue('eventDetails.countryQid' as any, event.countryQid || undefined);

    // Update selected location state for UI
    if (event.location && event.locationQid) {
      setSelectedLocation({
        id: event.locationQid,
        name: event.location,
        country: event.country,
        countryQid: event.countryQid,
        wikidataId: event.locationQid,
        wikidataUrl: `https://www.wikidata.org/wiki/${event.locationQid}`
      });
    } else {
      setSelectedLocation(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Event Search/Lookup */}
      <div>
        <label className="block text-sm font-medium text-card-foreground mb-1">
          Search for Event
        </label>
        <p className="text-xs text-muted-foreground mb-2">
          Search for existing events on Wikidata and Commons, or enter details manually below
        </p>
        <EventSelector
          onEventSelect={handleEventSelect}
          selectedEvent={selectedEvent}
          placeholder="Search for festival or event (e.g., Coachella 2025)..."
          eventType="music-festival"
        />
      </div>

      {/* Separator */}
      <div className="flex items-center gap-3">
        <div className="flex-1 border-t border-gray-300"></div>
        <span className="text-xs text-gray-500 font-medium">
          {selectedEvent ? 'VERIFY OR EDIT DETAILS' : 'OR ENTER MANUALLY'}
        </span>
        <div className="flex-1 border-t border-gray-300"></div>
      </div>

      {/* Event Loaded Indicator */}
      {selectedEvent && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
          <div className="flex items-start gap-2">
            <div className="flex-shrink-0 mt-0.5">
              <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-green-800">
                Event loaded from {selectedEvent.source === 'both' ? 'Wikidata & Commons' : selectedEvent.source === 'wikidata' ? 'Wikidata' : 'Commons'}
              </p>
              <p className="text-xs text-green-700 mt-1">
                {selectedEvent.categoryExists && `Commons category exists with ${selectedEvent.fileCount || 0} files. `}
                {selectedEvent.participants && selectedEvent.participants.length > 0 && `Found ${selectedEvent.participants.length} participants.`}
              </p>
            </div>
          </div>
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-card-foreground mb-1">Event Name *</label>
        <Controller
          name="eventDetails.title"
          control={form.control}
          render={({ field, fieldState }) => (
            <>
              <input
                {...field}
                type="text"
                value={field.value || ''}
                onChange={(e) => {
                  field.onChange(e.target.value);
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

      {/* Date Range */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-card-foreground mb-1">
            Start Date *
          </label>
          <Controller
            name="eventDetails.date"
            control={form.control}
            render={({ field }) => (
              <input
                type="date"
                value={field.value ? (typeof field.value === 'string' ? (field.value as string).split('T')[0] : new Date(field.value as any).toISOString().split('T')[0]) : ''}
                onChange={(e) => {
                  const dateValue = e.target.value;
                  field.onChange(dateValue);

                  // Auto-populate year from date
                  if (dateValue) {
                    const year = dateValue.split('-')[0];
                    setYearInput(year);
                  }

                  // Auto-populate end date if not set
                  const endDate = (form.getValues as any)('eventDetails.endDate');
                  if (!endDate && dateValue) {
                    (form.setValue as any)('eventDetails.endDate', dateValue);
                  }
                }}
                className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary text-card-foreground bg-card"
              />
            )}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-card-foreground mb-1">
            End Date
          </label>
          <Controller
            name={"eventDetails.endDate" as any}
            control={form.control}
            render={({ field }) => (
              <input
                type="date"
                value={field.value ? (typeof field.value === 'string' ? (field.value as string).split('T')[0] : new Date(field.value as any).toISOString().split('T')[0]) : ''}
                onChange={(e) => {
                  field.onChange(e.target.value);
                }}
                className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary text-card-foreground bg-card"
              />
            )}
          />
          <p className="text-xs text-muted-foreground mt-1">
            Leave blank for single-day events
          </p>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-card-foreground mb-1">Location (City/Venue)</label>
        <LocationSelector
          onLocationSelect={(location) => {
            setSelectedLocation(location);
            if (location) {
              form.setValue('eventDetails.location' as any, location.name);
              form.setValue('eventDetails.locationQid' as any, location.wikidataId);
              // Auto-fill country if location has it
              if (location.country && location.countryQid) {
                form.setValue('eventDetails.country' as any, location.country);
                form.setValue('eventDetails.countryQid' as any, location.countryQid);
              }
            } else {
              form.setValue('eventDetails.location' as any, '');
              form.setValue('eventDetails.locationQid' as any, undefined);
            }
          }}
          selectedLocation={selectedLocation}
          placeholder="Search for city or venue (e.g., Bryne, Oslo)..."
          locationType="any"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-card-foreground mb-1">Country</label>
        <Controller
          name="eventDetails.country"
          control={form.control}
          render={({ field }) => (
            <CountrySelector
              value={typeof field.value === 'string' ? field.value : field.value?.labels?.en?.value || ''}
              onChange={(country) => {
                field.onChange(country);
              }}
              placeholder="Select country"
            />
          )}
        />
      </div>

      {/* Note: Photographer attribution is handled globally through localStorage and authentication */}

      {canComplete && (
        <div className="text-center">
          <button
            onClick={onComplete}
            className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium"
          >
            Continue to Next Step
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}