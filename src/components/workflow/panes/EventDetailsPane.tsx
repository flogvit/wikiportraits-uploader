'use client';

import { Calendar, Users } from 'lucide-react';
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
  const eventDetails = watch('eventDetails');
  const participants = eventDetails?.participants || [];

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
        <>
          <EventDetailsForm onComplete={onComplete} />

          {/* Participants Summary Section */}
          {participants.length > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <Users className="w-5 h-5 text-blue-600" />
                <h3 className="font-semibold text-gray-900">
                  Event Participants ({participants.length})
                </h3>
              </div>

              <div className="space-y-2">
                {participants.map((participant: any, index: number) => (
                  <div
                    key={participant.id || index}
                    className="flex items-start justify-between bg-white rounded p-3"
                  >
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">
                        {participant.name}
                      </div>
                      {participant.commonsCategory && (
                        <div className="text-xs text-gray-500 mt-1">
                          Category: {participant.commonsCategory}
                        </div>
                      )}
                    </div>
                    {participant.wikidataUrl && (
                      <a
                        href={participant.wikidataUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-blue-600 hover:text-blue-800"
                      >
                        View on Wikidata →
                      </a>
                    )}
                  </div>
                ))}
              </div>

              <div className="mt-3 text-xs text-gray-600">
                <p>
                  Individual categories will be created for each participant following the pattern:
                  <span className="font-mono bg-gray-100 px-1 ml-1">
                    &lt;Participant&gt; in the &lt;Event&gt;
                  </span>
                </p>
              </div>
            </div>
          )}
        </>
      ) : null}
    </div>
  );
}