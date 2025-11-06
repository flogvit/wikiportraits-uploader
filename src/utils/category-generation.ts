import { WikidataEntity } from '../types/wikidata';
import { CategoryRule, WorkflowConfig } from './pane-configuration';

export interface CategoryGenerationContext {
  eventData?: Record<string, any>;
  entityData?: Record<string, WikidataEntity>;
  formData?: Record<string, any>;
  workflowConfig?: WorkflowConfig;
  userPreferences?: CategoryPreferences;
}

export interface CategoryPreferences {
  language: string;
  includeYearCategories: boolean;
  includeLocationCategories: boolean;
  includeGenreCategories: boolean;
  customTemplates: CategoryTemplate[];
  maxAutoCategories: number;
  prioritizeUserCategories: boolean;
}

export interface CategoryTemplate {
  id: string;
  name: string;
  template: string;
  applicableTypes: string[];
  priority: number;
  description: string;
  examples: string[];
}

export interface GeneratedCategory {
  name: string;
  source: string;
  type: 'auto' | 'suggested' | 'required' | 'user';
  priority: number;
  confidence: number; // 0-1, how confident we are about this category
  reasoning: string;
  rule?: CategoryRule;
  alternatives?: string[];
}

export interface CategoryGenerationResult {
  categories: GeneratedCategory[];
  suggestions: GeneratedCategory[];
  warnings: string[];
  totalGenerated: number;
  duplicatesRemoved: number;
  processingTime: number;
}

/**
 * Universal Category Generation System
 */
export class CategoryGenerator {
  private templates: Map<string, CategoryTemplate> = new Map();
  private generationHistory: Array<{
    timestamp: Date;
    context: CategoryGenerationContext;
    result: CategoryGenerationResult;
  }> = [];

  constructor() {
    this.registerBuiltinTemplates();
  }

  /**
   * Generate categories based on context and rules
   */
  async generateCategories(
    context: CategoryGenerationContext,
    rules: CategoryRule[] = []
  ): Promise<CategoryGenerationResult> {
    const startTime = Date.now();
    const categories: GeneratedCategory[] = [];
    const suggestions: GeneratedCategory[] = [];
    const warnings: string[] = [];
    const seenCategories = new Set<string>();

    // Process rules from workflow config
    if (context.workflowConfig) {
      const workflowRules = this.extractCategoryRules(context.workflowConfig);
      rules = [...rules, ...workflowRules];
    }

    // Sort rules by priority (highest first)
    const sortedRules = rules.sort((a, b) => b.priority - a.priority);

    // Process each rule
    for (const rule of sortedRules) {
      try {
        const generated = await this.processRule(rule, context);
        
        generated.forEach(category => {
          if (!seenCategories.has(category.name.toLowerCase())) {
            seenCategories.add(category.name.toLowerCase());
            
            if (rule.type === 'suggested') {
              suggestions.push(category);
            } else {
              categories.push(category);
            }
          }
        });
      } catch (error) {
        warnings.push(`Error processing rule "${rule.template}": ${error}`);
      }
    }

    // Generate additional categories based on entity analysis
    const entityCategories = await this.generateFromEntities(context, seenCategories);
    categories.push(...entityCategories);

    // Apply user preferences
    const filtered = this.applyUserPreferences(categories, suggestions, context.userPreferences);

    // Calculate deduplication stats
    const totalGenerated = categories.length + suggestions.length + entityCategories.length;
    const duplicatesRemoved = totalGenerated - filtered.categories.length - filtered.suggestions.length;

    const result: CategoryGenerationResult = {
      categories: filtered.categories,
      suggestions: filtered.suggestions,
      warnings,
      totalGenerated,
      duplicatesRemoved,
      processingTime: Date.now() - startTime
    };

    // Add to history
    this.addToHistory(context, result);

    return result;
  }

