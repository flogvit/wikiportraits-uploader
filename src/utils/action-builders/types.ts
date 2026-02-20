import {
  CategoryAction,
  WikidataAction,
  ImageAction,
  StructuredDataAction,
} from '@/providers/PublishDataProvider';

/**
 * Form data shape expected by ActionBuilders.
 * Uses the UniversalFormData structure.
 */
export interface ActionBuilderFormData {
  workflowType?: string;
  isWikiPortraitsJob?: boolean;
  eventDetails?: {
    title?: string;
    date?: Date | string;
    type?: string;
    commonsCategory?: string;
    wikidataId?: string;
    [key: string]: any;
  };
  entities?: {
    people?: any[];
    organizations?: any[];
  };
  files?: {
    queue?: any[];
    existing?: any[];
  };
  computed?: any;
}

/**
 * Context passed to ActionBuilders with references needed for calculations.
 */
export interface ActionBuilderContext {
  /** Reference to original image states for diff tracking */
  originalImageStateRef: React.MutableRefObject<Map<string, {
    wikitext: string;
    selectedBandMembers: string[];
    captions: any[];
  }>>;
}

/**
 * Interface that all workflow-specific ActionBuilders implement.
 * Each method returns an array of self-contained actions ready for execution.
 */
export interface ActionBuilder {
  buildCategoryActions(formData: ActionBuilderFormData): Promise<CategoryAction[]>;
  buildWikidataActions(formData: ActionBuilderFormData): Promise<WikidataAction[]>;
  buildImageActions(formData: ActionBuilderFormData, context: ActionBuilderContext): Promise<ImageAction[]>;
  buildStructuredDataActions(formData: ActionBuilderFormData, context: ActionBuilderContext): Promise<StructuredDataAction[]>;
}
