'use client';

import { CheckCircle, Clock, AlertCircle, Settings, Calendar, ImagePlus, FolderPlus, Database, Globe, Upload, FileText, Users, Camera } from 'lucide-react';
import { useWorkflow, WorkflowStepInfo, StepStatus } from '../providers/WorkflowProvider';
import { useWorkflowForm } from '../providers/WorkflowFormProvider';

export default function WorkflowStepper() {
  const { activeTab, stepStatuses, canAccessStep, handleStepClick } = useWorkflow();
  const { form, images } = useWorkflowForm();
  const uploadType = form.watch('uploadType');
  
  // Watch form values for styling
  const wikiPortraits = form.watch('wikiPortraits');
  const eventDetails = form.watch('eventDetails');
  const bandPerformers = form.watch('bandPerformers');
  const eventType = form.watch('eventType');

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

  const getWorkflowSteps = (): WorkflowStepInfo[] => {
    const baseSteps: WorkflowStepInfo[] = [];
    
    // Get current form values for dynamic descriptions
    const wikiPortraits = form.watch('wikiPortraits');
    const eventDetails = form.watch('eventDetails');
    const bandPerformers = form.watch('bandPerformers');
    const eventType = form.watch('eventType');
    
    // Always add WikiPortraits workflow step first
    const wikiPortraitsDesc = wikiPortraits?.isWikiPortraitsJob !== undefined 
      ? (wikiPortraits.isWikiPortraitsJob ? 'WikiPortraits Assignment' : 'Commons Upload')
      : 'Assignment or Commons upload';
    
    baseSteps.push({
      id: 'wiki-portraits',
      title: 'WikiPortraits',
      description: wikiPortraitsDesc,
      icon: Camera,
      status: stepStatuses['wiki-portraits']
    });
    
    // Add event-type step for music events
    if (uploadType === 'music') {
      const eventTypeDesc = eventType && eventType !== 'general'
        ? eventType.charAt(0).toUpperCase() + eventType.slice(1)
        : 'Choose event type';
      
      baseSteps.push({
        id: 'event-type',
        title: 'Event Type',
        description: eventTypeDesc,
        icon: Settings,
        status: stepStatuses['event-type']
      });
    }
    
    // Add event-details step for music and soccer events
    if (uploadType === 'music' || uploadType === 'soccer') {
      const eventDetailsDesc = eventDetails?.name && eventDetails?.year
        ? `${eventDetails.name} (${eventDetails.year})`
        : 'Configure event information';
      
      baseSteps.push({
        id: 'event-details',
        title: 'Event Details',
        description: eventDetailsDesc,
        icon: Calendar,
        status: stepStatuses['event-details'],
        dependencies: uploadType === 'music' ? ['event-type'] : []
      });
    }
    
    // Add band-performers step for music events
    if (uploadType === 'music') {
      const bandPerformersDesc = bandPerformers?.selectedBand?.name
        ? `${bandPerformers.selectedBand.name}${bandPerformers.performers?.length ? ` + ${bandPerformers.performers.length} performers` : ''}`
        : 'Select band and performers';
      
      baseSteps.push({
        id: 'band-performers',
        title: 'Band & Performers',
        description: bandPerformersDesc,
        icon: Users,
        status: stepStatuses['band-performers'],
        dependencies: ['event-details']
      });
    }
    
    // Add common steps
    baseSteps.push(
      {
        id: 'images',
        title: 'Images',
        description: 'Upload and manage images',
        icon: ImagePlus,
        status: stepStatuses.images,
        itemCount: images.length,
        dependencies: uploadType === 'music' ? ['band-performers'] : uploadType === 'soccer' ? ['event-details'] : []
      },
      {
        id: 'categories',
        title: 'Categories',
        description: 'Organize with categories',
        icon: FolderPlus,
        status: stepStatuses.categories,
        dependencies: ['images']
      },
      {
        id: 'templates',
        title: 'Templates',
        description: 'Apply Commons templates',
        icon: FileText,
        status: stepStatuses.templates,
        dependencies: ['categories']
      },
      {
        id: 'wikidata',
        title: 'Wikidata',
        description: 'Link to Wikidata',
        icon: Database,
        status: stepStatuses.wikidata,
        dependencies: ['templates']
      },
      {
        id: 'wikipedia',
        title: 'Wikipedia',
        description: 'Update Wikipedia articles',
        icon: Globe,
        status: stepStatuses.wikipedia,
        dependencies: ['wikidata']
      },
      {
        id: 'upload',
        title: 'Publish',
        description: 'Publish to Wikimedia Commons',
        icon: Upload,
        status: stepStatuses.upload,
        dependencies: ['wikipedia']
      }
    );
    
    return baseSteps;
  };

  const workflowSteps = getWorkflowSteps();

  return (
    <div className="bg-card rounded-lg shadow-sm border border-border p-6 sticky top-6 h-fit">
      <h2 className="text-xl font-semibold text-card-foreground mb-4">Workflow Progress</h2>
      <div className="space-y-2">
        {workflowSteps.map((step) => {
          const isActive = activeTab === step.id;
          const canAccess = canAccessStep(step);
          
          // Check if step has values set for different styling
          const hasValues = (() => {
            switch (step.id) {
              case 'wiki-portraits':
                return wikiPortraits?.isWikiPortraitsJob !== undefined;
              case 'event-type':
                return eventType && eventType !== 'general';
              case 'event-details':
                return eventDetails?.name && eventDetails?.year;
              case 'band-performers':
                return bandPerformers?.selectedBand?.name;
              default:
                return false;
            }
          })();
          
          return (
            <button
              key={step.id}
              onClick={() => handleStepClick(step.id)}
              disabled={!canAccess}
              className={`w-full flex items-center p-3 rounded-lg transition-all duration-200 ${
                isActive
                  ? 'bg-primary/10 border-2 border-primary shadow-sm'
                  : hasValues
                  ? 'bg-green-50 hover:bg-green-100 border border-green-200'
                  : canAccess
                  ? 'bg-muted hover:bg-muted/80 border border-border'
                  : 'bg-muted/50 border border-border opacity-60 cursor-not-allowed'
              }`}
            >
              <div className="flex items-center min-w-0 flex-1">
                <div className="flex-shrink-0 mr-3">
                  {getStatusIcon(step.status)}
                </div>
                <step.icon className={`w-4 h-4 mr-2 flex-shrink-0 ${
                  isActive ? 'text-primary' : hasValues ? 'text-green-600' : 'text-muted-foreground'
                }`} />
                <div className="text-left min-w-0 flex-1">
                  <div className={`font-medium text-sm ${
                    isActive ? 'text-primary' : hasValues ? 'text-green-700' : 'text-card-foreground'
                  }`}>
                    {step.title}
                    {step.itemCount !== undefined && ` (${step.itemCount})`}
                  </div>
                  <div className={`text-xs truncate ${
                    hasValues ? 'text-green-600' : 'text-muted-foreground'
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