'use client';

import { Calendar } from 'lucide-react';
import { useUniversalForm } from '@/providers/UniversalFormProvider';
import EventDetailsForm from '../../forms/EventDetailsForm';

interface EventDetailsPaneProps {
  onComplete?: () => void;
}

export default function EventDetailsPane({
  onComplete
}: EventDetailsPaneProps) {
  const { watch } = useUniversalForm();
  const workflowType = watch('workflowType');
  const uploadType = workflowType === 'music-event' ? 'music' : 'general';
  return (
    <div className="space-y-6">
      <div className="text-center">
        <Calendar className="w-12 h-12 mx-auto mb-4 text-primary" />
        <h2 className="text-2xl font-bold text-card-foreground mb-2">Event Details</h2>
        <p className="text-muted-foreground">
          Configure the details of your event for better organization
        </p>
      </div>

      {uploadType === 'music' ? (
        <EventDetailsForm onComplete={onComplete} />
      ) : null}
    </div>
  );
}