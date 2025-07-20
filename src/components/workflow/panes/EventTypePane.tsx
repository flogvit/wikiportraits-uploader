'use client';

import { Settings, Users, Mic } from 'lucide-react';
import { useUniversalForm } from '@/providers/UniversalFormProvider';
import { MusicEventType, needsEventTypeSelection, getEventTypesForWorkflow } from '@/types/event-types';

interface EventTypePaneProps {
  onComplete?: () => void;
}

export default function EventTypePane({
  onComplete
}: EventTypePaneProps) {
  const { watch, setValue } = useUniversalForm();
  const workflowType = watch('workflowType');
  const eventDetails = watch('eventDetails');
  
  // Only show event type selection for workflows that need it
  if (!needsEventTypeSelection(workflowType)) {
    // Auto-complete for workflows that don't need selection
    onComplete?.();
    return null;
  }
  
  const handleEventTypeSelect = (type: MusicEventType) => {
    // Simply store the event type in the unified structure
    setValue('eventDetails', {
      ...eventDetails,
      type: type
    });
    onComplete?.();
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <Settings className="w-12 h-12 text-primary mx-auto mb-4" />
        <h2 className="text-2xl font-semibold text-card-foreground mb-2">Event Type</h2>
        <p className="text-muted-foreground">
          Choose whether this is a festival or concert for proper categorization
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl mx-auto">
        <button
          onClick={() => handleEventTypeSelect('festival')}
          className={`p-6 border-2 rounded-lg text-left transition-all duration-200 ${
            eventDetails?.type === 'festival'
              ? 'border-primary bg-primary/10 shadow-md'
              : 'border-border hover:border-primary/50 hover:bg-primary/5'
          }`}
        >
          <Users className="w-12 h-12 text-primary mb-4" />
          <h3 className="text-xl font-semibold text-card-foreground mb-2">Festival</h3>
          <p className="text-muted-foreground text-sm">
            Multi-band event with festival category and band subcategories
          </p>
          <ul className="mt-3 text-xs text-muted-foreground space-y-1">
            <li>• Multiple artists/bands</li>
            <li>• Festival-specific categories</li>
            <li>• Event location categorization</li>
          </ul>
        </button>

        <button
          onClick={() => handleEventTypeSelect('concert')}
          className={`p-6 border-2 rounded-lg text-left transition-all duration-200 ${
            eventDetails?.type === 'concert'
              ? 'border-primary bg-primary/10 shadow-md'
              : 'border-border hover:border-primary/50 hover:bg-primary/5'
          }`}
        >
          <Mic className="w-12 h-12 text-primary mb-4" />
          <h3 className="text-xl font-semibold text-card-foreground mb-2">Concert</h3>
          <p className="text-muted-foreground text-sm">
            Single artist/band performance with direct categorization
          </p>
          <ul className="mt-3 text-xs text-muted-foreground space-y-1">
            <li>• Single artist/band focus</li>
            <li>• Venue-specific categories</li>
            <li>• Tour-based organization</li>
          </ul>
        </button>
      </div>

      {eventDetails?.type && (
        <div className="text-center">
          <div className="inline-flex items-center px-4 py-2 bg-success/10 border border-success/20 rounded-lg">
            <span className="text-sm text-success">
              ✓ Selected: {eventDetails.type.charAt(0).toUpperCase() + eventDetails.type.slice(1)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}