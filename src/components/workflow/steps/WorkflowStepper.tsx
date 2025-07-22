'use client';

import { CheckCircle, Clock, AlertCircle, Settings, Calendar, ImagePlus, FolderPlus, Database, Globe, Upload, FileText, Users, Camera, FileImage } from 'lucide-react';
import { useWorkflow, StepStatus } from '../providers/WorkflowProvider';
import { useUniversalForm } from '@/providers/UniversalFormProvider';

// Workflow step configuration
interface StepConfig {
  id: string;
  title: string;
  icon: React.ComponentType<any>;
  getDescription: (formData: any) => string;
  getDependencies: () => string[];
  hasValues: (formData: any) => boolean;
  isFinished: (formData: any) => boolean;
}

interface WorkflowConfig {
  steps: StepConfig[];
}

// Step configurations by workflow type
const WORKFLOW_CONFIGS: Record<string, WorkflowConfig> = {
  'music': {
    steps: [
      {
        id: 'upload-type',
        title: 'Upload Type',
        icon: FileImage,
        getDescription: (formData) => {
          const workflowType = formData.workflowType;
          if (workflowType === 'music-event') return 'Music Event';
          if (workflowType === 'soccer-match') return 'Soccer Match';
          if (workflowType === 'portrait-session') return 'Portrait Session';
          if (workflowType === 'general-upload') return 'General Upload';
          return 'Choose upload type';
        },
        getDependencies: () => [],
        hasValues: (formData) => formData.workflowType !== undefined,
        isFinished: (formData) => formData.workflowType !== undefined
      },
      {
        id: 'wiki-portraits',
        title: 'WikiPortraits',
        icon: Camera,
        getDescription: (formData) => {
          const isWikiPortraitsJob = formData.isWikiPortraitsJob;
          return isWikiPortraitsJob === true 
            ? 'WikiPortraits Assignment'
            : isWikiPortraitsJob === false 
            ? 'Wikimedia Commons'
            : 'Select workflow type';
        },
        getDependencies: () => ['upload-type'],
        hasValues: (formData) => formData.isWikiPortraitsJob !== undefined,
        isFinished: (formData) => formData.isWikiPortraitsJob !== undefined
      },
      {
        id: 'event-type',
        title: 'Event Type',
        icon: Settings,
        getDescription: (formData) => {
          const selectedEventType = formData.eventDetails?.type;
          return selectedEventType
            ? selectedEventType.charAt(0).toUpperCase() + selectedEventType.slice(1)
            : 'Choose event type';
        },
        getDependencies: () => ['wiki-portraits'],
        hasValues: (formData) => formData.eventDetails?.type !== undefined,
        isFinished: (formData) => formData.eventDetails?.type !== undefined
      },
      {
        id: 'event-details',
        title: 'Event Details',
        icon: Calendar,
        getDescription: (formData) => {
          const eventName = formData.eventDetails?.title;
          const eventYear = formData.eventDetails?.date ? new Date(formData.eventDetails.date).getFullYear() : null;
          return eventName && eventYear
            ? `${eventName} (${eventYear})`
            : eventName 
            ? `${eventName}`
            : eventYear
            ? `Event ${eventYear}`
            : 'Configure event details';
        },
        getDependencies: () => ['event-type'],
        hasValues: (formData) => formData.eventDetails?.title && formData.eventDetails?.date,
        isFinished: (formData) => formData.eventDetails?.title && formData.eventDetails?.date
      },
      {
        id: 'band-performers',
        title: 'Band & Performers',
        icon: Users,
        getDescription: (formData) => {
          const performers = formData.entities?.people || [];
          return performers.length > 0 ? `${performers.length} performer(s)` : 'Select band and performers';
        },
        getDependencies: () => ['event-details'],
        hasValues: (formData) => (formData.entities?.people?.length || 0) > 0,
        isFinished: (formData) => (formData.entities?.people?.length || 0) > 0
      },
      {
        id: 'images',
        title: 'Images',
        icon: ImagePlus,
        getDescription: () => 'Upload and manage images',
        getDependencies: () => ['band-performers'],
        hasValues: (formData) => (formData.files?.queue?.length || 0) > 0,
        isFinished: (formData) => (formData.files?.queue?.length || 0) > 0 && formData.files?.queue?.every((file: any) => file.metadata?.description)
      },
      {
        id: 'categories',
        title: 'Categories',
        icon: FolderPlus,
        getDescription: () => 'Organize with categories',
        getDependencies: () => ['images'],
        hasValues: () => false, // TODO: Implement category checking
        isFinished: () => false // TODO: Implement category completion checking
      },
      {
        id: 'templates',
        title: 'Templates',
        icon: FileText,
        getDescription: () => 'Apply Commons templates',
        getDependencies: () => ['categories'],
        hasValues: () => false, // TODO: Implement template checking
        isFinished: () => false // TODO: Implement template completion checking
      },
      {
        id: 'wikidata',
        title: 'Wikidata',
        icon: Database,
        getDescription: () => 'Link to Wikidata',
        getDependencies: () => ['templates'],
        hasValues: () => false, // TODO: Implement wikidata checking
        isFinished: () => false // TODO: Implement wikidata completion checking
      },
      {
        id: 'upload',
        title: 'Publish',
        icon: Upload,
        getDescription: () => 'Publish to Wikimedia Commons',
        getDependencies: () => ['wikidata'],
        hasValues: () => false, // TODO: Implement upload checking
        isFinished: () => false // TODO: Implement upload completion checking
      }
    ]
  },
  'general': {
    steps: [
      {
        id: 'upload-type',
        title: 'Upload Type',
        icon: FileImage,
        getDescription: (formData) => {
          const workflowType = formData.workflowType;
          if (workflowType === 'music-event') return 'Music Event';
          if (workflowType === 'soccer-match') return 'Soccer Match';
          if (workflowType === 'portrait-session') return 'Portrait Session';
          if (workflowType === 'general-upload') return 'General Upload';
          return 'Choose upload type';
        },
        getDependencies: () => [],
        hasValues: (formData) => formData.workflowType !== undefined,
        isFinished: (formData) => formData.workflowType !== undefined
      },
      {
        id: 'wiki-portraits',
        title: 'WikiPortraits',
        icon: Camera,
        getDescription: (formData) => {
          const isWikiPortraitsJob = formData.isWikiPortraitsJob;
          return isWikiPortraitsJob === true 
            ? 'WikiPortraits Assignment'
            : isWikiPortraitsJob === false 
            ? 'Wikimedia Commons'
            : 'Select workflow type';
        },
        getDependencies: () => ['upload-type'],
        hasValues: (formData) => formData.isWikiPortraitsJob !== undefined,
        isFinished: (formData) => formData.isWikiPortraitsJob !== undefined
      },
      {
        id: 'images',
        title: 'Images',
        icon: ImagePlus,
        getDescription: () => 'Upload and manage images',
        getDependencies: () => ['wiki-portraits'],
        hasValues: (formData) => (formData.files?.queue?.length || 0) > 0,
        isFinished: (formData) => (formData.files?.queue?.length || 0) > 0 && formData.files?.queue?.every((file: any) => file.metadata?.description)
      },
      {
        id: 'upload',
        title: 'Publish',
        icon: Upload,
        getDescription: () => 'Publish to Wikimedia Commons',
        getDependencies: () => ['images'],
        hasValues: () => false,
        isFinished: () => false
      }
    ]
  }
};

