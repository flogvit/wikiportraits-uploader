'use client';

import { Suspense } from 'react';
import { Loader2 } from 'lucide-react';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { useWorkflow } from '../providers/WorkflowProvider';
import { useUniversalForm } from '@/providers/UniversalFormProvider';
import { getWorkflowConfig } from '@/config/workflow-registry';

function StepLoadingFallback() {
  return (
    <div className="flex items-center justify-center py-12">
      <Loader2 className="w-8 h-8 text-primary animate-spin" />
      <span className="ml-3 text-muted-foreground">Loading...</span>
    </div>
  );
}

export default function WorkflowStep() {
  const { watch } = useUniversalForm();
  const workflowType = watch('workflowType');
  const uploadType = workflowType === 'music-event' ? 'music' : 'general';

  const { activeTab, handleStepComplete } = useWorkflow();

  // Get the workflow config and find the active step
  const workflowConfig = getWorkflowConfig(uploadType);
  const currentStep = workflowConfig.steps.find(s => s.id === activeTab);

  if (!currentStep) {
    return <div>Select a step to continue</div>;
  }

  const StepComponent = currentStep.component;

  return (
    <div className="bg-card rounded-lg p-6">
      <div className="space-y-6">
        <ErrorBoundary name={activeTab}>
          <Suspense fallback={<StepLoadingFallback />}>
            <StepComponent onComplete={() => handleStepComplete(activeTab)} />
          </Suspense>
        </ErrorBoundary>
      </div>
    </div>
  );
}
