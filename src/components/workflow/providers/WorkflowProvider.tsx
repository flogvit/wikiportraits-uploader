'use client';

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
// import { ImageFile } from '@/types';
// import { SoccerMatchMetadata, SoccerPlayer } from '@/components/forms/SoccerMatchForm';
import { MusicEventMetadata } from '@/types/music';
// import { UploadType } from '@/components/selectors/UploadTypeSelector';
import { useUniversalForm } from '@/providers/UniversalFormProvider';

export type WorkflowStep = 'upload-type' | 'wiki-portraits' | 'event-type' | 'event-details' | 'band-performers' | 'categories' | 'images' | 'templates' | 'wikidata' | 'commons' | 'wikipedia' | 'upload';
export type StepStatus = 'pending' | 'ready' | 'in-progress' | 'completed' | 'error';

export interface WorkflowStepInfo {
  id: WorkflowStep;
  title: string;
  description: string;
  icon: unknown;
  status: StepStatus;
  itemCount?: number;
  dependencies?: WorkflowStep[];
}

interface WorkflowContextType {
  activeTab: WorkflowStep;
  setActiveTab: (step: WorkflowStep) => void;
  stepStatuses: Record<WorkflowStep, StepStatus>;
  updateStepStatus: (step: WorkflowStep, status: StepStatus) => void;
  canAccessStep: (step: WorkflowStepInfo) => boolean;
  handleStepClick: (stepId: WorkflowStep) => void;
  handleUploadTypeComplete: () => void;
  handleWikiPortraitsComplete: () => void;
  handleEventTypeComplete: () => void;
  handleEventDetailsComplete: () => void;
  handleBandPerformersComplete: () => void;
  handleCategoriesComplete: () => void;
  handleTemplatesComplete: () => void;
  handleImagesComplete: () => void;
}

interface WorkflowProviderProps {
  children: ReactNode;
  musicEventData?: MusicEventMetadata | null;
  onMusicEventUpdate?: (eventData: MusicEventMetadata) => void;
}

const WorkflowContext = createContext<WorkflowContextType | undefined>(undefined);

export function WorkflowProvider({ 
  children
}: WorkflowProviderProps) {
  const { watch, getValues } = useUniversalForm();
  const workflowType = watch('workflowType');
  const uploadType = workflowType === 'music-event' ? 'music' : 'general';
  
  const getInitialTab = useCallback((): WorkflowStep => {
    // Always start with WikiPortraits selection
    return 'wiki-portraits';
  }, [uploadType]);

  const [activeTab, setActiveTab] = useState<WorkflowStep>('wiki-portraits'); // Default fallback
  const [stepStatuses, setStepStatuses] = useState<Record<WorkflowStep, StepStatus>>({
    'wiki-portraits': 'ready',
    'upload-type': 'pending',
    'event-type': 'pending',
    'event-details': 'pending',
    'band-performers': 'pending',
    categories: 'pending',
    images: 'pending',
    templates: 'pending',
    wikidata: 'pending',
    commons: 'pending',
    wikipedia: 'pending',
    upload: 'pending'
  });

  // Set initial tab and update when upload type changes
  useEffect(() => {
    setActiveTab(getInitialTab());
  }, [getInitialTab]);

  // Watch form values and auto-complete steps when required fields are filled
  useEffect(() => {
    const subscription = watch((value, { name }) => {
      // Watch event details and auto-complete when required fields are filled
      if (name?.startsWith('eventDetails.') || name === 'eventDetails') {
        const eventDetails = value.eventDetails;
        if (eventDetails?.common?.title && eventDetails?.common?.date) {
          updateStepStatus('event-details', 'completed');
        } else {
          updateStepStatus('event-details', 'pending');
        }
      }
      
      // Watch WikiPortraits selection
      if (name === 'isWikiPortraitsJob') {
        if (value.isWikiPortraitsJob !== undefined) {
          updateStepStatus('wiki-portraits', 'completed');
          updateStepStatus('upload-type', 'ready');
        }
      }

      // Watch workflow type selection
      if (name === 'workflowType') {
        if (value.workflowType) {
          updateStepStatus('upload-type', 'completed');
        }
      }
    });

    // Also check initial values
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
    if (eventDetails?.common?.title && eventDetails?.common?.date) {
      updateStepStatus('event-details', 'completed');
    }
    
    return () => subscription.unsubscribe();
  }, [watch, getValues]);


  const updateStepStatus = (step: WorkflowStep, status: StepStatus) => {
    setStepStatuses(prev => ({ ...prev, [step]: status }));
  };

  const canAccessStep = (step: WorkflowStepInfo): boolean => {
    // Allow access to all steps, but show helpful info if prerequisites are missing
    return true;
  };

  const handleStepClick = (stepId: WorkflowStep) => {
    setActiveTab(stepId);
  };

  const handleWikiPortraitsComplete = () => {
    updateStepStatus('wiki-portraits', 'completed');
    updateStepStatus('upload-type', 'ready');
    setActiveTab('upload-type');
  };

  const handleUploadTypeComplete = () => {
    updateStepStatus('upload-type', 'completed');
    const workflowType = getValues('workflowType');
    if (workflowType === 'music-event') {
      updateStepStatus('event-type', 'ready');
      setActiveTab('event-type');
    } else if (workflowType === 'soccer-match') {
      updateStepStatus('event-details', 'ready');
      setActiveTab('event-details');
    } else {
      updateStepStatus('images', 'ready');
      setActiveTab('images');
    }
  };

  const handleEventTypeComplete = () => {
    updateStepStatus('event-type', 'completed');
    updateStepStatus('event-details', 'ready');
    setActiveTab('event-details');
  };

  const handleEventDetailsComplete = () => {
    updateStepStatus('event-details', 'completed');
    const workflowType = getValues('workflowType');
    if (workflowType === 'music-event') {
      updateStepStatus('band-performers', 'ready');
      setActiveTab('band-performers');
    } else {
      updateStepStatus('categories', 'ready');
      setActiveTab('categories');
    }
  };

  const handleBandPerformersComplete = () => {
    updateStepStatus('band-performers', 'completed');
    updateStepStatus('images', 'ready');
    setActiveTab('images');
  };

  const handleCategoriesComplete = () => {
    updateStepStatus('categories', 'completed');
    updateStepStatus('templates', 'ready');
    setActiveTab('templates');
  };

  const handleTemplatesComplete = () => {
    updateStepStatus('templates', 'completed');
    updateStepStatus('wikidata', 'ready');
    setActiveTab('wikidata');
  };

  const handleImagesComplete = () => {
    updateStepStatus('images', 'completed');
    updateStepStatus('categories', 'ready');
    setActiveTab('categories');
  };

  const contextValue: WorkflowContextType = {
    activeTab,
    setActiveTab,
    stepStatuses,
    updateStepStatus,
    canAccessStep,
    handleStepClick,
    handleUploadTypeComplete,
    handleWikiPortraitsComplete,
    handleEventTypeComplete,
    handleEventDetailsComplete,
    handleBandPerformersComplete,
    handleCategoriesComplete,
    handleTemplatesComplete,
    handleImagesComplete
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