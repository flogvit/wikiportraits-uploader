'use client';

import { WorkflowProvider } from '../providers/WorkflowProvider';
import WorkflowStepper from '../steps/WorkflowStepper';
import WorkflowStep from '../steps/WorkflowStep';

export default function PortraitsWorkflow() {
  return (
    <WorkflowProvider>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-8rem)]">
        {/* Workflow Progress - Left Panel */}
        <div className="lg:col-span-1">
          <WorkflowStepper />
        </div>

        {/* Active Step Content - Right Panel */}
        <div className="lg:col-span-2">
          <WorkflowStep />
        </div>
      </div>
    </WorkflowProvider>
  );
}