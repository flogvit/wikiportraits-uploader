'use client';

import { FileText } from 'lucide-react';
import { useUniversalForm } from '@/providers/UniversalFormProvider';

export default function TemplatesStep() {
  const form = useUniversalForm();
  const computed = form.watch('computed');

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Templates</h2>
        <p className="text-gray-600 mb-6">
          Review generated Commons templates and file descriptions.
        </p>
      </div>

      <div className="bg-yellow-50 p-4 rounded-lg">
        <div className="flex items-start space-x-3">
          <FileText className="h-5 w-5 text-yellow-600 mt-0.5" />
          <div>
            <h3 className="text-sm font-medium text-yellow-800">Coming Soon</h3>
            <p className="text-sm text-yellow-700 mt-1">
              Template generation and editing interface will be implemented here.
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-medium text-gray-900">Generated Templates</h3>
        <div className="space-y-3">
          {['description', 'information', 'categories', 'license'].map((templateType) => (
            <div key={templateType} className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-medium text-gray-900 capitalize">{templateType}</h4>
              <p className="text-sm text-gray-600 mt-1">
                {computed.templates[templateType as keyof typeof computed.templates] || 'Not generated yet'}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}