'use client';

import { Tags } from 'lucide-react';
import { useUniversalForm } from '@/providers/UniversalFormProvider';

export default function CategoriesStep() {
  const form = useUniversalForm();
  const computed = form.watch('computed');

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Categories</h2>
        <p className="text-gray-600 mb-6">
          Review and manage Wikimedia Commons categories for your uploads.
        </p>
      </div>

      <div className="bg-yellow-50 p-4 rounded-lg">
        <div className="flex items-start space-x-3">
          <Tags className="h-5 w-5 text-yellow-600 mt-0.5" />
          <div>
            <h3 className="text-sm font-medium text-yellow-800">Coming Soon</h3>
            <p className="text-sm text-yellow-700 mt-1">
              Category management interface will be implemented here.
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-medium text-gray-900">Category Status</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-green-50 p-3 rounded-lg text-center">
            <div className="text-lg font-semibold text-green-900">{computed.categories.auto.length}</div>
            <div className="text-sm text-green-700">Auto Generated</div>
          </div>
          <div className="bg-blue-50 p-3 rounded-lg text-center">
            <div className="text-lg font-semibold text-blue-900">{computed.categories.suggested.length}</div>
            <div className="text-sm text-blue-700">Suggested</div>
          </div>
          <div className="bg-purple-50 p-3 rounded-lg text-center">
            <div className="text-lg font-semibold text-purple-900">{computed.categories.manual.length}</div>
            <div className="text-sm text-purple-700">Manual</div>
          </div>
          <div className="bg-gray-50 p-3 rounded-lg text-center">
            <div className="text-lg font-semibold text-gray-900">{computed.categories.all.length}</div>
            <div className="text-sm text-gray-700">Total</div>
          </div>
        </div>
      </div>
    </div>
  );
}