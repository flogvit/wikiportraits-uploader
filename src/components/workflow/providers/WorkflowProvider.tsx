'use client';

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { useUniversalForm } from '@/providers/UniversalFormProvider';
import { getWorkflowConfig } from '@/config/workflow-registry';

export type StepStatus = 'pending' | 'ready' | 'in-progress' | 'completed' | 'error';

interface WorkflowContextType {
  activeTab: string;
  setActiveTab: (step: string) => void;
  stepStatuses: Record<string, StepStatus>;
  updateStepStatus: (step: string, status: StepStatus) => void;
  handleStepClick: (stepId: string) => void;
  handleStepComplete: (stepId: string) => void;
}

const WorkflowContext = createContext<WorkflowContextType | undefined>(undefined);

export function WorkflowProvider({ children }: { children: ReactNode }) {
  const { watch, getValues } = useUniversalForm();
  const workflowType = watch('workflowType');
  const uploadType = workflowType === 'music-event' ? 'music' : 'general';

  const [activeTab, setActiveTab] = useState<string>('wiki-portraits');
  const [stepStatuses, setStepStatuses] = useState<Record<string, StepStatus>>({
    'wiki-portraits': 'ready',
  });

  // Reset to initial tab when upload type changes
  useEffect(() => {
    setActiveTab('wiki-portraits');
  }, [uploadType]);

  // Watch form values and auto-complete steps when required fields are filled
  useEffect(() => {
    const subscription = watch((value, { name }) => {
      if (name?.startsWith('eventDetails.') || name === 'eventDetails') {
        const eventDetails = value.eventDetails;
        if (eventDetails?.title && eventDetails?.date) {
          updateStepStatus('event-details', 'completed');
        } else {
          updateStepStatus('event-details', 'pending');
        }
      }

      if (name === 'isWikiPortraitsJob') {
        if (value.isWikiPortraitsJob !== undefined) {
          updateStepStatus('wiki-portraits', 'completed');
          updateStepStatus('upload-type', 'ready');
        }
      }

      if (name === 'workflowType') {
        if (value.workflowType) {
          updateStepStatus('upload-type', 'completed');
        }
      }
    });

    // Check initial values
    const isWikiPortraitsJob = getValues('isWikiPortraitsJob');
    if (isWikiPortraitsJob !== undefined) {
      updateStepStatus('wiki-portraits', 'completed');
      updateStepStatus('upload-type', 'ready');
    }

    const currentWorkflowType = getValues('workflowType');
    if (currentWorkflowType) {
      updateStepStatus('upload-type', 'completed');
    }

    const eventDetails = getValues('eventDetails');
    if (eventDetails?.title && eventDetails?.date) {
      updateStepStatus('event-details', 'completed');
    }

    return () => subscription.unsubscribe();
  }, [watch, getValues]);

  const updateStepStatus = (step: string, status: StepStatus) => {
    setStepStatuses(prev => ({ ...prev, [step]: status }));
  };

  const handleStepClick = (stepId: string) => {
    setActiveTab(stepId);
  };

  const handleStepComplete = useCallback((stepId: string) => {
    // Mark current step as completed
    updateStepStatus(stepId, 'completed');

    // Determine active workflow config
    const currentWorkflowType = getValues('workflowType');
    const currentUploadType = currentWorkflowType === 'music-event' ? 'music' : 'general';
    const config = getWorkflowConfig(currentUploadType);

    // Find current step index and navigate to next
    const currentIndex = config.steps.findIndex(s => s.id === stepId);
    if (currentIndex >= 0 && currentIndex < config.steps.length - 1) {
      const nextStep = config.steps[currentIndex + 1];
      updateStepStatus(nextStep.id, 'ready');
      setActiveTab(nextStep.id);
    }
  }, [getValues]);

  const contextValue: WorkflowContextType = {
    activeTab,
    setActiveTab,
    stepStatuses,
    updateStepStatus,
    handleStepClick,
    handleStepComplete,
  };

  return (
    <WorkflowContext.Provider value={contextValue}>
      {children}
    </WorkflowContext.Provider>
  );
}

export function useWorkflow() {
  const context = useContext(WorkflowContext);
  if (context === undefined) {
    throw new Error('useWorkflow must be used within a WorkflowProvider');
  }
  return context;
}
