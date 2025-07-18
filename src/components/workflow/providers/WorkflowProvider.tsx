'use client';

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
// import { ImageFile } from '@/types';
// import { SoccerMatchMetadata, SoccerPlayer } from '@/components/forms/SoccerMatchForm';
import { MusicEventMetadata } from '@/types/music';
// import { UploadType } from '@/components/selectors/UploadTypeSelector';
import { useWorkflowForm } from './WorkflowFormProvider';

export type WorkflowStep = 'wiki-portraits' | 'event-type' | 'event-details' | 'band-performers' | 'categories' | 'images' | 'templates' | 'wikidata' | 'commons' | 'wikipedia' | 'upload';
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
  const { form } = useWorkflowForm();
  const uploadType = form.watch('uploadType');
  
  const getInitialTab = useCallback((): WorkflowStep => {
    // Always start with WikiPortraits workflow choice
    return 'wiki-portraits';
  }, [uploadType]);

  const [activeTab, setActiveTab] = useState<WorkflowStep>('images'); // Default fallback
  const [stepStatuses, setStepStatuses] = useState<Record<WorkflowStep, StepStatus>>({
    'wiki-portraits': 'ready',
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

  // Watch WikiPortraits form value and auto-complete step when selection is made
  useEffect(() => {
    const subscription = form.watch((value, { name }) => {
      if (name?.startsWith('wikiPortraits.isWikiPortraitsJob') || name === 'wikiPortraits') {
        const wikiPortraits = value.wikiPortraits;
        if (wikiPortraits?.isWikiPortraitsJob !== undefined) {
          updateStepStatus('wiki-portraits', 'completed');
        }
      }
      
      // Watch event details and auto-complete when required fields are filled
      if (name?.startsWith('eventDetails.') || name === 'eventDetails') {
        const eventDetails = value.eventDetails;
        if (eventDetails?.name && eventDetails?.year) {
          updateStepStatus('event-details', 'completed');
        } else {
          updateStepStatus('event-details', 'pending');
        }
      }
    });
    
    // Also check initial values
    const wikiPortraits = form.getValues('wikiPortraits');
    if (wikiPortraits?.isWikiPortraitsJob !== undefined) {
      updateStepStatus('wiki-portraits', 'completed');
    }
    
    const eventDetails = form.getValues('eventDetails');
    if (eventDetails?.name && eventDetails?.year) {
      updateStepStatus('event-details', 'completed');
    }
    
    return () => subscription.unsubscribe();
  }, [form]);


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
    const { uploadType } = form.getValues();
    if (uploadType === 'music') {
      updateStepStatus('event-type', 'ready');
      setActiveTab('event-type');
    } else if (uploadType === 'soccer') {
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
    const { uploadType } = form.getValues();
    if (uploadType === 'music') {
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