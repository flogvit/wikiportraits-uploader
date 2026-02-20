'use client';

import { CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { useWorkflow, StepStatus } from '../providers/WorkflowProvider';
import { useUniversalForm } from '@/providers/UniversalFormProvider';
import { getWorkflowConfig } from '@/config/workflow-registry';

export default function WorkflowStepper() {
  const { activeTab, stepStatuses, handleStepClick } = useWorkflow();
  const { watch } = useUniversalForm();
  const workflowType = watch('workflowType');
  const uploadType = workflowType === 'music-event' ? 'music' : 'general';

  // Get all form data once
  const formData = watch();

  // Get workflow configuration from registry
  const workflowConfig = getWorkflowConfig(uploadType);

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

  const workflowSteps = workflowConfig.steps.map(stepConfig => {
    const canAccess = stepConfig.getDependencies().every(depId =>
      workflowConfig.steps.find(s => s.id === depId)?.isFinished(formData) || false
    );
    const hasValues = stepConfig.hasValues(formData);
    const isFinished = stepConfig.isFinished(formData);
    const isActive = activeTab === stepConfig.id;
    const status = stepStatuses[stepConfig.id] || 'pending';

    return {
      id: stepConfig.id,
      title: stepConfig.title,
      description: stepConfig.getDescription(formData),
      icon: stepConfig.icon,
      status,
      isActive,
      canAccess,
      hasValues,
      isFinished,
      itemCount: stepConfig.id === 'images'
        ? ((formData.files?.queue?.length || 0) + (formData.files?.existing?.length || 0))
        : undefined,
    };
  });

  return (
    <div className="bg-card rounded-lg p-6 sticky top-6 h-fit">
      <h2 className="text-xl font-semibold text-card-foreground mb-4">Workflow Progress</h2>
      <div className="space-y-2">
        {workflowSteps.map((step) => (
          <button
            key={step.id}
            onClick={() => handleStepClick(step.id)}
            disabled={!step.canAccess}
            className={`w-full flex items-center p-3 rounded-lg transition-all duration-200 ${
              step.isActive
                ? 'bg-primary/10 border-2 border-primary shadow-sm'
                : step.isFinished
                ? 'bg-green-50 hover:bg-green-100 border border-green-200'
                : step.hasValues
                ? 'bg-yellow-50 hover:bg-yellow-100 border border-yellow-200'
                : step.canAccess
                ? 'bg-muted hover:bg-muted/80 border border-border'
                : 'bg-muted/50 border border-border opacity-60 cursor-not-allowed'
            }`}
          >
            <div className="flex items-center min-w-0 flex-1">
              <div className="flex-shrink-0 mr-3">
                {getStatusIcon(step.status)}
              </div>
              {step.icon && <step.icon className={`w-4 h-4 mr-2 flex-shrink-0 ${
                step.isActive ? 'text-primary' : step.isFinished ? 'text-green-600' : step.hasValues ? 'text-yellow-600' : 'text-muted-foreground'
              }`} />}
              <div className="text-left min-w-0 flex-1">
                <div className={`font-medium text-sm ${
                  step.isActive ? 'text-primary' : step.isFinished ? 'text-green-700' : step.hasValues ? 'text-yellow-700' : 'text-card-foreground'
                }`}>
                  {step.title}
                  {step.itemCount !== undefined && step.itemCount > 0 && ` (${step.itemCount})`}
                </div>
                <div className={`text-xs truncate ${
                  step.isFinished ? 'text-green-600' : step.hasValues ? 'text-yellow-600' : 'text-muted-foreground'
                }`}>
                  {step.description}
                </div>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
