import { Music, Users, Tags, FileText, Upload, CheckCircle } from 'lucide-react';

// Music event workflow using UniversalFormData
export type MusicWorkflowStep = 'details' | 'performers' | 'categories' | 'templates' | 'files' | 'publish';

export interface StepConfig {
  id: MusicWorkflowStep;
  name: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  description: string;
}

export const MUSIC_WORKFLOW_STEPS: StepConfig[] = [
  {
    id: 'details',
    name: 'Event Details', 
    icon: Music,
    description: 'Basic event information - name, date, venue'
  },
  {
    id: 'performers', 
    name: 'Performers',
    icon: Users,
    description: 'Add bands, musicians, and performers'
  },
  {
    id: 'categories',
    name: 'Categories', 
    icon: Tags,
    description: 'Generate and select Wikimedia categories'
  },
  {
    id: 'templates',
    name: 'Templates',
    icon: FileText,
    description: 'Generate Commons templates and descriptions'
  },
  {
    id: 'files',
    name: 'Files',
    icon: Upload,
    description: 'Upload and manage image files'
  },
  {
    id: 'publish',
    name: 'Publish',
    icon: CheckCircle,
    description: 'Review and publish to Wikimedia'
  }
];