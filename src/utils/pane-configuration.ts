import { WikidataEntity } from '../types/wikidata';

export type EntityType = string; // e.g., 'Q5' for person, 'Q215627' for person+band
export type PropertyCode = string; // e.g., 'P1303' for instruments, 'P413' for position

export interface ValidationRule {
  type: 'required' | 'optional' | 'conditional' | 'format' | 'range' | 'custom';
  property?: PropertyCode;
  message: string;
  condition?: (entity: WikidataEntity) => boolean;
  validator?: (value: any, entity: WikidataEntity) => boolean;
  params?: Record<string, any>;
}

export interface DisplayField {
  key: string;
  label: string;
  property?: PropertyCode;
  type: 'text' | 'date' | 'number' | 'entity' | 'image' | 'list' | 'boolean';
  required?: boolean;
  placeholder?: string;
  options?: Array<{ value: string; label: string }>;
  format?: (value: any) => string;
  parse?: (value: string) => any;
}

export interface CategoryRule {
  template: string; // e.g., 'Music festivals in {location}'
  source: string; // e.g., 'venue' or 'event.location'
  condition?: (data: Record<string, any>) => boolean;
  priority: number; // 1-10, higher is more important
  type: 'auto' | 'suggested' | 'required';
}

export interface PaneConfig {
  id: string;
  title: string;
  description: string;
  
  // Entity validation
  entityTypes: EntityType[];
  requiredProperties: PropertyCode[];
  optionalProperties: PropertyCode[];
  
  // Validation rules
  validationRules: ValidationRule[];
  
  // Display configuration
  displayFields: DisplayField[];
  
  // Category generation
  categoryRules: CategoryRule[];
  
  // Pane behavior
  allowMultiple?: boolean;
  allowNew?: boolean;
  allowEdit?: boolean;
  allowDelete?: boolean;
  
  // UI configuration
  layout?: 'grid' | 'list' | 'cards';
  sortBy?: string;
  filterBy?: string[];
  searchable?: boolean;
  
  // Integration
  dependencies?: string[]; // IDs of other panes this depends on
  provides?: string[]; // What this pane provides to other panes
}

export interface WorkflowConfig {
  id: string;
  title: string;
  description: string;
  
  // Pane composition
  panes: Array<{
    component: string;
    key: string;
    config: PaneConfig;
    required?: boolean;
    order?: number;
  }>;
  
  // Global configuration
  globalValidation?: ValidationRule[];
  globalCategories?: CategoryRule[];
  
  // Workflow behavior
  allowSave?: boolean;
  allowPublish?: boolean;
  allowCancel?: boolean;
  
  // Integration settings
  apis?: {
    wikidata?: boolean;
    wikipedia?: boolean;
    commons?: boolean;
  };
}

/**
 * Configuration factory for creating domain-specific pane configurations
 */
export class PaneConfigurationFactory {
  /**
   * Create a music event configuration
   */
  static createMusicEventConfig(): PaneConfig {
    return {
      id: 'music-event',
      title: 'Music Event Details',
      description: 'Configure music event information',
      
      entityTypes: ['Q132241', 'Q182832'], // Music festival, Concert
      requiredProperties: ['P585', 'P276'], // Point in time, Location
      optionalProperties: ['P175', 'P710', 'P136'], // Performer, Participant, Genre
      
      validationRules: [
        {
          type: 'required',
          property: 'P585',
          message: 'Event date is required'
        },
        {
          type: 'required',
          property: 'P276',
          message: 'Event location is required'
        },
        {
          type: 'conditional',
          property: 'P175',
          message: 'At least one performer is required for concerts',
          condition: (entity) => entity.claims?.['P31']?.some(c => c.mainsnak?.datavalue?.value.id === 'Q182832') ?? false
        }
      ],
      
      displayFields: [
        {
          key: 'name',
          label: 'Event Name',
          type: 'text',
          required: true,
          placeholder: 'Enter event name'
        },
        {
          key: 'date',
          label: 'Event Date',
          property: 'P585',
          type: 'date',
          required: true
        },
        {
          key: 'location',
          label: 'Location',
          property: 'P276',
          type: 'entity',
          required: true
        },
        {
          key: 'performers',
          label: 'Performers',
          property: 'P175',
          type: 'list',
          required: false
        }
      ],
      
      categoryRules: [
        {
          template: 'Music festivals in {location}',
          source: 'location',
          priority: 8,
          type: 'auto'
        },
        {
          template: '{year} in music',
          source: 'date',
          priority: 7,
          type: 'auto'
        },
        {
          template: '{performer} concerts',
          source: 'performers',
          priority: 6,
          type: 'suggested'
        }
      ],
      
      allowMultiple: false,
      allowNew: true,
      allowEdit: true,
      allowDelete: true,
      
      layout: 'cards',
      searchable: true,
      
      dependencies: ['images', 'categories'],
      provides: ['musicDetails']
    };
  }