  /**
   * Process a single category rule
   */
  private async processRule(
    rule: CategoryRule,
    context: CategoryGenerationContext
  ): Promise<GeneratedCategory[]> {
    const categories: GeneratedCategory[] = [];

    // Check condition if specified
    if (rule.condition && context.formData) {
      const conditionMet = rule.condition(context.formData);
      if (!conditionMet) {
        return categories;
      }
    }

    // Extract data from context based on source
    const sourceData = this.extractSourceData(rule.source, context);
    
    if (!sourceData) {
      return categories;
    }

    // Generate category name from template
    const categoryName = this.processTemplate(rule.template, sourceData, context);
    
    if (categoryName) {
      const confidence = this.calculateConfidence(rule, sourceData, context);
      
      categories.push({
        name: categoryName,
        source: rule.source,
        type: rule.type,
        priority: rule.priority,
        confidence,
        reasoning: `Generated from ${rule.source} using template "${rule.template}"`,
        rule
      });

      // Generate alternatives if possible
      const alternatives = this.generateAlternatives(rule.template, sourceData, context);
      if (alternatives.length > 0) {
        categories[categories.length - 1].alternatives = alternatives;
      }
    }

    return categories;
  }

  /**
   * Extract source data from context
   */
  private extractSourceData(
    source: string,
    context: CategoryGenerationContext
  ): Record<string, any> | null {
    const parts = source.split('.');
    let data: any = context.formData;

    // Navigate through nested data
    for (const part of parts) {
      if (data && typeof data === 'object' && part in data) {
        data = data[part];
      } else {
        return null;
      }
    }

    return data;
  }

  /**
   * Process template string with data
   */
  private processTemplate(
    template: string,
    data: any,
    context: CategoryGenerationContext
  ): string | null {
    let result = template;

    // Extract placeholder variables from template
    const placeholders = template.match(/\{([^}]+)\}/g);
    if (!placeholders) return template;

    for (const placeholder of placeholders) {
      const key = placeholder.slice(1, -1); // Remove { and }
      let value = this.extractValue(key, data, context);

      if (value === null || value === undefined) {
        return null; // Can't generate if required data is missing
      }

      // Format value based on type
      value = this.formatValue(value, key, context);
      result = result.replace(placeholder, value);
    }

