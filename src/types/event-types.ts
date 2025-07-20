// Event type mappings for different workflows
export const WORKFLOW_EVENT_TYPES = {
  'music-event': ['festival', 'concert'] as const,
  'soccer-match': ['match'] as const, // Soccer doesn't need event type selection
  'portraits': ['session'] as const,
  'general-upload': ['upload'] as const,
  'custom': [] as const
} as const;

// Extract event types for each workflow
export type MusicEventType = typeof WORKFLOW_EVENT_TYPES['music-event'][number];
export type SoccerEventType = typeof WORKFLOW_EVENT_TYPES['soccer-match'][number];
export type PortraitEventType = typeof WORKFLOW_EVENT_TYPES['portraits'][number];
export type GeneralEventType = typeof WORKFLOW_EVENT_TYPES['general-upload'][number];

// Helper function to check if a workflow needs event type selection
export function needsEventTypeSelection(workflowType: string): boolean {
  return workflowType === 'music-event' && WORKFLOW_EVENT_TYPES['music-event'].length > 1;
}

// Get available event types for a workflow
export function getEventTypesForWorkflow(workflowType: keyof typeof WORKFLOW_EVENT_TYPES) {
  return WORKFLOW_EVENT_TYPES[workflowType] || [];
}