  /**
   * Create a soccer event configuration
   */
  static createSoccerEventConfig(): PaneConfig {
    return {
      id: 'soccer-event',
      title: 'Soccer Match Details',
      description: 'Configure soccer match information',
      
      entityTypes: ['Q16466'], // Soccer match
      requiredProperties: ['P585', 'P276', 'P1923', 'P1924'], // Date, Location, Home team, Away team
      optionalProperties: ['P710', 'P1351'], // Participant, Score
      
      validationRules: [
        {
          type: 'required',
          property: 'P585',
          message: 'Match date is required'
        },
        {
          type: 'required',
          property: 'P1923',
          message: 'Home team is required'
        },
        {
          type: 'required',
          property: 'P1924',
          message: 'Away team is required'
        },
        {
          type: 'custom',
          message: 'Home and away teams must be different',
          validator: (value, entity) => {
            const homeTeam = entity.claims?.['P1923']?.[0]?.mainsnak?.datavalue?.value?.id;
            const awayTeam = entity.claims?.['P1924']?.[0]?.mainsnak?.datavalue?.value?.id;
            return homeTeam !== awayTeam;
          }
        }
      ],
      
      displayFields: [
        {
          key: 'homeTeam',
          label: 'Home Team',
          property: 'P1923',
          type: 'entity',
          required: true
        },
        {
          key: 'awayTeam',
          label: 'Away Team',
          property: 'P1924',
          type: 'entity',
          required: true
        },
        {
          key: 'date',
          label: 'Match Date',
          property: 'P585',
          type: 'date',
          required: true
        },
        {
          key: 'venue',
          label: 'Venue',
          property: 'P276',
          type: 'entity',
          required: true
        },
        {
          key: 'players',
          label: 'Players',
          property: 'P710',
          type: 'list',
          required: false
        }
      ],
      
      categoryRules: [
        {
          template: '{homeTeam} vs {awayTeam}',
          source: 'teams',
          priority: 9,
          type: 'auto'
        },
        {
          template: 'Football matches in {location}',
          source: 'venue',
          priority: 7,
          type: 'auto'
        },
        {
          template: '{year} football matches',
          source: 'date',
          priority: 6,
          type: 'auto'
        }
      ],
      
      allowMultiple: false,
      allowNew: true,
      allowEdit: true,
      allowDelete: true,
      
      layout: 'cards',
      searchable: true,
      
      dependencies: ['images', 'categories'],
      provides: ['soccerDetails']
    };
  }

  /**
   * Create a person configuration (universal for musicians, athletes, etc.)
   */
  static createPersonConfig(): PaneConfig {
    return {
      id: 'person',
      title: 'Person Details',
      description: 'Configure person information',
      
      entityTypes: ['Q5'], // Human
      requiredProperties: [], // No required properties - very flexible
      optionalProperties: ['P1303', 'P413', 'P106', 'P569', 'P27', 'P18'], // Instruments, Position, Occupation, Birth, Nationality, Image
      
      validationRules: [
        {
          type: 'conditional',
          property: 'P1303',
          message: 'Musicians should have at least one instrument',
          condition: (entity) => entity.claims?.['P106']?.some(c =>
            ['Q639669', 'Q177220', 'Q36834'].includes(c.mainsnak?.datavalue?.value.id) // Musician, Singer, Composer
          ) ?? false
        },
        {
          type: 'conditional',
          property: 'P413',
          message: 'Athletes should have a position',
          condition: (entity) => entity.claims?.['P106']?.some(c =>
            ['Q937857', 'Q10833314'].includes(c.mainsnak?.datavalue?.value.id) // Athlete, Soccer player
          ) ?? false
        }
      ],
      
      displayFields: [
        {
          key: 'name',
          label: 'Name',
          type: 'text',
          required: true,
          placeholder: 'Enter person name'
        },
        {
          key: 'occupation',
          label: 'Occupation',
          property: 'P106',
          type: 'entity',
          required: false
        },
        {
          key: 'birthDate',
          label: 'Birth Date',
          property: 'P569',
          type: 'date',
          required: false
        },
        {
          key: 'nationality',
          label: 'Nationality',
          property: 'P27',
          type: 'entity',
          required: false
        },
        {
          key: 'image',
          label: 'Image',
          property: 'P18',
          type: 'image',
          required: false
        }
      ],
      
      categoryRules: [
        {
          template: '{nationality} musicians',
          source: 'nationality',
          condition: (data) => data.occupation?.includes('musician'),
          priority: 7,
          type: 'suggested'
        },
        {
          template: '{nationality} footballers',
          source: 'nationality',
          condition: (data) => data.occupation?.includes('footballer'),
          priority: 7,
          type: 'suggested'
        }
      ],
      
      allowMultiple: true,
      allowNew: true,
      allowEdit: true,
      allowDelete: true,
      
      layout: 'cards',
      searchable: true,
      sortBy: 'name',
      filterBy: ['occupation', 'nationality'],
      
      provides: ['persons']
    };
  }

