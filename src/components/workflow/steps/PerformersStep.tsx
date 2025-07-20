'use client';

import { Music } from 'lucide-react';
import { useUniversalForm } from '@/providers/UniversalFormProvider';

export default function PerformersStep() {
  const form = useUniversalForm();
  const entities = form.watch('entities');

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Performers</h2>
        <p className="text-gray-600 mb-6">
          Add the bands, musicians, and performers for this event.
        </p>
      </div>

      <div className="bg-yellow-50 p-4 rounded-lg">
        <div className="flex items-start space-x-3">
          <Music className="h-5 w-5 text-yellow-600 mt-0.5" />
          <div>
            <h3 className="text-sm font-medium text-yellow-800">Coming Soon</h3>
            <p className="text-sm text-yellow-700 mt-1">
              Performer selection using WDPersonSelector and WDEntitySelector will be implemented here.
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-medium text-gray-900">Current Entities</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-medium text-gray-900">People</h4>
            <p className="text-sm text-gray-600">{entities.people.length} performers</p>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-medium text-gray-900">Organizations</h4>
            <p className="text-sm text-gray-600">{entities.organizations.length} bands/venues</p>
          </div>
        </div>
      </div>
    </div>
  );
}