export default function WorkflowStepper() {
  const { activeTab, stepStatuses, handleStepClick } = useWorkflow();
  const { watch } = useUniversalForm();
  const workflowType = watch('workflowType');
  const uploadType = workflowType === 'music-event' ? 'music' : 'general';
  
  // Get all form data once
  const formData = watch();
  
  // Get workflow configuration
  const workflowConfig = WORKFLOW_CONFIGS[uploadType] || WORKFLOW_CONFIGS.general;

  const getStatusIcon = (status: StepStatus) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'in-progress':
        return <Clock className="w-4 h-4 text-blue-500 animate-pulse" />;
      case 'ready':
        return <CheckCircle className="w-4 h-4 text-blue-500" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      default:
        return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  const getWorkflowSteps = () => {
    return workflowConfig.steps.map(stepConfig => ({
      id: stepConfig.id,
      title: stepConfig.title,
      description: stepConfig.getDescription(formData),
      icon: stepConfig.icon,
      status: stepStatuses[stepConfig.id] || 'pending',
      dependencies: stepConfig.getDependencies(),
      itemCount: stepConfig.id === 'images' ? (formData.files?.queue?.length || 0) : undefined
    }));
  };

  const workflowSteps = getWorkflowSteps();

  return (
    <div className="bg-card rounded-lg shadow-sm border border-border p-6 sticky top-6 h-fit">
      <h2 className="text-xl font-semibold text-card-foreground mb-4">Workflow Progress</h2>
      <div className="space-y-2">
        {workflowSteps.map((step) => {
          const isActive = activeTab === step.id;
          // Simplified access check - just check if all dependencies are finished
          const stepConfig = workflowConfig.steps.find(s => s.id === step.id);
          const canAccess = !stepConfig || stepConfig.getDependencies().every(depId => 
            workflowConfig.steps.find(s => s.id === depId)?.isFinished(formData) || false
          );
          
          const hasValues = stepConfig?.hasValues(formData) || false;
          const isFinished = stepConfig?.isFinished(formData) || false;
          
          return (
            <button
              key={step.id}
              onClick={() => handleStepClick(step.id as any)}
              disabled={!canAccess}
              className={`w-full flex items-center p-3 rounded-lg transition-all duration-200 ${
                isActive
                  ? 'bg-primary/10 border-2 border-primary shadow-sm'
                  : isFinished
                  ? 'bg-green-50 hover:bg-green-100 border border-green-200'
                  : hasValues
                  ? 'bg-yellow-50 hover:bg-yellow-100 border border-yellow-200'
                  : canAccess
                  ? 'bg-muted hover:bg-muted/80 border border-border'
                  : 'bg-muted/50 border border-border opacity-60 cursor-not-allowed'
              }`}
            >
              <div className="flex items-center min-w-0 flex-1">
                <div className="flex-shrink-0 mr-3">
                  {getStatusIcon(step.status)}
                </div>
                {step.icon && <step.icon className={`w-4 h-4 mr-2 flex-shrink-0 ${
                  isActive ? 'text-primary' : isFinished ? 'text-green-600' : hasValues ? 'text-yellow-600' : 'text-muted-foreground'
                }`} />}
                <div className="text-left min-w-0 flex-1">
                  <div className={`font-medium text-sm ${
                    isActive ? 'text-primary' : isFinished ? 'text-green-700' : hasValues ? 'text-yellow-700' : 'text-card-foreground'
                  }`}>
                    {step.title}
                    {step.itemCount !== undefined && ` (${step.itemCount})`}
                  </div>
                  <div className={`text-xs truncate ${
                    isFinished ? 'text-green-600' : hasValues ? 'text-yellow-600' : 'text-muted-foreground'
                  }`}>
                    {step.description}
                  </div>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}