  /**
   * Create a universal categories configuration
   */
  static createCategoriesConfig(): PaneConfig {
    return {
      id: 'categories',
      title: 'Categories',
      description: 'Manage categories for the upload',
      
      entityTypes: [], // No specific entity types - works with any data
      requiredProperties: [],
      optionalProperties: [],
      
      validationRules: [
        {
          type: 'custom',
          message: 'At least one category is required',
          validator: (value) => Array.isArray(value) && value.length > 0
        },
        {
          type: 'format',
          message: 'Category names must be valid Commons category format',
          validator: (value) => {
            if (!Array.isArray(value)) return false;
            return value.every(cat => 
              typeof cat === 'string' && 
              cat.length > 0 && 
              !cat.includes('[') && 
              !cat.includes(']')
            );
          }
        }
      ],
      
      displayFields: [
        {
          key: 'categories',
          label: 'Categories',
          type: 'list',
          required: true,
          placeholder: 'Add categories...'
        },
        {
          key: 'autoGenerate',
          label: 'Auto-generate categories',
          type: 'boolean',
          required: false
        }
      ],
      
      categoryRules: [], // Categories pane doesn't generate its own categories
      
      allowMultiple: false,
      allowNew: false,
      allowEdit: true,
      allowDelete: false,
      
      layout: 'list',
      searchable: true,
      
      dependencies: ['musicDetails', 'soccerDetails', 'persons'],
      provides: ['categories']
    };
  }

  /**
   * Create a universal images configuration
   */
  static createImagesConfig(): PaneConfig {
    return {
      id: 'images',
      title: 'Images',
      description: 'Manage images for upload',
      
      entityTypes: [], // No specific entity types
      requiredProperties: [],
      optionalProperties: [],
      
      validationRules: [
        {
          type: 'custom',
          message: 'At least one image is required',
          validator: (value) => Array.isArray(value) && value.length > 0
        },
        {
          type: 'format',
          message: 'Images must be valid file types (jpg, png, gif, svg)',
          validator: (value) => {
            if (!Array.isArray(value)) return false;
            return value.every(file => 
              file.type && ['image/jpeg', 'image/png', 'image/gif', 'image/svg+xml'].includes(file.type)
            );
          }
        }
      ],
      
      displayFields: [
        {
          key: 'files',
          label: 'Image Files',
          type: 'list',
          required: true
        },
        {
          key: 'description',
          label: 'Description Template',
          type: 'text',
          required: false,
          placeholder: 'Image description template'
        }
      ],
      
      categoryRules: [], // Images pane doesn't generate categories
      
      allowMultiple: false,
      allowNew: false,
      allowEdit: true,
      allowDelete: false,
      
      layout: 'grid',
      searchable: false,
      
      provides: ['images']
    };
  }
}

/**
 * Configuration validator
 */
export class ConfigurationValidator {
  /**
   * Validate a pane configuration
   */
  static validatePaneConfig(config: PaneConfig): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Required fields
    if (!config.id) errors.push('Pane ID is required');
    if (!config.title) errors.push('Pane title is required');
    if (!config.displayFields || config.displayFields.length === 0) {
      errors.push('At least one display field is required');
    }

    // Validate display fields
    config.displayFields.forEach((field, index) => {
      if (!field.key) errors.push(`Display field ${index} is missing key`);
      if (!field.label) errors.push(`Display field ${index} is missing label`);
      if (!field.type) errors.push(`Display field ${index} is missing type`);
    });

