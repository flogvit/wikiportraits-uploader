'use client';

import { useState, useEffect } from 'react';
import { Controller } from 'react-hook-form';
import { useUniversalForm, useUniversalFormEventDetails } from '@/providers/UniversalFormProvider';
import CountrySelector from '@/components/selectors/CountrySelector';


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
    common?.date ? new Date(common.date).getFullYear().toString() : ''
  );
  
  // Map to old format for compatibility
  const eventDetails = {
    name: common?.title || '',
    year: yearInput || (common?.date ? new Date(common.date).getFullYear().toString() : ''),
    location: form.watch('eventDetails.custom')?.location || '',
    country: form.watch('eventDetails.custom')?.country || ''
  };
  
  const canComplete = eventDetails.name && eventDetails.year;

  // Note: Form data is now managed by UniversalFormProvider
  // No need to update parent component - data flows through unified form context

  return (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-card-foreground mb-1">Event Name *</label>
        <Controller
          name="eventDetails.common.title"
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
            if (yearStr === '' || /^\d{1,4}$/.test(yearStr)) {
              setYearInput(yearStr);
              
              // Update form when we have a complete, valid year
              if (yearStr.length === 4) {
                const year = parseInt(yearStr);
                if (year > 1800 && year <= new Date().getFullYear() + 10) {
                  form.setValue('eventDetails.common.date', new Date(year, 0, 1));
                  console.log('✅ Set year in form:', year);
                }
              } else if (yearStr === '') {
                form.setValue('eventDetails.common.date', undefined);
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
          name="eventDetails.custom.location"
          control={form.control}
          render={({ field }) => (
            <input
              {...field}
              type="text"
              value={field.value || ''}
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
          name="eventDetails.custom.country"
          control={form.control}
          render={({ field }) => (
            <CountrySelector
              value={field.value || ''}
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
            onClick={() => onComplete?.()}
            className="px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
          >
            Festival Details Complete - Continue to Band & Performers
          </button>
        </div>
      )}
    </div>
  );
}