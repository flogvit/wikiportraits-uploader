'use client';

import { CheckCircle } from 'lucide-react';
import { useUniversalForm } from '@/providers/UniversalFormProvider';

export default function PublishStep() {
  const form = useUniversalForm();
  const publishing = form.watch('publishing');

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Publish</h2>
        <p className="text-gray-600 mb-6">
          Review your changes and publish to Wikimedia Commons.
        </p>
      </div>

      <div className="bg-yellow-50 p-4 rounded-lg">
        <div className="flex items-start space-x-3">
          <CheckCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
          <div>
            <h3 className="text-sm font-medium text-yellow-800">Coming Soon</h3>
            <p className="text-sm text-yellow-700 mt-1">
              Publishing interface with action lists and progress tracking will be implemented here.
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-medium text-gray-900">Publish Status</h3>
        <div className="bg-gray-50 p-4 rounded-lg">
          <div className="flex items-center justify-between">
            <span className="font-medium text-gray-900">Status:</span>
            <span className="px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full">
              {publishing.status}
            </span>
          </div>
          <div className="flex items-center justify-between mt-2">
            <span className="font-medium text-gray-900">Actions:</span>
            <span className="text-gray-600">{publishing.actions.length} pending</span>
          </div>
        </div>
      </div>
    </div>
  );
}