    // Validate validation rules
    config.validationRules.forEach((rule, index) => {
      if (!rule.type) errors.push(`Validation rule ${index} is missing type`);
      if (!rule.message) errors.push(`Validation rule ${index} is missing message`);
      if (rule.type === 'custom' && !rule.validator) {
        errors.push(`Custom validation rule ${index} is missing validator function`);
      }
    });

    // Validate category rules
    config.categoryRules.forEach((rule, index) => {
      if (!rule.template) errors.push(`Category rule ${index} is missing template`);
      if (!rule.source) errors.push(`Category rule ${index} is missing source`);
      if (typeof rule.priority !== 'number') errors.push(`Category rule ${index} is missing priority`);
    });

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate a workflow configuration
   */
  static validateWorkflowConfig(config: WorkflowConfig): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Required fields
    if (!config.id) errors.push('Workflow ID is required');
    if (!config.title) errors.push('Workflow title is required');
    if (!config.panes || config.panes.length === 0) {
      errors.push('At least one pane is required');
    }

    // Validate panes
    config.panes.forEach((pane, index) => {
      if (!pane.component) errors.push(`Pane ${index} is missing component`);
      if (!pane.key) errors.push(`Pane ${index} is missing key`);
      if (!pane.config) errors.push(`Pane ${index} is missing config`);
      
      // Validate pane config
      if (pane.config) {
        const paneValidation = this.validatePaneConfig(pane.config);
        if (!paneValidation.valid) {
          errors.push(`Pane ${index} config errors: ${paneValidation.errors.join(', ')}`);
        }
      }
    });

    return {
      valid: errors.length === 0,
      errors
    };
  }
}

/**
 * Configuration utilities
 */
export class ConfigurationUtils {
  /**
   * Merge multiple pane configurations
   */
  static mergePaneConfigs(configs: PaneConfig[]): PaneConfig {
    const merged: PaneConfig = {
      id: 'merged',
      title: 'Merged Configuration',
      description: 'Merged from multiple configurations',
      entityTypes: [],
      requiredProperties: [],
      optionalProperties: [],
      validationRules: [],
      displayFields: [],
      categoryRules: []
    };

    configs.forEach(config => {
      merged.entityTypes.push(...config.entityTypes);
      merged.requiredProperties.push(...config.requiredProperties);
      merged.optionalProperties.push(...config.optionalProperties);
      merged.validationRules.push(...config.validationRules);
      merged.displayFields.push(...config.displayFields);
      merged.categoryRules.push(...config.categoryRules);
    });

    // Deduplicate arrays
    merged.entityTypes = [...new Set(merged.entityTypes)];
    merged.requiredProperties = [...new Set(merged.requiredProperties)];
    merged.optionalProperties = [...new Set(merged.optionalProperties)];

    return merged;
  }

  /**
   * Create a workflow configuration from pane configurations
   */
  static createWorkflowConfig(
    id: string,
    title: string,
    paneConfigs: Array<{ component: string; key: string; config: PaneConfig }>
  ): WorkflowConfig {
    return {
      id,
      title,
      description: `Workflow with ${paneConfigs.length} panes`,
      panes: paneConfigs.map((pane, index) => ({
        ...pane,
        order: index,
        required: true
      })),
      allowSave: true,
      allowPublish: true,
      allowCancel: true,
      apis: {
        wikidata: true,
        wikipedia: true,
        commons: true
      }
    };
  }

  /**
   * Extract category rules from all panes in a workflow
   */
  static extractCategoryRules(workflowConfig: WorkflowConfig): CategoryRule[] {
    const rules: CategoryRule[] = [];
    
    workflowConfig.panes.forEach(pane => {
      rules.push(...pane.config.categoryRules);
    });

    if (workflowConfig.globalCategories) {
      rules.push(...workflowConfig.globalCategories);
    }

    // Sort by priority (highest first)
    return rules.sort((a, b) => b.priority - a.priority);
  }

  /**
   * Extract validation rules from all panes in a workflow
   */
  static extractValidationRules(workflowConfig: WorkflowConfig): ValidationRule[] {
    const rules: ValidationRule[] = [];
    
    workflowConfig.panes.forEach(pane => {
      rules.push(...pane.config.validationRules);
    });

    if (workflowConfig.globalValidation) {
      rules.push(...workflowConfig.globalValidation);
    }

    return rules;
  }
}

export default PaneConfigurationFactory;