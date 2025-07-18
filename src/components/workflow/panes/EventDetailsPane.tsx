'use client';

import { Calendar } from 'lucide-react';
import { useWorkflowForm } from '../providers/WorkflowFormProvider';
import SoccerMatchForm from '../../forms/SoccerMatchForm';
import EventDetailsForm from '../../forms/EventDetailsForm';

interface EventDetailsPaneProps {
  onComplete?: () => void;
}

export default function EventDetailsPane({
  onComplete
}: EventDetailsPaneProps) {
  const { form } = useWorkflowForm();
  const uploadType = form.watch('uploadType');
  return (
    <div className="space-y-6">
      <div className="text-center">
        <Calendar className="w-12 h-12 mx-auto mb-4 text-primary" />
        <h2 className="text-2xl font-bold text-card-foreground mb-2">Event Details</h2>
        <p className="text-muted-foreground">
          Configure the details of your event for better organization
        </p>
      </div>

      {uploadType === 'soccer' ? (
        <SoccerMatchForm
          onComplete={onComplete}
        />
      ) : uploadType === 'music' ? (
        <EventDetailsForm onComplete={onComplete} />
      ) : null}
    </div>
  );
}