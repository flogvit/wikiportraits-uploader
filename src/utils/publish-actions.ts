import { WikidataEntity, WorkflowItem } from '../types/wikidata';

// Simplified property change type since we removed change-tracking
export interface PropertyChange {
  path: string[];
  property: string;
  changeType: 'added' | 'removed' | 'modified' | 'unchanged';
  oldValue: any;
  newValue: any;
  confidence: number;
  impact: 'low' | 'medium' | 'high';
  description: string;
}

export type PublishActionType = 
  | 'create-entity'
  | 'update-entity'
  | 'create-claim'
  | 'update-claim'
  | 'remove-claim'
  | 'create-sitelink'
  | 'update-sitelink'
  | 'remove-sitelink'
  | 'upload-file'
  | 'create-category'
  | 'update-wikipedia';

export type PublishActionStatus = 'pending' | 'in_progress' | 'completed' | 'failed' | 'cancelled';

export interface PublishAction {
  id: string;
  type: PublishActionType;
  title: string;
  description: string;
  entityId?: string;
  entityLabel?: string;
  
  // Action-specific data
  data: {
    entity?: WikidataEntity;
    property?: string;
    value?: any;
    change?: PropertyChange;
    fileData?: any;
    wikiText?: string;
    [key: string]: any;
  };
  
  // Status and progress
  status: PublishActionStatus;
  progress: number; // 0-100
  error?: string;
  
  // Dependencies
  dependsOn?: string[]; // IDs of actions this depends on
  blockedBy?: string[]; // IDs of actions blocking this one
  
  // Metadata
  priority: number; // 1-10, higher is more important
  estimatedTime?: number; // seconds
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
}

export interface PublishActionGroup {
  id: string;
  title: string;
  description: string;
  actions: PublishAction[];
  status: PublishActionStatus;
  progress: number;
  canExecute: boolean;
  createdAt: Date;
}

export interface PublishPlan {
  id: string;
  title: string;
  description: string;
  groups: PublishActionGroup[];
  actions: PublishAction[];
  totalActions: number;
  completedActions: number;
  failedActions: number;
  progress: number;
  estimatedTime: number;
  status: PublishActionStatus;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Publish Action Builder - Creates actions from WorkflowItems and changes
 */
export class PublishActionBuilder {
  private actions: PublishAction[] = [];
  private actionCounter = 0;

  /**
   * Generate a unique action ID
   */
  private generateId(): string {
    return `action_${Date.now()}_${++this.actionCounter}`;
  }

  /**
   * Create actions from a WorkflowItem's changes
   */
  createActionsFromWorkflowItem(workflowItem: WorkflowItem<WikidataEntity>): PublishAction[] {
    const actions: PublishAction[] = [];
    
    if (workflowItem.new) {
      // New entity - create entity action
      actions.push(this.createEntityAction(workflowItem));
    } else if (workflowItem.dirty) {
      // Existing entity - create update actions
      actions.push(...this.createUpdateActions(workflowItem));
    }

    return actions;
  }

