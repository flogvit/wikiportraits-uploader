'use client';

import { Calendar } from 'lucide-react';
import { useFormContext } from 'react-hook-form';
import { SoccerMatchMetadata, SoccerPlayer } from '../../forms/SoccerMatchForm';
import { MusicEventMetadata } from '@/types/music';
import { UploadType } from '@/components/selectors/UploadTypeSelector';
import { WorkflowFormData, useWorkflowForm } from '../providers/WorkflowFormProvider';
import SoccerMatchForm from '../../forms/SoccerMatchForm';
import FestivalDetailsForm from '../../forms/FestivalDetailsForm';

interface EventDetailsPaneProps {
  onComplete?: () => void;
}

export default function EventDetailsPane({
  onComplete
}: EventDetailsPaneProps) {
  const { form } = useWorkflowForm();
  const uploadType = form.watch('uploadType');
  const soccerMatchData = form.watch('soccerMatchData');
  const selectedPlayers = form.watch('selectedPlayers') || [];
  const musicEventData = form.watch('musicEventData');
  const { watch } = useFormContext<WorkflowFormData>();
  
  // Get event details from the unified form
  const eventDetails = watch('eventDetails');
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
      ) : uploadType === 'music' && musicEventData ? (
        <div className="space-y-6">
          {musicEventData.eventType === 'festival' ? (
            <FestivalDetailsForm
              musicEventData={musicEventData}
              onMusicEventUpdate={(eventData) => form.setValue('musicEventData', eventData)}
              onComplete={onComplete}
            />
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