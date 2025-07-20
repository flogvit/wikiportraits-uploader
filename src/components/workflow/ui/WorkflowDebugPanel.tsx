'use client';

import { useUniversalForm } from '@/providers/UniversalFormProvider';
import { MusicWorkflowStep } from '@/types/music-workflow';

interface WorkflowDebugPanelProps {
  currentStep: MusicWorkflowStep;
  completedSteps: Set<MusicWorkflowStep>;
}

export default function WorkflowDebugPanel({
  currentStep,
  completedSteps
}: WorkflowDebugPanelProps) {
  const form = useUniversalForm();

  return (
    <div className="mt-8 bg-gray-50 p-4 rounded-lg">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-gray-900">Debug Information</h3>
        <div className="flex space-x-2">
          <button
            onClick={() => form.saveToStorage()}
            className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Save Now
          </button>
          <button
            onClick={() => form.loadFromStorage()}
            className="px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700"
          >
            Reload
          </button>
          <button
            onClick={() => {
              form.clearStorage();
              window.location.reload();
            }}
            className="px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700"
          >
            Clear
          </button>
        </div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
        <div>
          <span className="font-medium">Current Step:</span>
          <div>{currentStep}</div>
        </div>
        <div>
          <span className="font-medium">Has Changes:</span>
          <div>{form.hasChanges ? '✅' : '❌'}</div>
        </div>
        <div>
          <span className="font-medium">Changed Sections:</span>
          <div>{form.changedSections.length}</div>
        </div>
        <div>
          <span className="font-medium">Completed Steps:</span>
          <div>{completedSteps.size}</div>
        </div>
      </div>
    </div>
  );
}