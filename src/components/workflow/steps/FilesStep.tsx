'use client';

import { Upload } from 'lucide-react';
import { useUniversalForm } from '@/providers/UniversalFormProvider';

export default function FilesStep() {
  const form = useUniversalForm();
  const files = form.watch('files');

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Files</h2>
        <p className="text-gray-600 mb-6">
          Upload and manage your image files for this music event.
        </p>
      </div>

      <div className="bg-yellow-50 p-4 rounded-lg">
        <div className="flex items-start space-x-3">
          <Upload className="h-5 w-5 text-yellow-600 mt-0.5" />
          <div>
            <h3 className="text-sm font-medium text-yellow-800">Coming Soon</h3>
            <p className="text-sm text-yellow-700 mt-1">
              File upload and management interface will be implemented here.
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-medium text-gray-900">File Status</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-blue-50 p-4 rounded-lg">
            <h4 className="font-medium text-blue-900">Upload Queue</h4>
            <p className="text-sm text-blue-700">{files.queue.length} files ready</p>
          </div>
          <div className="bg-green-50 p-4 rounded-lg">
            <h4 className="font-medium text-green-900">Uploaded</h4>
            <p className="text-sm text-green-700">{files.uploaded.length} files published</p>
          </div>
        </div>
      </div>
    </div>
  );
}