  /**
   * Create action for new entity
   */
  private createEntityAction(workflowItem: WorkflowItem<WikidataEntity>): PublishAction {
    const entity = workflowItem.data;
    const label = entity.labels?.en?.value || entity.id;

    return {
      id: this.generateId(),
      type: 'create-entity',
      title: `Create new entity: ${label}`,
      description: `Create a new Wikidata entity with label "${label}"`,
      entityId: entity.id,
      entityLabel: label,
      data: {
        entity,
        labels: entity.labels,
        descriptions: entity.descriptions,
        claims: entity.claims
      },
      status: 'pending',
      progress: 0,
      priority: 8,
      estimatedTime: 30,
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }

  /**
   * Create update actions for existing entity
   */
  private createUpdateActions(workflowItem: WorkflowItem<WikidataEntity>): PublishAction[] {
    const actions: PublishAction[] = [];
    const entity = workflowItem.data;
    const label = entity.labels?.en?.value || entity.id;

    // Group changes by type
    const labelChanges = this.findLabelChanges(workflowItem);
    const descriptionChanges = this.findDescriptionChanges(workflowItem);
    const claimChanges = this.findClaimChanges(workflowItem);
    const sitelinkChanges = this.findSitelinkChanges(workflowItem);

    // Create actions for each type of change
    if (labelChanges.length > 0) {
      actions.push({
        id: this.generateId(),
        type: 'update-entity',
        title: `Update labels for ${label}`,
        description: `Update ${labelChanges.length} label(s)`,
        entityId: entity.id,
        entityLabel: label,
        data: {
          entity,
          changes: labelChanges,
          labels: entity.labels
        },
        status: 'pending',
        progress: 0,
        priority: 7,
        estimatedTime: 15,
        createdAt: new Date(),
        updatedAt: new Date()
      });
    }

    if (descriptionChanges.length > 0) {
      actions.push({
        id: this.generateId(),
        type: 'update-entity',
        title: `Update descriptions for ${label}`,
        description: `Update ${descriptionChanges.length} description(s)`,
        entityId: entity.id,
        entityLabel: label,
        data: {
          entity,
          changes: descriptionChanges,
          descriptions: entity.descriptions
        },
        status: 'pending',
        progress: 0,
        priority: 6,
        estimatedTime: 15,
        createdAt: new Date(),
        updatedAt: new Date()
      });
    }

    // Create individual claim actions
    claimChanges.forEach(change => {
      actions.push({
        id: this.generateId(),
        type: change.changeType === 'added' ? 'create-claim' : 
              change.changeType === 'removed' ? 'remove-claim' : 'update-claim',
        title: `${change.changeType === 'added' ? 'Add' : 
                change.changeType === 'removed' ? 'Remove' : 'Update'} ${change.property}`,
        description: change.description,
        entityId: entity.id,
        entityLabel: label,
        data: {
          entity,
          property: change.property,
          change,
          oldValue: change.oldValue,
          newValue: change.newValue
        },
        status: 'pending',
        progress: 0,
        priority: change.impact === 'high' ? 9 : change.impact === 'medium' ? 7 : 5,
        estimatedTime: 20,
        createdAt: new Date(),
        updatedAt: new Date()
      });
    });

    // Create sitelink actions
    sitelinkChanges.forEach(change => {
      actions.push({
        id: this.generateId(),
        type: change.changeType === 'added' ? 'create-sitelink' : 
              change.changeType === 'removed' ? 'remove-sitelink' : 'update-sitelink',
        title: `${change.changeType === 'added' ? 'Add' : 
                change.changeType === 'removed' ? 'Remove' : 'Update'} ${change.property}`,
        description: change.description,
        entityId: entity.id,
        entityLabel: label,
        data: {
          entity,
          site: change.property.replace('sitelinks.', ''),
          change,
          oldValue: change.oldValue,
          newValue: change.newValue
        },
        status: 'pending',
        progress: 0,
        priority: change.property === 'sitelinks.enwiki' ? 8 : 6,
        estimatedTime: 10,
        createdAt: new Date(),
        updatedAt: new Date()
      });
    });

    return actions;
  }

  /**
   * Create action for file upload
   */
  createFileUploadAction(
    fileName: string,
    fileData: any,
    description: string,
    categories: string[]
  ): PublishAction {
    return {
      id: this.generateId(),
      type: 'upload-file',
      title: `Upload file: ${fileName}`,
      description: `Upload "${fileName}" to Wikimedia Commons`,
      data: {
        fileName,
        fileData,
        description,
        categories,
        wikiText: this.generateFileWikiText(fileName, description, categories)
      },
      status: 'pending',
      progress: 0,
      priority: 9,
      estimatedTime: 60,
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }

  /**
   * Create action for category creation
   */
  createCategoryAction(categoryName: string, parentCategories: string[]): PublishAction {
    return {
      id: this.generateId(),
      type: 'create-category',
      title: `Create category: ${categoryName}`,
      description: `Create Commons category "${categoryName}"`,
      data: {
        categoryName,
        parentCategories,
        wikiText: this.generateCategoryWikiText(categoryName, parentCategories)
      },
      status: 'pending',
      progress: 0,
      priority: 5,
      estimatedTime: 20,
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }

  /**
   * Create action for Wikipedia update
   */
  createWikipediaUpdateAction(
    pageTitle: string,
    section: string,
    content: string,
    summary: string
  ): PublishAction {
    return {
      id: this.generateId(),
      type: 'update-wikipedia',
      title: `Update Wikipedia: ${pageTitle}`,
      description: `Update ${section} section of "${pageTitle}"`,
      data: {
        pageTitle,
        section,
        content,
        summary,
        wikiText: content
      },
      status: 'pending',
      progress: 0,
      priority: 7,
      estimatedTime: 25,
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }

  /**
   * Build a complete publish plan from multiple workflow items
   */
  buildPublishPlan(
    workflowItems: WorkflowItem<WikidataEntity>[],
    files: any[] = [],
    categories: string[] = [],
    wikipediaUpdates: any[] = []
  ): PublishPlan {
    const allActions: PublishAction[] = [];

    // Create actions from workflow items
    workflowItems.forEach(item => {
      allActions.push(...this.createActionsFromWorkflowItem(item));
    });

    // Create file upload actions
    files.forEach(file => {
      allActions.push(this.createFileUploadAction(
        file.name,
        file.data,
        file.description,
        file.categories
      ));
    });

    // Create category actions
    categories.forEach(categoryName => {
      allActions.push(this.createCategoryAction(categoryName, []));
    });

    // Create Wikipedia update actions
    wikipediaUpdates.forEach(update => {
      allActions.push(this.createWikipediaUpdateAction(
        update.pageTitle,
        update.section,
        update.content,
        update.summary
      ));
    });

    // Sort actions by priority (highest first)
    allActions.sort((a, b) => b.priority - a.priority);

    // Calculate dependencies
    this.calculateDependencies(allActions);

    // Group actions
    const groups = this.groupActions(allActions);

    return {
      id: `plan_${Date.now()}`,
      title: 'Publish Plan',
      description: `Publish ${allActions.length} actions`,
      groups,
      actions: allActions,
      totalActions: allActions.length,
      completedActions: 0,
      failedActions: 0,
      progress: 0,
      estimatedTime: allActions.reduce((total, action) => total + (action.estimatedTime || 0), 0),
      status: 'pending',
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }

  // Helper methods
  private findLabelChanges(workflowItem: WorkflowItem<WikidataEntity>): PropertyChange[] {
    return (workflowItem.conflicts?.filter(c => c.property.startsWith('labels.')) || []) as unknown as PropertyChange[];
  }

  private findDescriptionChanges(workflowItem: WorkflowItem<WikidataEntity>): PropertyChange[] {
    return (workflowItem.conflicts?.filter(c => c.property.startsWith('descriptions.')) || []) as unknown as PropertyChange[];
  }

  private findClaimChanges(workflowItem: WorkflowItem<WikidataEntity>): PropertyChange[] {
    return (workflowItem.conflicts?.filter(c => c.property.startsWith('claims.')) || []) as unknown as PropertyChange[];
  }

  private findSitelinkChanges(workflowItem: WorkflowItem<WikidataEntity>): PropertyChange[] {
    return (workflowItem.conflicts?.filter(c => c.property.startsWith('sitelinks.')) || []) as unknown as PropertyChange[];
  }

  private generateFileWikiText(fileName: string, description: string, categories: string[]): string {
    return `=={{int:filedesc}}==
{{Information
|description=${description}
|source={{own}}
|date={{subst:CURRENTYEAR}}-{{subst:CURRENTMONTH}}-{{subst:CURRENTDAY2}}
|author=[[User:WikiPortraits|WikiPortraits]]
|permission=
|other_versions=
}}

=={{int:license-header}}==
{{self|cc-by-sa-4.0}}

${categories.map(cat => `[[Category:${cat}]]`).join('\n')}`;
  }

  private generateCategoryWikiText(categoryName: string, parentCategories: string[]): string {
    return `${parentCategories.map(parent => `[[Category:${parent}]]`).join('\n')}`;
  }

  private calculateDependencies(actions: PublishAction[]): void {
    // Simple dependency logic - entity creation must happen before updates
    const entityCreations = actions.filter(a => a.type === 'create-entity');
    const entityUpdates = actions.filter(a => a.type !== 'create-entity' && a.entityId);

    entityUpdates.forEach(update => {
      const creation = entityCreations.find(c => c.entityId === update.entityId);
      if (creation) {
        update.dependsOn = [creation.id];
      }
    });
  }

  private groupActions(actions: PublishAction[]): PublishActionGroup[] {
    const groups: PublishActionGroup[] = [];
    
    // Group by entity
    const entityGroups = new Map<string, PublishAction[]>();
    
    actions.forEach(action => {
      if (action.entityId) {
        const key = action.entityId;
        if (!entityGroups.has(key)) {
          entityGroups.set(key, []);
        }
        entityGroups.get(key)!.push(action);
      }
    });

    // Create groups
    entityGroups.forEach((actions, entityId) => {
      const entityLabel = actions[0]?.entityLabel || entityId;
      groups.push({
        id: `group_${entityId}`,
        title: `Entity: ${entityLabel}`,
        description: `${actions.length} actions for ${entityLabel}`,
        actions,
        status: 'pending',
        progress: 0,
        canExecute: true,
        createdAt: new Date()
      });
    });

    // Add ungrouped actions
    const ungroupedActions = actions.filter(a => !a.entityId);
    if (ungroupedActions.length > 0) {
      groups.push({
        id: 'group_misc',
        title: 'Other Actions',
        description: `${ungroupedActions.length} miscellaneous actions`,
        actions: ungroupedActions,
        status: 'pending',
        progress: 0,
        canExecute: true,
        createdAt: new Date()
      });
    }

    return groups;
  }
}

export default PublishActionBuilder;