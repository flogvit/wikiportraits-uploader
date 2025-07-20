'use client';

import { MusicWorkflowStep, MUSIC_WORKFLOW_STEPS } from '@/types/music-workflow';

interface MusicWorkflowStepperProps {
  currentStep: MusicWorkflowStep;
  completedSteps: Set<MusicWorkflowStep>;
  onStepClick: (step: MusicWorkflowStep) => void;
}

export default function MusicWorkflowStepper({
  currentStep,
  completedSteps,
  onStepClick
}: MusicWorkflowStepperProps) {
  return (
    <div className="mb-8">
      <div className="flex items-center justify-between bg-white rounded-lg p-4 shadow-sm border">
        {MUSIC_WORKFLOW_STEPS.map((step, index) => {
          const isActive = currentStep === step.id;
          const isCompleted = completedSteps.has(step.id);
          const Icon = step.icon;
          
          return (
            <div key={step.id} className="flex-1 flex items-center">
              <button
                onClick={() => onStepClick(step.id)}
                className={`flex items-center justify-center w-10 h-10 rounded-full border-2 transition-colors ${
                  isActive 
                    ? 'border-blue-500 bg-blue-500 text-white' 
                    : isCompleted
                      ? 'border-green-500 bg-green-500 text-white'
                      : 'border-gray-300 text-gray-400'
                }`}
              >
                <Icon size={20} />
              </button>
              
              <div className="ml-3 flex-1">
                <button
                  onClick={() => onStepClick(step.id)}
                  className={`block text-left ${
                    isActive ? 'text-blue-600 font-medium' : 'text-gray-600'
                  }`}
                >
                  <div className="text-sm font-medium">{step.name}</div>
                  <div className="text-xs text-gray-500">{step.description}</div>
                </button>
              </div>
              
              {index < MUSIC_WORKFLOW_STEPS.length - 1 && (
                <div className={`w-8 h-0.5 ${
                  completedSteps.has(step.id) ? 'bg-green-300' : 'bg-gray-300'
                }`} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}