    return result;
  }

  /**
   * Extract value from data or context
   */
  private extractValue(
    key: string,
    data: any,
    context: CategoryGenerationContext
  ): any {
    // Handle special keys
    switch (key) {
      case 'year':
        return this.extractYear(data, context);
      case 'location':
        return this.extractLocation(data, context);
      case 'country':
        return this.extractCountry(data, context);
      case 'genre':
        return this.extractGenre(data, context);
      default:
        // Direct data access
        if (data && typeof data === 'object' && key in data) {
          return data[key];
        }
        return null;
    }
  }

  /**
   * Format value for category name
   */
  private formatValue(value: any, key: string, context: CategoryGenerationContext): string {
    if (value === null || value === undefined) return '';

    // Handle different types of values
    if (typeof value === 'string') {
      return value;
    }

    if (typeof value === 'object') {
      // Handle Wikidata entities
      if (value.labels && value.labels.en) {
        return value.labels.en.value;
      }
      if (value.name) {
        return value.name;
      }
      if (value.id) {
        return value.id;
      }
    }

    if (Array.isArray(value)) {
      // Handle arrays - take first item or combine
      if (value.length === 0) return '';
      if (value.length === 1) return this.formatValue(value[0], key, context);
      // For multiple items, might need different handling based on key
      return value.map(v => this.formatValue(v, key, context)).join(', ');
    }

    return String(value);
  }

  /**
   * Extract year from various data sources
   */
  private extractYear(data: any, context: CategoryGenerationContext): string | null {
    // Try to extract year from date fields
    const dateFields = ['date', 'startDate', 'endDate', 'eventDate'];
    
    for (const field of dateFields) {
      if (data && data[field]) {
        const date = new Date(data[field]);
        if (!isNaN(date.getTime())) {
          return date.getFullYear().toString();
        }
      }
    }

    // Try to extract from entity data
    if (context.entityData) {
      for (const entity of Object.values(context.entityData)) {
        const startTime = entity.claims?.['P580']?.[0]?.mainsnak?.datavalue?.value?.time ||
                         entity.claims?.['P585']?.[0]?.mainsnak?.datavalue?.value?.time;
        if (startTime) {
          const date = new Date(startTime);
          if (!isNaN(date.getTime())) {
            return date.getFullYear().toString();
          }
        }
      }
    }

    return null;
  }

  /**
   * Extract location from data
   */
  private extractLocation(data: any, context: CategoryGenerationContext): string | null {
    // Try direct location field
    if (data && data.location) {
      return this.formatValue(data.location, 'location', context);
    }

    // Try venue -> location
    if (data && data.venue) {
      const venue = data.venue;
      if (venue.location) {
        return this.formatValue(venue.location, 'location', context);
      }
      // Use venue name if no specific location
      return this.formatValue(venue, 'location', context);
    }

    return null;
  }

  /**
   * Extract country from data
   */
  private extractCountry(data: any, context: CategoryGenerationContext): string | null {
    // Try direct country field
    if (data && data.country) {
      return this.formatValue(data.country, 'country', context);
    }

    // Try to extract from location entity
    if (context.entityData) {
      for (const entity of Object.values(context.entityData)) {
        const country = entity.claims?.['P17']?.[0]?.mainsnak?.datavalue?.value;
        if (country) {
          return this.formatValue(country, 'country', context);
        }
      }
    }

    return null;
  }

  /**
   * Extract genre from data
   */
  private extractGenre(data: any, context: CategoryGenerationContext): string | null {
    // Try direct genre field
    if (data && data.genre) {
      return this.formatValue(data.genre, 'genre', context);
    }

    if (data && data.genres && Array.isArray(data.genres)) {
      return data.genres[0] ? this.formatValue(data.genres[0], 'genre', context) : null;
    }

    return null;
  }

  /**
   * Generate categories from entity analysis
   */
  private async generateFromEntities(
    context: CategoryGenerationContext,
    seenCategories: Set<string>
  ): Promise<GeneratedCategory[]> {
    const categories: GeneratedCategory[] = [];

    if (!context.entityData) return categories;

    // Import performer category utilities
    const { getPerformerCategory, isPerformer } = await import('./performer-categories');

    for (const [key, entity] of Object.entries(context.entityData)) {
      // Special handling for performers (people)
      if (isPerformer(entity)) {
        try {
          const performerInfo = await getPerformerCategory(entity);

          if (!seenCategories.has(performerInfo.commonsCategory.toLowerCase())) {
            seenCategories.add(performerInfo.commonsCategory.toLowerCase());
            categories.push({
              name: performerInfo.commonsCategory,
              source: 'performer-entity',
              type: 'auto',
              priority: 9, // High priority for performer categories
              confidence: performerInfo.source === 'p373' ? 1.0 : 0.85,
              reasoning: performerInfo.source === 'p373'
                ? `Using Commons category from Wikidata P373: ${performerInfo.commonsCategory}`
                : `Generated performer category: ${performerInfo.commonsCategory} (${performerInfo.source})`
            });
          }
        } catch (error) {
          console.warn(`Could not generate performer category for ${entity.id}:`, error);
        }
        continue; // Skip the generic entity type handling for performers
      }

      // Generate categories based on entity type for non-performers
      const entityTypes = entity.claims?.['P31'] || [];

      for (const typeStatement of entityTypes) {
        const typeId = typeStatement.mainsnak?.datavalue?.value?.id;
        if (typeId) {
          const typeCategories = this.generateFromEntityType(typeId, entity, context);

          typeCategories.forEach(category => {
            if (!seenCategories.has(category.name.toLowerCase())) {
              seenCategories.add(category.name.toLowerCase());
              categories.push(category);
            }
          });
        }
      }
    }

    return categories;
  }

  /**
   * Generate categories based on entity type
   */
  private generateFromEntityType(
    typeId: string,
    entity: WikidataEntity,
    context: CategoryGenerationContext
  ): GeneratedCategory[] {
    const categories: GeneratedCategory[] = [];
    const entityName = entity.labels?.en?.value || entity.id;

    switch (typeId) {
      case 'Q5': // Person - should be handled by generateFromEntities, but keep as fallback
        // Performers are now handled specially in generateFromEntities
        // This is just a fallback for any persons that slip through
        console.warn('Person entity reached generic type handler - should have been handled by performer logic:', entityName);
        break;

      case 'Q215627': // Musical group (band)
        // For bands themselves (not members), we might want to add genre-based categories
        const genre = entity.claims?.['P136']?.[0]?.mainsnak?.datavalue?.value;
        if (genre) {
          const genreName = this.formatValue(genre, 'genre', context);
          if (genreName) {
            categories.push({
              name: `${genreName} musical groups`,
              source: 'entity-analysis',
              type: 'suggested',
              priority: 6,
              confidence: 0.8,
              reasoning: `Generated from band's genre: ${genreName}`
            });
          }
        }
        break;

      case 'Q132241': // Music festival
        categories.push({
          name: 'Music festivals',
          source: 'entity-analysis',
          type: 'auto',
          priority: 8,
          confidence: 0.95,
          reasoning: `Generated from music festival entity type`
        });
        break;

      case 'Q182832': // Concert
        categories.push({
          name: 'Concerts',
          source: 'entity-analysis',
          type: 'auto',
          priority: 8,
          confidence: 0.95,
          reasoning: `Generated from concert entity type`
        });
        break;
    }

    return categories;
  }

  /**
   * Calculate confidence score for a category
   */
  private calculateConfidence(
    rule: CategoryRule,
    sourceData: any,
    context: CategoryGenerationContext
  ): number {
    let confidence = 0.5; // Base confidence

    // Higher confidence for direct data matches
    if (sourceData && typeof sourceData === 'object' && sourceData.labels) {
      confidence += 0.3; // Wikidata entity with labels
    }

    // Higher confidence for required categories
    if (rule.type === 'required') {
      confidence += 0.2;
    }

    // Higher confidence for high-priority rules
    if (rule.priority >= 8) {
      confidence += 0.2;
    } else if (rule.priority >= 6) {
      confidence += 0.1;
    }

    // Lower confidence for conditional rules
    if (rule.condition) {
      confidence -= 0.1;
    }

    return Math.min(Math.max(confidence, 0), 1);
  }

  /**
   * Generate alternative category names
   */
  private generateAlternatives(
    template: string,
    sourceData: any,
    context: CategoryGenerationContext
  ): string[] {
    const alternatives: string[] = [];

    // For location-based categories, try variations
    if (template.includes('{location}')) {
      const baseLocation = this.extractLocation(sourceData, context);
      if (baseLocation) {
        alternatives.push(template.replace('{location}', `${baseLocation} area`));
        alternatives.push(template.replace('{location}', `${baseLocation} region`));
      }
    }

    // For year-based categories, try decade
    if (template.includes('{year}')) {
      const year = this.extractYear(sourceData, context);
      if (year) {
        const decade = Math.floor(parseInt(year) / 10) * 10;
        alternatives.push(template.replace('{year}', `${decade}s`));
      }
    }

    return alternatives;
  }

  /**
   * Apply user preferences to filter and sort categories
   */
  private applyUserPreferences(
    categories: GeneratedCategory[],
    suggestions: GeneratedCategory[],
    preferences?: CategoryPreferences
  ): { categories: GeneratedCategory[]; suggestions: GeneratedCategory[] } {
    if (!preferences) {
      return { categories, suggestions };
    }

    // Filter categories based on preferences
    let filteredCategories = categories;
    let filteredSuggestions = suggestions;

    if (!preferences.includeYearCategories) {
      filteredCategories = filteredCategories.filter(c => 
        !c.name.match(/\d{4}/) && !c.name.includes('year')
      );
    }

    if (!preferences.includeLocationCategories) {
      filteredCategories = filteredCategories.filter(c => 
        !c.source.includes('location') && !c.name.includes(' in ')
      );
    }

    // Limit number of auto categories
    if (preferences.maxAutoCategories > 0) {
      filteredCategories = filteredCategories
        .sort((a, b) => b.priority - a.priority)
        .slice(0, preferences.maxAutoCategories);
    }

    // Sort by priority and confidence
    filteredCategories.sort((a, b) => {
      if (a.priority !== b.priority) {
        return b.priority - a.priority;
      }
      return b.confidence - a.confidence;
    });

    filteredSuggestions.sort((a, b) => {
      if (a.priority !== b.priority) {
        return b.priority - a.priority;
      }
      return b.confidence - a.confidence;
    });

    return {
      categories: filteredCategories,
      suggestions: filteredSuggestions
    };
  }

  /**
   * Extract category rules from workflow config
   */
  private extractCategoryRules(config: WorkflowConfig): CategoryRule[] {
    const rules: CategoryRule[] = [];

    // Extract from panes
    config.panes.forEach(pane => {
      rules.push(...pane.config.categoryRules);
    });

    // Extract global rules
    if (config.globalCategories) {
      rules.push(...config.globalCategories);
    }

    return rules;
  }

  /**
   * Register a custom category template
   */
  registerTemplate(template: CategoryTemplate): void {
    this.templates.set(template.id, template);
  }

  /**
   * Get available templates
   */
  getTemplates(): CategoryTemplate[] {
    return Array.from(this.templates.values());
  }

  /**
   * Get generation history
   */
  getHistory(): Array<{
    timestamp: Date;
    context: CategoryGenerationContext;
    result: CategoryGenerationResult;
  }> {
    return [...this.generationHistory];
  }

  /**
   * Clear generation history
   */
  clearHistory(): void {
    this.generationHistory = [];
  }

  private addToHistory(context: CategoryGenerationContext, result: CategoryGenerationResult): void {
    this.generationHistory.push({
      timestamp: new Date(),
      context,
      result
    });

    // Keep only last 50 generations
    if (this.generationHistory.length > 50) {
      this.generationHistory = this.generationHistory.slice(-50);
    }
  }

  private registerBuiltinTemplates(): void {
    // Music event templates
    this.registerTemplate({
      id: 'music-festival-location',
      name: 'Music festivals by location',
      template: 'Music festivals in {location}',
      applicableTypes: ['Q132241'],
      priority: 8,
      description: 'Generate location-based music festival categories',
      examples: ['Music festivals in Germany', 'Music festivals in California']
    });

    this.registerTemplate({
      id: 'music-year',
      name: 'Music by year',
      template: '{year} in music',
      applicableTypes: ['Q132241', 'Q182832'],
      priority: 7,
      description: 'Generate year-based music categories',
      examples: ['2024 in music', '2023 in music']
    });

    // Sports event templates
    this.registerTemplate({
      id: 'football-match',
      name: 'Football matches',
      template: '{homeTeam} vs {awayTeam}',
      applicableTypes: ['Q16466'],
      priority: 9,
      description: 'Generate match-specific categories',
      examples: ['Manchester United vs Liverpool', 'Barcelona vs Real Madrid']
    });

    // Person templates
    this.registerTemplate({
      id: 'person-nationality',
      name: 'People by nationality',
      template: '{nationality} {occupation}',
      applicableTypes: ['Q5'],
      priority: 6,
      description: 'Generate nationality-based person categories',
      examples: ['German musicians', 'American athletes']
    });

    // Generic templates
    this.registerTemplate({
      id: 'events-location',
      name: 'Events by location',
      template: 'Events in {location}',
      applicableTypes: ['*'],
      priority: 5,
      description: 'Generate location-based event categories',
      examples: ['Events in Berlin', 'Events in New York']
    });
  }
}

// Global category generator instance
export const categoryGenerator = new CategoryGenerator();

export default categoryGenerator;