'use client';

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { ImageFile } from '@/app/page';
import { SoccerMatchMetadata, SoccerPlayer } from '@/components/forms/SoccerMatchForm';
import { MusicEventMetadata } from '@/types/music';
import { getItem, KEYS } from '@/utils/localStorage';
import { UploadType } from '@/components/selectors/UploadTypeSelector';
import { useWorkflowForm } from './WorkflowFormProvider';

export type WorkflowStep = 'event-type' | 'event-details' | 'categories' | 'images' | 'templates' | 'wikidata' | 'commons' | 'wikipedia' | 'upload';
export type StepStatus = 'pending' | 'ready' | 'in-progress' | 'completed' | 'error';

export interface WorkflowStepInfo {
  id: WorkflowStep;
  title: string;
  description: string;
  icon: any;
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
  handleEventTypeComplete: () => void;
  handleEventDetailsComplete: () => void;
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
  children, 
  musicEventData, 
  onMusicEventUpdate 
}: WorkflowProviderProps) {
  const { form } = useWorkflowForm();
  const uploadType = form.watch('uploadType');
  
  const getInitialTab = useCallback((): WorkflowStep => {
    if (uploadType === 'music') return 'event-type';
    if (uploadType === 'soccer') return 'event-details';
    return 'images';
  }, [uploadType]);

  const [activeTab, setActiveTab] = useState<WorkflowStep>('images'); // Default fallback
  const [stepStatuses, setStepStatuses] = useState<Record<WorkflowStep, StepStatus>>({
    'event-type': 'ready',
    'event-details': 'pending',
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

  // Load stored music event data when switching to event-details
  useEffect(() => {
    if (activeTab === 'event-details' && uploadType === 'music' && musicEventData?.eventType === 'festival' && onMusicEventUpdate) {
      const storedName = getItem(KEYS.FESTIVAL_NAME);
      const storedYear = getItem(KEYS.FESTIVAL_YEAR);
      const storedLocation = getItem(KEYS.FESTIVAL_LOCATION);
      const storedCountry = getItem(KEYS.FESTIVAL_COUNTRY);
      
      if (storedName || storedYear || storedLocation || storedCountry) {
        onMusicEventUpdate({
          ...musicEventData,
          festivalData: {
            ...musicEventData.festivalData!,
            festival: {
              ...musicEventData.festivalData!.festival,
              name: storedName || musicEventData.festivalData!.festival?.name || '',
              year: storedYear || musicEventData.festivalData!.festival?.year || '',
              location: storedLocation || musicEventData.festivalData!.festival?.location || '',
              country: storedCountry || musicEventData.festivalData!.festival?.country || ''
            }
          }
        });
      }
    }
  }, [activeTab, uploadType]);

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

  const handleEventTypeComplete = () => {
    updateStepStatus('event-type', 'completed');
    updateStepStatus('event-details', 'ready');
    setActiveTab('event-details');
  };

  const handleEventDetailsComplete = () => {
    updateStepStatus('event-details', 'completed');
    updateStepStatus('categories', 'ready');
    setActiveTab('categories');
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
    handleEventTypeComplete,
    handleEventDetailsComplete,
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