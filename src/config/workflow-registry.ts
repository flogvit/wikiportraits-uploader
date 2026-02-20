import { lazy, ComponentType, LazyExoticComponent } from 'react';
import { Camera, FileImage, Settings, Calendar, Users, ImagePlus, FolderPlus, Database, Upload } from 'lucide-react';

// Common interface for all pane components
export interface PaneProps {
  onComplete?: () => void;
}

// Step configuration with component reference
export interface StepConfig {
  id: string;
  title: string;
  icon: ComponentType<any>;
  component: LazyExoticComponent<ComponentType<PaneProps>>;
  getDescription: (formData: any) => string;
  getDependencies: () => string[];
  hasValues: (formData: any) => boolean;
  isFinished: (formData: any) => boolean;
}

export interface WorkflowDefinition {
  id: string;
  title: string;
  steps: StepConfig[];
}

// ============================================================
// Lazy-loaded pane components
// ============================================================

const WikiPortraitsPane = lazy(() => import('@/components/workflow/panes/WikiPortraitsPane'));
const UploadTypePane = lazy(() => import('@/components/workflow/panes/UploadTypePane'));
const EventTypePane = lazy(() => import('@/components/workflow/panes/EventTypePane'));
const EventDetailsPane = lazy(() => import('@/components/workflow/panes/EventDetailsPane'));
const BandPerformersPane = lazy(() => import('@/components/workflow/panes/BandPerformersPane'));
const ImagesPane = lazy(() => import('@/components/workflow/panes/ImagesPane'));
const CategoriesPane = lazy(() => import('@/components/workflow/panes/CategoriesPane'));
const WikidataPane = lazy(() => import('@/components/workflow/panes/WikidataPane'));
const PublishPane = lazy(() => import('@/components/workflow/panes/PublishPane'));

// ============================================================
// Shared step definitions (reusable across workflows)
// ============================================================

export const sharedSteps = {
  wikiPortraits: {
    id: 'wiki-portraits',
    title: 'WikiPortraits',
    icon: Camera,
    component: WikiPortraitsPane,
    getDescription: (formData: any) => {
      const isWikiPortraitsJob = formData.isWikiPortraitsJob;
      return isWikiPortraitsJob === true
        ? 'WikiPortraits Assignment'
        : isWikiPortraitsJob === false
        ? 'Wikimedia Commons'
        : 'Select workflow type';
    },
    getDependencies: () => [],
    hasValues: (formData: any) => formData.isWikiPortraitsJob !== undefined,
    isFinished: (formData: any) => formData.isWikiPortraitsJob !== undefined,
  } satisfies StepConfig,

  uploadType: {
    id: 'upload-type',
    title: 'Upload Type',
    icon: FileImage,
    component: UploadTypePane,
    getDescription: (formData: any) => {
      const workflowType = formData.workflowType;
      if (workflowType === 'music-event') return 'Music Event';
      if (workflowType === 'soccer-match') return 'Soccer Match';
      if (workflowType === 'portrait-session') return 'Portrait Session';
      if (workflowType === 'general-upload') return 'General Upload';
      return 'Choose upload type';
    },
    getDependencies: () => ['wiki-portraits'],
    hasValues: (formData: any) => formData.workflowType !== undefined,
    isFinished: (formData: any) => formData.workflowType !== undefined,
  } satisfies StepConfig,

  images: {
    id: 'images',
    title: 'Images',
    icon: ImagePlus,
    component: ImagesPane,
    getDescription: (formData: any) => {
      const newCount = formData.files?.queue?.length || 0;
      const existingCount = formData.files?.existing?.length || 0;
      const totalCount = newCount + existingCount;
      if (totalCount === 0) return 'Upload and manage images';
      if (existingCount > 0 && newCount > 0) {
        return `${totalCount} images (${newCount} new, ${existingCount} from Commons)`;
      }
      if (existingCount > 0) {
        return `${existingCount} images from Commons`;
      }
      return `${newCount} images`;
    },
    getDependencies: () => ['band-performers'],
    hasValues: (formData: any) => {
      const newCount = formData.files?.queue?.length || 0;
      const existingCount = formData.files?.existing?.length || 0;
      return (newCount + existingCount) > 0;
    },
    isFinished: (formData: any) => {
      const newCount = formData.files?.queue?.length || 0;
      const existingCount = formData.files?.existing?.length || 0;
      const totalCount = newCount + existingCount;
      if (totalCount === 0) return false;
      if (newCount > 0) {
        return formData.files?.queue?.every((file: any) => file.metadata?.description);
      }
      return true;
    },
  } satisfies StepConfig,

  categories: {
    id: 'categories',
    title: 'Categories',
    icon: FolderPlus,
    component: CategoriesPane,
    getDescription: (formData: any) => {
      const allCategories = formData.computed?.categories?.all || [];
      return allCategories.length > 0 ? `${allCategories.length} categories` : 'Organize with categories';
    },
    getDependencies: () => ['event-details'],
    hasValues: (formData: any) => {
      const allCategories = formData.computed?.categories?.all || [];
      return allCategories.length > 0;
    },
    isFinished: (formData: any) => {
      const allCategories = formData.computed?.categories?.all || [];
      return allCategories.length > 0;
    },
  } satisfies StepConfig,

  publish: {
    id: 'upload',
    title: 'Publish',
    icon: Upload,
    component: PublishPane,
    getDescription: (formData: any) => {
      const pendingActions = formData.computed?.publish?.pendingActions || 0;
      const completedActions = formData.computed?.publish?.completedActions || 0;
      const totalActions = formData.computed?.publish?.totalActions || 0;
      if (totalActions === 0) return 'Publish to Wikimedia Commons';
      if (completedActions === totalActions) return `All ${totalActions} actions completed`;
      if (completedActions > 0) return `${completedActions}/${totalActions} actions completed`;
      return `${pendingActions} pending actions`;
    },
    getDependencies: () => ['event-details'],
    hasValues: (formData: any) => {
      const pendingActions = formData.computed?.publish?.pendingActions || 0;
      return pendingActions > 0;
    },
    isFinished: (formData: any) => {
      const totalActions = formData.computed?.publish?.totalActions || 0;
      const completedActions = formData.computed?.publish?.completedActions || 0;
      return totalActions > 0 && completedActions === totalActions;
    },
  } satisfies StepConfig,
};

