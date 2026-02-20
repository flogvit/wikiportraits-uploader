import { WikidataEntity } from '../types/wikidata';
import { logger } from '@/utils/logger';

/**
 * Event Relationship Mapping and Suggestion System
 */

export interface EventRelationship {
  id: string;
  type: 'temporal' | 'spatial' | 'performer' | 'venue' | 'genre' | 'series' | 'participant';
  sourceEntity: WikidataEntity;
  targetEntity: WikidataEntity;
  confidence: number; // 0-1
  reasoning: string;
  properties: string[]; // Wikidata properties involved
  metadata?: Record<string, any>;
}

export interface RelationshipQuery {
  entityId: string;
  relationshipTypes?: string[];
  maxResults?: number;
  minConfidence?: number;
  includeIndirect?: boolean;
  temporalWindow?: { start: Date; end: Date };
  spatialRadius?: number; // km
}

export interface RelationshipSuggestion {
  entity: WikidataEntity;
  relationshipType: string;
  confidence: number;
  reasoning: string;
  suggestedProperty: string;
  context: Record<string, any>;
  alternatives?: WikidataEntity[];
}

export interface SuggestionContext {
  currentEvent?: WikidataEntity;
  existingEntities?: WikidataEntity[];
  userPreferences?: {
    preferredGenres?: string[];
    preferredLocations?: string[];
    preferredTimeRange?: { start: Date; end: Date };
  };
  workflowType?: 'music' | 'soccer' | 'general';
}

import { suggestionCache } from './suggestion-cache';

/**
 * Event Relationship Mapper
 */
export class EventRelationshipMapper {
  private relationshipCache: Map<string, EventRelationship[]> = new Map();
  private cacheExpiry = 60 * 60 * 1000; // 1 hour

  /**
   * Find relationships for an entity
   */
  async findRelationships(query: RelationshipQuery): Promise<EventRelationship[]> {
    const cacheKey = this.generateCacheKey(query);
    
    // Check cache first
    if (this.relationshipCache.has(cacheKey)) {
      const cached = this.relationshipCache.get(cacheKey)!;
      return this.filterRelationships(cached, query);
    }

    try {
      const relationships = await this.extractRelationships(query);
      
      // Cache results
      this.relationshipCache.set(cacheKey, relationships);
      
      // Set cache expiry
      setTimeout(() => {
        this.relationshipCache.delete(cacheKey);
      }, this.cacheExpiry);

      return this.filterRelationships(relationships, query);
    } catch (error) {
      logger.error('event-relationships', 'Error finding relationships', error);
      return [];
    }
  }

  /**
   * Extract relationships from entity data
   */
  private async extractRelationships(query: RelationshipQuery): Promise<EventRelationship[]> {
    const relationships: EventRelationship[] = [];
    
    // This would normally query Wikidata API, but for now we'll simulate
    // In a real implementation, this would make SPARQL queries to find related entities
    
    // For demonstration, we'll create some example relationships
    const mockRelationships = this.generateMockRelationships(query.entityId);
    relationships.push(...mockRelationships);

    return relationships;
  }

  /**
   * Generate relationship suggestions based on context
   */
  async generateSuggestions(context: SuggestionContext): Promise<RelationshipSuggestion[]> {
    // Check advanced cache first
    const cachedSuggestions = suggestionCache.getSuggestions(context);
    if (cachedSuggestions) {
      return cachedSuggestions;
    }

    try {
      const suggestions: RelationshipSuggestion[] = [];

      if (context.currentEvent) {
        // Generate suggestions based on current event
        const eventSuggestions = await this.generateEventBasedSuggestions(context);
        suggestions.push(...eventSuggestions);
      }

      if (context.existingEntities && context.existingEntities.length > 0) {
        // Generate suggestions based on existing entities
        const contextSuggestions = await this.generateContextBasedSuggestions(context);
        suggestions.push(...contextSuggestions);
      }

      // Generate workflow-specific suggestions
      const workflowSuggestions = await this.generateWorkflowBasedSuggestions(context);
      suggestions.push(...workflowSuggestions);

      // Sort by confidence and deduplicate
      const sortedSuggestions = suggestions
        .sort((a, b) => b.confidence - a.confidence)
        .filter((suggestion, index, array) => 
          array.findIndex(s => s.entity.id === suggestion.entity.id) === index
        );

      // Cache results using advanced cache system
      suggestionCache.setSuggestions(context, sortedSuggestions);

      return sortedSuggestions;
    } catch (error) {
      logger.error('event-relationships', 'Error generating suggestions', error);
      return [];
    }
  }

