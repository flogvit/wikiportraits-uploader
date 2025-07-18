'use client';

import { Controller, useFormContext } from 'react-hook-form';
import { WorkflowFormData } from '../workflow/providers/WorkflowFormProvider';
import CountrySelector from '@/components/selectors/CountrySelector';


interface EventDetailsFormProps {
  onComplete?: () => void;
}

export default function EventDetailsForm({ 
  onComplete 
}: EventDetailsFormProps) {
  const { control, watch } = useFormContext<WorkflowFormData>();

  const eventDetails = watch('eventDetails');
  const canComplete = eventDetails.name && 
                     eventDetails.year;

  // Note: Form data is now managed by WorkflowFormProvider
  // No need to update parent component - data flows through unified form context

  return (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-card-foreground mb-1">Event Name *</label>
        <Controller
          name="eventDetails.name"
          control={control}
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