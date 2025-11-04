'use client';

import { useState, useEffect } from 'react';
import { Controller } from 'react-hook-form';
import { ArrowRight } from 'lucide-react';
import { useUniversalForm, useUniversalFormEventDetails } from '@/providers/UniversalFormProvider';
import CountrySelector from '@/components/selectors/CountrySelector';
import EventSelector from '@/components/selectors/EventSelector';
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

  // Store Commons category and Wikidata ID in form
  useEffect(() => {
    if (selectedEvent) {
      if (selectedEvent.commonsCategory) {
        form.setValue('eventDetails.commonsCategory' as any, selectedEvent.commonsCategory);
      }
      if (selectedEvent.wikidataId) {
        form.setValue('eventDetails.wikidataId' as any, selectedEvent.wikidataId);
      }
      if (selectedEvent.categoryExists !== undefined) {
        form.setValue('eventDetails.categoryExists' as any, selectedEvent.categoryExists);
      }
    }
  }, [selectedEvent, form]);

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
      return;
    }

    setSelectedEvent(event);

    // Auto-fill form fields from selected event
    if (event.name) {
      form.setValue('eventDetails.title', event.name);
    }
    if (event.year) {
      setYearInput(event.year);
      const yearDate = yearInputToDate(event.year);
      if (yearDate) {
        form.setValue('eventDetails.date' as any, yearDate);
      }
    }
    if (event.location) {
      form.setValue('eventDetails.location', event.location);
    }
    if (event.country) {
      form.setValue('eventDetails.country', event.country);
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

      <div>
        <label className="block text-sm font-medium text-card-foreground mb-1">Year *</label>
        <input
          type="text"
          value={yearInput}
          onChange={(e) => {
            const yearStr = e.target.value;
            console.log('🔍 Year input changed:', yearStr);
            
            // Allow typing any numeric input up to 4 digits
            if (isValidYearInput(yearStr)) {
              setYearInput(yearStr);
              
              // Update form when we have a complete, valid year
              if (yearStr.length === 4) {
                if (isValidCompleteYear(yearStr)) {
                  const yearDate = yearInputToDate(yearStr);
                  if (yearDate) {
                    form.setValue('eventDetails.date' as any, yearDate);
                    console.log('✅ Set year in form:', yearStr);
                  }
                }
              } else if (yearStr === '') {
                form.setValue('eventDetails.date' as any, undefined);
              }
            }
          }}
          placeholder="2025"
          maxLength={4}
          className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary text-card-foreground bg-card"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-card-foreground mb-1">Location</label>
        <Controller
          name="eventDetails.location"
          control={form.control}
          render={({ field }) => (
            <input
              {...field}
              type="text"
              value={typeof field.value === 'string' ? field.value : field.value?.labels?.en?.value || ''}
              onChange={(e) => {
                field.onChange(e.target.value);
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