  /**
   * Generate event-based suggestions
   */
  private async generateEventBasedSuggestions(context: SuggestionContext): Promise<RelationshipSuggestion[]> {
    const suggestions: RelationshipSuggestion[] = [];
    const event = context.currentEvent!;

    // Temporal suggestions (same time period)
    const eventDate = this.extractEventDate(event);
    if (eventDate) {
      const temporalSuggestions = await this.findTemporallyRelatedEvents(event, eventDate);
      suggestions.push(...temporalSuggestions.map(entity => ({
        entity,
        relationshipType: 'temporal',
        confidence: 0.7,
        reasoning: `Occurred around the same time as ${event.labels?.en?.value}`,
        suggestedProperty: 'P585',
        context: { eventDate }
      })));
    }

    // Spatial suggestions (same location)
    const location = this.extractLocation(event);
    if (location) {
      const spatialSuggestions = await this.findSpatiallyRelatedEvents(event, location);
      suggestions.push(...spatialSuggestions.map(entity => ({
        entity,
        relationshipType: 'spatial',
        confidence: 0.8,
        reasoning: `Occurred at the same location as ${event.labels?.en?.value}`,
        suggestedProperty: 'P276',
        context: { location }
      })));
    }

    // Performer suggestions (same performers)
    const performers = this.extractPerformers(event);
    if (performers.length > 0) {
      const performerSuggestions = await this.findPerformerRelatedEvents(event, performers);
      suggestions.push(...performerSuggestions.map(entity => ({
        entity,
        relationshipType: 'performer',
        confidence: 0.9,
        reasoning: `Features same performers as ${event.labels?.en?.value}`,
        suggestedProperty: 'P175',
        context: { performers }
      })));
    }

    return suggestions;
  }

  /**
   * Generate context-based suggestions
   */
  private async generateContextBasedSuggestions(context: SuggestionContext): Promise<RelationshipSuggestion[]> {
    const suggestions: RelationshipSuggestion[] = [];
    const entities = context.existingEntities!;

    // Find common themes across entities
    const genres = this.extractCommonGenres(entities);
    if (genres.length > 0) {
      const genreSuggestions = await this.findGenreRelatedEvents(genres);
      suggestions.push(...genreSuggestions.map(entity => ({
        entity,
        relationshipType: 'genre',
        confidence: 0.6,
        reasoning: `Matches common genres: ${genres.join(', ')}`,
        suggestedProperty: 'P136',
        context: { genres }
      })));
    }

    // Find common locations
    const locations = this.extractCommonLocations(entities);
    if (locations.length > 0) {
      const locationSuggestions = await this.findLocationRelatedEvents(locations);
      suggestions.push(...locationSuggestions.map(entity => ({
        entity,
        relationshipType: 'venue',
        confidence: 0.7,
        reasoning: `Related to common locations: ${locations.join(', ')}`,
        suggestedProperty: 'P276',
        context: { locations }
      })));
    }

    return suggestions;
  }

  /**
   * Generate workflow-specific suggestions
   */
  private async generateWorkflowBasedSuggestions(context: SuggestionContext): Promise<RelationshipSuggestion[]> {
    const suggestions: RelationshipSuggestion[] = [];

    switch (context.workflowType) {
      case 'music':
        suggestions.push(...await this.generateMusicSuggestions(context));
        break;
      case 'soccer':
        suggestions.push(...await this.generateSoccerSuggestions(context));
        break;
      default:
        suggestions.push(...await this.generateGeneralSuggestions(context));
        break;
    }

    return suggestions;
  }

