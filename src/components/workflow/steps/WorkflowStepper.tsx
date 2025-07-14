'use client';

import { CheckCircle, Clock, AlertCircle, Settings, Calendar, ImagePlus, FolderPlus, Database, Globe, Upload, FileText } from 'lucide-react';
import { useWorkflow, WorkflowStepInfo, StepStatus } from '../providers/WorkflowProvider';
import { useWorkflowForm } from '../providers/WorkflowFormProvider';

export default function WorkflowStepper() {
  const { activeTab, stepStatuses, canAccessStep, handleStepClick } = useWorkflow();
  const { form, images } = useWorkflowForm();
  const uploadType = form.watch('uploadType');

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
    
    // Add event-type step for music events
    if (uploadType === 'music') {
      baseSteps.push({
        id: 'event-type',
        title: 'Event Type',
        description: 'Choose event type',
        icon: Settings,
        status: stepStatuses['event-type']
      });
    }
    
    // Add event-details step for music and soccer events
    if (uploadType === 'music' || uploadType === 'soccer') {
      baseSteps.push({
        id: 'event-details',
        title: 'Event Details',
        description: 'Configure event information',
        icon: Calendar,
        status: stepStatuses['event-details'],
        dependencies: uploadType === 'music' ? ['event-type'] : []
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
        itemCount: images.length
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
          
          return (
            <button
              key={step.id}
              onClick={() => handleStepClick(step.id)}
              disabled={!canAccess}
              className={`w-full flex items-center p-3 rounded-lg transition-all duration-200 ${
                isActive
                  ? 'bg-primary/10 border-2 border-primary shadow-sm'
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
                  isActive ? 'text-primary' : 'text-muted-foreground'
                }`} />
                <div className="text-left min-w-0 flex-1">
                  <div className={`font-medium text-sm ${
                    isActive ? 'text-primary' : 'text-card-foreground'
                  }`}>
                    {step.title}
                    {step.itemCount !== undefined && ` (${step.itemCount})`}
                  </div>
                  <div className="text-xs text-muted-foreground truncate">
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