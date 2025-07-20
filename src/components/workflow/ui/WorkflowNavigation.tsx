'use client';

import { MusicWorkflowStep, MUSIC_WORKFLOW_STEPS } from '@/types/music-workflow';

interface WorkflowNavigationProps {
  currentStep: MusicWorkflowStep;
  onNext: () => void;
  onPrevious: () => void;
}

export default function WorkflowNavigation({
  currentStep,
  onNext,
  onPrevious
}: WorkflowNavigationProps) {
  const currentIndex = MUSIC_WORKFLOW_STEPS.findIndex(s => s.id === currentStep);
  const isFirstStep = currentStep === 'details';
  const isLastStep = currentStep === 'publish';

  return (
    <div className="flex items-center justify-between">
      <button
        onClick={onPrevious}
        disabled={isFirstStep}
        className="px-6 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Previous
      </button>
      
      <div className="text-sm text-gray-600">
        Step {currentIndex + 1} of {MUSIC_WORKFLOW_STEPS.length}
      </div>
      
      <button
        onClick={onNext}
        disabled={isLastStep}
        className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isLastStep ? 'Complete' : 'Continue'}
      </button>
    </div>
  );
}