  /**
   * Generate music-specific suggestions
   */
  private async generateMusicSuggestions(context: SuggestionContext): Promise<RelationshipSuggestion[]> {
    const suggestions: RelationshipSuggestion[] = [];

    // Suggest popular music festivals
    const festivals = await this.getMusicFestivals();
    suggestions.push(...festivals.map(festival => ({
      entity: festival,
      relationshipType: 'series',
      confidence: 0.5,
      reasoning: 'Popular music festival that might be relevant',
      suggestedProperty: 'P361',
      context: { type: 'festival' }
    })));

    // Suggest popular venues
    const venues = await this.getMusicVenues();
    suggestions.push(...venues.map(venue => ({
      entity: venue,
      relationshipType: 'venue',
      confidence: 0.6,
      reasoning: 'Well-known music venue',
      suggestedProperty: 'P276',
      context: { type: 'venue' }
    })));

    return suggestions;
  }

  /**
   * Generate soccer-specific suggestions
   */
  private async generateSoccerSuggestions(context: SuggestionContext): Promise<RelationshipSuggestion[]> {
    const suggestions: RelationshipSuggestion[] = [];

    // Suggest major teams
    const teams = await this.getSoccerTeams();
    suggestions.push(...teams.map(team => ({
      entity: team,
      relationshipType: 'participant',
      confidence: 0.7,
      reasoning: 'Major soccer team',
      suggestedProperty: 'P710',
      context: { type: 'team' }
    })));

    // Suggest major stadiums
    const stadiums = await this.getSoccerStadiums();
    suggestions.push(...stadiums.map(stadium => ({
      entity: stadium,
      relationshipType: 'venue',
      confidence: 0.6,
      reasoning: 'Major soccer stadium',
      suggestedProperty: 'P276',
      context: { type: 'stadium' }
    })));

    return suggestions;
  }

  /**
   * Generate general suggestions
   */
  private async generateGeneralSuggestions(context: SuggestionContext): Promise<RelationshipSuggestion[]> {
    const suggestions: RelationshipSuggestion[] = [];

    // Apply user preferences
    if (context.userPreferences) {
      const { preferredGenres, preferredLocations, preferredTimeRange } = context.userPreferences;

      if (preferredGenres && preferredGenres.length > 0) {
        const genreSuggestions = await this.findGenreRelatedEvents(preferredGenres);
        suggestions.push(...genreSuggestions.map(entity => ({
          entity,
          relationshipType: 'genre',
          confidence: 0.8,
          reasoning: 'Matches your preferred genres',
          suggestedProperty: 'P136',
          context: { userPreference: 'genre' }
        })));
      }

      if (preferredLocations && preferredLocations.length > 0) {
        const locationSuggestions = await this.findLocationRelatedEvents(preferredLocations);
        suggestions.push(...locationSuggestions.map(entity => ({
          entity,
          relationshipType: 'spatial',
          confidence: 0.8,
          reasoning: 'Matches your preferred locations',
          suggestedProperty: 'P276',
          context: { userPreference: 'location' }
        })));
      }
    }

    return suggestions;
  }

  // Helper methods for data extraction

  private extractEventDate(entity: WikidataEntity): Date | null {
    const startTime = entity.claims?.['P580']?.[0]?.mainsnak?.datavalue?.value?.time ||
                     entity.claims?.['P585']?.[0]?.mainsnak?.datavalue?.value?.time;
    return startTime ? new Date(startTime) : null;
  }

  private extractLocation(entity: WikidataEntity): string | null {
    const location = entity.claims?.['P276']?.[0]?.mainsnak?.datavalue?.value;
    return location?.labels?.en?.value || location?.id || null;
  }

