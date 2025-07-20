'use client';

import { useUniversalForm } from '@/providers/UniversalFormProvider';

interface EventDetailsStepProps {
  title?: string;
  subtitle?: string;
  titlePlaceholder?: string;
  showTypeField?: boolean;
  showLanguageField?: boolean;
  additionalFields?: React.ReactNode;
}

export default function EventDetailsStep({
  title = "Event Details",
  subtitle = "Provide basic information about the event.",
  titlePlaceholder = "e.g. Music Festival 2024",
  showTypeField = false,
  showLanguageField = true,
  additionalFields
}: EventDetailsStepProps) {
  const form = useUniversalForm();
  
  const eventDetails = form.watch('eventDetails');
  
  const handleTitleChange = (title: string) => {
    form.setValue('eventDetails.title', title, { shouldDirty: true });
  };
  
  const handleDateChange = (date: string) => {
    form.setValue('eventDetails.date', new Date(date), { shouldDirty: true });
  };
  
  const handleDescriptionChange = (description: string) => {
    form.setValue('eventDetails.description', description, { shouldDirty: true });
  };

  const handleTypeChange = (type: string) => {
    form.setValue('eventDetails.type', type, { shouldDirty: true });
  };

  const handleLanguageChange = (language: string) => {
    form.setValue('eventDetails.language', language, { shouldDirty: true });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">{title}</h2>
        <p className="text-gray-600 mb-6">
          {subtitle}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Event Title *
            </label>
            <input
              type="text"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder={titlePlaceholder}
              value={eventDetails.title || ''}
              onChange={(e) => handleTitleChange(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Event Date
            </label>
            <input
              type="date"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={eventDetails.date ? eventDetails.date.toISOString().split('T')[0] : ''}
              onChange={(e) => handleDateChange(e.target.value)}
            />
          </div>

          {showTypeField && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Event Type
              </label>
              <select
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={eventDetails.type || ''}
                onChange={(e) => handleTypeChange(e.target.value)}
              >
                <option value="">Select type...</option>
                <option value="festival">Festival</option>
                <option value="concert">Concert</option>
                <option value="match">Match</option>
                <option value="tournament">Tournament</option>
              </select>
            </div>
          )}

          {showLanguageField && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Language
              </label>
              <select
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={eventDetails.language || 'en'}
                onChange={(e) => handleLanguageChange(e.target.value)}
              >
                <option value="en">English</option>
                <option value="es">Spanish</option>
                <option value="fr">French</option>
                <option value="de">German</option>
              </select>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Brief description of the event..."
              value={eventDetails.description || ''}
              onChange={(e) => handleDescriptionChange(e.target.value)}
            />
          </div>

          {additionalFields}
        </div>

        <div className="space-y-4">
          <div className="bg-blue-50 p-4 rounded-lg">
            <h3 className="text-sm font-medium text-blue-900 mb-2">Form State Debug</h3>
            <div className="text-xs text-blue-800 space-y-1">
              <div>Has Changes: {form.hasChanges ? '✅' : '❌'}</div>
              <div>Changed Fields: {form.changedSections.length}</div>
              <div>Title: {eventDetails.title || 'Not set'}</div>
              <div>Date: {eventDetails.date ? eventDetails.date.toLocaleDateString() : 'Not set'}</div>
              {showTypeField && <div>Type: {eventDetails.type || 'Not set'}</div>}
            </div>
          </div>

          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="text-sm font-medium text-gray-700 mb-2">Next Steps</h3>
            <ul className="text-xs text-gray-600 space-y-1">
              <li>• Fill in event title (required)</li>
              <li>• Set event date</li>
              <li>• Add a brief description</li>
              <li>• Click "Continue" to proceed</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}