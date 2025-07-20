'use client';

import EventDetailsStep from '../EventDetailsStep';
import { useUniversalForm } from '@/providers/UniversalFormProvider';

export default function MusicEventDetailsStep() {
  const form = useUniversalForm();
  const eventDetails = form.watch('eventDetails');

  const handleGenreChange = (genres: string) => {
    form.setValue('eventDetails.genre', genres.split(',').map(g => g.trim()), { shouldDirty: true });
  };

  const handleRecordingTypeChange = (type: string) => {
    form.setValue('eventDetails.recordingType', type, { shouldDirty: true });
  };

  const musicFields = (
    <>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Genres
        </label>
        <input
          type="text"
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Rock, Pop, Electronic (comma-separated)"
          value={eventDetails.genre?.join(', ') || ''}
          onChange={(e) => handleGenreChange(e.target.value)}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Recording Type
        </label>
        <select
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={eventDetails.recordingType || 'live'}
          onChange={(e) => handleRecordingTypeChange(e.target.value)}
        >
          <option value="live">Live Performance</option>
          <option value="studio">Studio Recording</option>
          <option value="rehearsal">Rehearsal</option>
        </select>
      </div>
    </>
  );

  return (
    <EventDetailsStep
      title="Music Event Details"
      subtitle="Provide information about the music event or concert."
      titlePlaceholder="e.g. Coldplay at Glastonbury 2024"
      showTypeField={true}
      additionalFields={musicFields}
    />
  );
}