// ============================================================
// Workflow definitions
// ============================================================

export const musicWorkflow: WorkflowDefinition = {
  id: 'music',
  title: 'Music Event',
  steps: [
    sharedSteps.wikiPortraits,
    sharedSteps.uploadType,
    {
      id: 'event-type',
      title: 'Event Type',
      icon: Settings,
      component: EventTypePane,
      getDescription: (formData) => {
        const selectedEventType = formData.eventDetails?.type;
        return selectedEventType
          ? selectedEventType.charAt(0).toUpperCase() + selectedEventType.slice(1)
          : 'Choose event type';
      },
      getDependencies: () => ['wiki-portraits'],
      hasValues: (formData) => formData.eventDetails?.type !== undefined,
      isFinished: (formData) => formData.eventDetails?.type !== undefined,
    },
    {
      id: 'event-details',
      title: 'Event Details',
      icon: Calendar,
      component: EventDetailsPane,
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
      isFinished: (formData) => formData.eventDetails?.title && formData.eventDetails?.date,
    },
    {
      id: 'band-performers',
      title: 'Band & Performers',
      icon: Users,
      component: BandPerformersPane,
      getDescription: (formData) => {
        const performers = formData.entities?.people || [];
        return performers.length > 0 ? `${performers.length} performer(s)` : 'Select band and performers';
      },
      getDependencies: () => ['event-details'],
      hasValues: (formData) => (formData.entities?.people?.length || 0) > 0,
      isFinished: (formData) => (formData.entities?.people?.length || 0) > 0,
    },
    {
      ...sharedSteps.images,
      getDependencies: () => ['band-performers'],
    },
    {
      ...sharedSteps.categories,
      getDependencies: () => ['event-details'],
    },
    {
      id: 'wikidata',
      title: 'Wikidata',
      icon: Database,
      component: WikidataPane,
      getDescription: (formData) => {
        const entityCount = formData.computed?.wikidata?.entityCount || 0;
        return entityCount > 0 ? `${entityCount} entities` : 'Link to Wikidata';
      },
      getDependencies: () => ['event-details'],
      hasValues: (formData) => {
        const hasEventDetails = !!formData.eventDetails?.title;
        const hasEntities = (formData.entities?.people?.length || 0) > 0 ||
                           (formData.entities?.organizations?.length || 0) > 0;
        return hasEventDetails || hasEntities;
      },
      isFinished: (formData) => {
        const hasData = !!formData.eventDetails?.title ||
                       (formData.entities?.people?.length || 0) > 0 ||
                       (formData.entities?.organizations?.length || 0) > 0;
        return hasData;
      },
    },
    {
      ...sharedSteps.publish,
      getDependencies: () => ['event-details'],
    },
  ],
};

export const generalWorkflow: WorkflowDefinition = {
  id: 'general',
  title: 'General Upload',
  steps: [
    sharedSteps.wikiPortraits,
    sharedSteps.uploadType,
    {
      ...sharedSteps.images,
      getDescription: () => 'Upload and manage images',
      getDependencies: () => ['wiki-portraits'],
      isFinished: (formData: any) =>
        (formData.files?.queue?.length || 0) > 0 &&
        formData.files?.queue?.every((file: any) => file.metadata?.description),
    },
    {
      ...sharedSteps.publish,
      getDependencies: () => ['images'],
    },
  ],
};

// ============================================================
// Workflow registry
// ============================================================

const workflowRegistry: Record<string, WorkflowDefinition> = {
  music: musicWorkflow,
  general: generalWorkflow,
};

export function getWorkflowConfig(workflowType: string): WorkflowDefinition {
  return workflowRegistry[workflowType] || generalWorkflow;
}

export function registerWorkflow(id: string, definition: WorkflowDefinition): void {
  workflowRegistry[id] = definition;
}
