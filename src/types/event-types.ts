// Event type mappings for different workflows
export const WORKFLOW_EVENT_TYPES = {
  'music-event': ['festival', 'concert'] as const,
  'soccer-match': ['match'] as const,
  'portraits': ['session'] as const,
  'general-upload': ['upload'] as const,
  'awards-event': ['nobel-prize', 'oscars', 'grammys', 'golden-globes', 'emmys', 'other-award'] as const,
  'red-carpet-event': ['movie-premiere', 'fashion-show', 'gala', 'charity-event'] as const,
  'press-event': ['political-press', 'movie-junket', 'product-launch', 'corporate-press'] as const,
  'sports-event': ['soccer', 'olympics', 'tennis', 'basketball', 'motorsport', 'other-sport'] as const,
  'production-event': ['movie-shoot', 'tv-filming', 'behind-scenes', 'documentary'] as const,
  'political-event': ['rally', 'debate', 'summit', 'campaign', 'inauguration'] as const,
  'cultural-event': ['theatre', 'opera', 'art-exhibition', 'ballet', 'performance'] as const,
  'corporate-event': ['tech-conference', 'product-launch', 'shareholder-meeting', 'trade-show'] as const,
  'custom': [] as const
} as const;

// Extract event types for each workflow
export type MusicEventType = typeof WORKFLOW_EVENT_TYPES['music-event'][number];
export type SoccerEventType = typeof WORKFLOW_EVENT_TYPES['soccer-match'][number];
export type PortraitEventType = typeof WORKFLOW_EVENT_TYPES['portraits'][number];
export type GeneralEventType = typeof WORKFLOW_EVENT_TYPES['general-upload'][number];
export type AwardsEventType = typeof WORKFLOW_EVENT_TYPES['awards-event'][number];
export type RedCarpetEventType = typeof WORKFLOW_EVENT_TYPES['red-carpet-event'][number];
export type PressEventType = typeof WORKFLOW_EVENT_TYPES['press-event'][number];
export type SportsEventType = typeof WORKFLOW_EVENT_TYPES['sports-event'][number];
export type ProductionEventType = typeof WORKFLOW_EVENT_TYPES['production-event'][number];
export type PoliticalEventType = typeof WORKFLOW_EVENT_TYPES['political-event'][number];
export type CulturalEventType = typeof WORKFLOW_EVENT_TYPES['cultural-event'][number];
export type CorporateEventType = typeof WORKFLOW_EVENT_TYPES['corporate-event'][number];

// Helper function to check if a workflow needs event type selection
export function needsEventTypeSelection(workflowType: string): boolean {
  return workflowType === 'music-event' && WORKFLOW_EVENT_TYPES['music-event'].length > 1;
}

// Get available event types for a workflow
export function getEventTypesForWorkflow(workflowType: keyof typeof WORKFLOW_EVENT_TYPES) {
  return WORKFLOW_EVENT_TYPES[workflowType] || [];
}