  private extractPerformers(entity: WikidataEntity): string[] {
    const performers = entity.claims?.['P175'] || [];
    return performers.map(p => p.mainsnak?.datavalue?.value?.id || '').filter(id => id);
  }

  private extractCommonGenres(entities: WikidataEntity[]): string[] {
    const allGenres = entities.flatMap(entity => 
      entity.claims?.['P136']?.map(g => g.mainsnak?.datavalue?.value?.id) || []
    );
    // Count occurrences and return genres that appear in multiple entities
    const genreCounts = allGenres.reduce((acc, genre) => {
      acc[genre] = (acc[genre] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    return Object.entries(genreCounts)
      .filter(([_, count]) => (count as number) > 1)
      .map(([genre, _]) => genre);
  }

  private extractCommonLocations(entities: WikidataEntity[]): string[] {
    const allLocations = entities.flatMap(entity =>
      entity.claims?.['P276']?.map(l => l.mainsnak?.datavalue?.value?.id) || []
    );
    const locationCounts = allLocations.reduce((acc, location) => {
      acc[location] = (acc[location] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(locationCounts)
      .filter(([_, count]) => (count as number) > 1)
      .map(([location, _]) => location);
  }

  // Mock data methods (in real implementation, these would query APIs)

  private generateMockRelationships(entityId: string): EventRelationship[] {
    // This is mock data - in real implementation would query Wikidata
    return [];
  }

  private async findTemporallyRelatedEvents(event: WikidataEntity, date: Date): Promise<WikidataEntity[]> {
    // Mock implementation - would query events within time window
    return [];
  }

  private async findSpatiallyRelatedEvents(event: WikidataEntity, location: string): Promise<WikidataEntity[]> {
    // Mock implementation - would query events at same location
    return [];
  }

  private async findPerformerRelatedEvents(event: WikidataEntity, performers: string[]): Promise<WikidataEntity[]> {
    // Mock implementation - would query events with same performers
    return [];
  }

  private async findGenreRelatedEvents(genres: string[]): Promise<WikidataEntity[]> {
    // Mock implementation - would query events with matching genres
    return [];
  }

  private async findLocationRelatedEvents(locations: string[]): Promise<WikidataEntity[]> {
    // Mock implementation - would query events at matching locations
    return [];
  }

  private async getMusicFestivals(): Promise<WikidataEntity[]> {
    // Mock implementation - would return popular music festivals
    return [];
  }

  private async getMusicVenues(): Promise<WikidataEntity[]> {
    // Mock implementation - would return popular music venues
    return [];
  }

  private async getSoccerTeams(): Promise<WikidataEntity[]> {
    // Mock implementation - would return major soccer teams
    return [];
  }

  private async getSoccerStadiums(): Promise<WikidataEntity[]> {
    // Mock implementation - would return major soccer stadiums
    return [];
  }

  // Utility methods

  private filterRelationships(relationships: EventRelationship[], query: RelationshipQuery): EventRelationship[] {
    let filtered = relationships;

    if (query.relationshipTypes) {
      filtered = filtered.filter(r => query.relationshipTypes!.includes(r.type));
    }

    if (query.minConfidence !== undefined) {
      filtered = filtered.filter(r => r.confidence >= query.minConfidence!);
    }

    if (query.maxResults) {
      filtered = filtered.slice(0, query.maxResults);
    }

    return filtered;
  }

  private generateCacheKey(query: RelationshipQuery): string {
    return JSON.stringify({
      entityId: query.entityId,
      types: query.relationshipTypes?.sort(),
      maxResults: query.maxResults,
      minConfidence: query.minConfidence
    });
  }


  /**
   * Clear all caches
   */
  clearCache(): void {
    this.relationshipCache.clear();
    suggestionCache.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { relationships: number; suggestions: any } {
    return {
      relationships: this.relationshipCache.size,
      suggestions: suggestionCache.getStats()
    };
  }
}

// Global instance
export const eventRelationshipMapper = new EventRelationshipMapper();

export default eventRelationshipMapper;