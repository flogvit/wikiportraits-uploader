import { WikidataClient } from '@/lib/api/WikidataClient';
import { WikipediaClient } from '@/lib/api/WikipediaClient';
import { WikidataEntity, WorkflowItem } from '@/types/wikidata';
import { createWorkflowItem } from './conflict-resolution';

export interface EventSearchFilters {
  eventType?: string[];
  dateRange?: {
    start?: string;
    end?: string;
  };
  location?: string;
  country?: string;
  participants?: string[];
  venue?: string;
  language?: string;
  limit?: number;
}

export interface LoadedEvent {
  entity: WikidataEntity;
  participants: WikidataEntity[];
  venue?: WikidataEntity;
  location?: WikidataEntity;
  wikipediaArticle?: {
    title: string;
    extract: string;
    url: string;
  };
  categories: string[];
  relatedEvents: WikidataEntity[];
}

export interface EventLoadingResult {
  events: LoadedEvent[];
  total: number;
  hasMore: boolean;
  nextOffset?: number;
}

/**
 * Event Loading Service - Comprehensive event loading from Wikidata and Wikipedia
 */
export class EventLoader {
  private wikidataClient: WikidataClient;
  private wikipediaClient: WikipediaClient;

  constructor() {
    this.wikidataClient = new WikidataClient();
    this.wikipediaClient = new WikipediaClient();
  }

  /**
   * Search for events with comprehensive filtering
   */
  async searchEvents(
    query: string,
    filters: EventSearchFilters = {}
  ): Promise<EventLoadingResult> {
    const { eventType, dateRange, location, country, limit = 50 } = filters;

    // Build Wikidata query constraints
    const constraints: string[] = [];
    
    if (eventType?.length) {
      const typeConstraints = eventType.map(type => this.getEventTypeConstraint(type));
      constraints.push(`(${typeConstraints.join(' OR ')})`);
    }

    if (dateRange?.start || dateRange?.end) {
      constraints.push(this.buildDateConstraint(dateRange));
    }

    if (location) {
      constraints.push(`?item wdt:P276 ?location . ?location rdfs:label "${location}"@en`);
    }

    if (country) {
      constraints.push(`?item wdt:P17 ?country . ?country rdfs:label "${country}"@en`);
    }

    try {
      // Search for events using Wikidata client
      const searchResults = await this.wikidataClient.searchEntities({
        search: query,
        type: 'item',
        limit,
        language: filters.language || 'en'
      });

      const events: LoadedEvent[] = [];
      
      for (const result of searchResults.search) {
        try {
          const loadedEvent = await this.loadEventDetails(result.id);
          if (loadedEvent && this.matchesFilters(loadedEvent, filters)) {
            events.push(loadedEvent);
          }
        } catch (error) {
          console.warn(`Failed to load event details for ${result.id}:`, error);
        }
      }

      return {
        events,
        total: events.length,
        hasMore: searchResults.search.length === limit,
        nextOffset: searchResults.searchinfo?.totalhits ? limit : undefined
      };
    } catch (error) {
      console.error('Failed to search events:', error);
      throw new Error(`Event search failed: ${error}`);
    }
  }

  /**
   * Load comprehensive details for a specific event
   */
  async loadEventDetails(eventId: string): Promise<LoadedEvent | null> {
    try {
      // Load main event entity
      const entity = await this.wikidataClient.getEntity(eventId);
      if (!entity) return null;

      // Load participants (performers, speakers, etc.)
      const participants = await this.loadEventParticipants(entity);

      // Load venue information
      const venue = await this.loadEventVenue(entity);

      // Load location information
      const location = await this.loadEventLocation(entity);

      // Load Wikipedia article if available
      const wikipediaArticle = await this.loadWikipediaArticle(entity);

      // Generate relevant categories
      const categories = this.generateEventCategories(entity, participants, venue, location);

      // Load related events
      const relatedEvents = await this.loadRelatedEvents(entity);

      return {
        entity,
        participants,
        venue,
        location,
        wikipediaArticle,
        categories,
        relatedEvents
      };
    } catch (error) {
      console.error(`Failed to load event details for ${eventId}:`, error);
      return null;
    }
  }

  /**
   * Load event participants (musicians, speakers, athletes, etc.)
   */
  async loadEventParticipants(event: WikidataEntity): Promise<WikidataEntity[]> {
    const participantProperties = [
      'P175', // performer
      'P710', // participant
      'P823', // speaker
      'P1344', // participant in
      'P495', // country of origin (for events)
    ];

    const participants: WikidataEntity[] = [];

    for (const property of participantProperties) {
      const claims = event.claims?.[property];
      if (claims) {
        for (const claim of claims) {
          if (claim.mainsnak.datatype === 'wikibase-item' && claim.mainsnak.datavalue) {
            const participantId = claim.mainsnak.datavalue.value.id;
            try {
              const participant = await this.wikidataClient.getEntity(participantId);
              if (participant) {
                participants.push(participant);
              }
            } catch (error) {
              console.warn(`Failed to load participant ${participantId}:`, error);
            }
          }
        }
      }
    }

    return participants;
  }

  /**
   * Load event venue information
   */
  async loadEventVenue(event: WikidataEntity): Promise<WikidataEntity | undefined> {
    const locationClaim = event.claims?.['P276']?.[0]; // location
    const venueClaim = event.claims?.['P155']?.[0]; // venue (if different property)

    const venueId = locationClaim?.mainsnak?.datavalue?.value?.id || 
                   venueClaim?.mainsnak?.datavalue?.value?.id;

    if (venueId) {
      try {
        return await this.wikidataClient.getEntity(venueId);
      } catch (error) {
        console.warn(`Failed to load venue ${venueId}:`, error);
      }
    }

    return undefined;
  }

  /**
   * Load event location/country information
   */
  async loadEventLocation(event: WikidataEntity): Promise<WikidataEntity | undefined> {
    const countryClaim = event.claims?.['P17']?.[0]; // country

    if (countryClaim?.mainsnak?.datavalue) {
      const locationId = countryClaim.mainsnak.datavalue.value.id;
      try {
        return await this.wikidataClient.getEntity(locationId);
      } catch (error) {
        console.warn(`Failed to load location ${locationId}:`, error);
      }
    }

    return undefined;
  }

  /**
   * Load Wikipedia article for the event
   */
  async loadWikipediaArticle(event: WikidataEntity): Promise<LoadedEvent['wikipediaArticle'] | undefined> {
    const sitelinks = event.sitelinks?.enwiki;
    if (!sitelinks) return undefined;

    try {
      const article = await this.wikipediaClient.getArticle(sitelinks.title);
      if (article) {
        return {
          title: article.title,
          extract: article.extract,
          url: `https://en.wikipedia.org/wiki/${encodeURIComponent(sitelinks.title)}`
        };
      }
    } catch (error) {
      console.warn(`Failed to load Wikipedia article for ${event.id}:`, error);
    }

    return undefined;
  }

  /**
   * Generate relevant categories for the event
   */
  generateEventCategories(
    event: WikidataEntity,
    participants: WikidataEntity[],
    venue?: WikidataEntity,
    location?: WikidataEntity
  ): string[] {
    const categories: string[] = [];

    // Event name category
    const eventName = event.labels?.en?.value;
    if (eventName) {
      categories.push(`${eventName}`);
    }

    // Year category
    const startTime = event.claims?.['P580']?.[0]?.mainsnak?.datavalue?.value?.time ||
                     event.claims?.['P585']?.[0]?.mainsnak?.datavalue?.value?.time;
    if (startTime) {
      const year = new Date(startTime).getFullYear();
      categories.push(`${year} events`);
    }

    // Location categories
    if (venue) {
      const venueName = venue.labels?.en?.value;
      if (venueName) {
        categories.push(`Events at ${venueName}`);
      }
    }

    if (location) {
      const locationName = location.labels?.en?.value;
      if (locationName) {
        categories.push(`Events in ${locationName}`);
      }
    }

    // Participant categories
    participants.forEach(participant => {
      const name = participant.labels?.en?.value;
      if (name) {
        categories.push(`${name} events`);
      }
    });

    // Event type categories
    const instanceOf = event.claims?.['P31'];
    if (instanceOf) {
      instanceOf.forEach(claim => {
        if (claim.mainsnak.datavalue) {
          const typeId = claim.mainsnak.datavalue.value.id;
          const typeCategory = this.getEventTypeCategory(typeId);
          if (typeCategory) {
            categories.push(typeCategory);
          }
        }
      });
    }

    return categories;
  }

  /**
   * Load related events (same series, venue, time period)
   */
  async loadRelatedEvents(event: WikidataEntity): Promise<WikidataEntity[]> {
    const relatedEvents: WikidataEntity[] = [];

    // Events in same series
    const partOfSeries = event.claims?.['P179']?.[0]?.mainsnak?.datavalue?.value?.id;
    if (partOfSeries) {
      try {
        // Search for other events in the same series
        const seriesEvents = await this.wikidataClient.searchEntitiesOfType('Q1656682', {
          search: '',
          claims: [{ property: 'P179', value: partOfSeries }],
          limit: 10
        });
        
        for (const result of seriesEvents) {
          if (result.id !== event.id) {
            const relatedEvent = await this.wikidataClient.getEntity(result.id);
            if (relatedEvent) {
              relatedEvents.push(relatedEvent);
            }
          }
        }
      } catch (error) {
        console.warn(`Failed to load related events for series ${partOfSeries}:`, error);
      }
    }

    return relatedEvents;
  }

  /**
   * Convert event to WorkflowItem for editing
   */
  convertToWorkflowItem(loadedEvent: LoadedEvent): WorkflowItem<WikidataEntity> {
    return createWorkflowItem(loadedEvent.entity, false, loadedEvent.entity);
  }

  /**
   * Convert loaded event to form data
   */
  convertToFormData(loadedEvent: LoadedEvent): Record<string, any> {
    const entity = loadedEvent.entity;
    
    return {
      event: {
        id: entity.id,
        name: entity.labels?.en?.value || '',
        type: this.getEventTypeFromEntity(entity),
        date: this.extractDateFromEntity(entity),
        description: entity.descriptions?.en?.value || ''
      },
      participants: loadedEvent.participants,
      venue: loadedEvent.venue,
      location: loadedEvent.location,
      categories: loadedEvent.categories,
      wikipediaUrl: loadedEvent.wikipediaArticle?.url
    };
  }

  // Helper methods
  private getEventTypeConstraint(eventType: string): string {
    const typeMapping: Record<string, string> = {
      'festival': '?item wdt:P31 wd:Q132241',
      'concert': '?item wdt:P31 wd:Q182832',
      'conference': '?item wdt:P31 wd:Q2020153',
      'tournament': '?item wdt:P31 wd:Q500834'
    };
    return typeMapping[eventType] || `?item wdt:P31 wd:${eventType}`;
  }

  private buildDateConstraint(dateRange: EventSearchFilters['dateRange']): string {
    if (dateRange?.start && dateRange?.end) {
      return `?item wdt:P580 ?startTime . FILTER(?startTime >= "${dateRange.start}"^^xsd:dateTime && ?startTime <= "${dateRange.end}"^^xsd:dateTime)`;
    } else if (dateRange?.start) {
      return `?item wdt:P580 ?startTime . FILTER(?startTime >= "${dateRange.start}"^^xsd:dateTime)`;
    } else if (dateRange?.end) {
      return `?item wdt:P580 ?startTime . FILTER(?startTime <= "${dateRange.end}"^^xsd:dateTime)`;
    }
    return '';
  }

  private matchesFilters(event: LoadedEvent, filters: EventSearchFilters): boolean {
    // Additional filtering logic can be added here
    // For now, we assume the Wikidata query handles most filtering
    return true;
  }

  private getEventTypeCategory(typeId: string): string | null {
    const categoryMapping: Record<string, string> = {
      'Q132241': 'Music festivals',
      'Q182832': 'Concerts',
      'Q2020153': 'Conferences',
      'Q500834': 'Tournaments'
    };
    return categoryMapping[typeId] || null;
  }

  private getEventTypeFromEntity(entity: WikidataEntity): string {
    const instanceOf = entity.claims?.['P31']?.[0]?.mainsnak?.datavalue?.value?.id;
    const typeMapping: Record<string, string> = {
      'Q132241': 'festival',
      'Q182832': 'concert',
      'Q2020153': 'conference',
      'Q500834': 'tournament'
    };
    return typeMapping[instanceOf] || 'event';
  }

  private extractDateFromEntity(entity: WikidataEntity): string {
    const startTime = entity.claims?.['P580']?.[0]?.mainsnak?.datavalue?.value?.time ||
                     entity.claims?.['P585']?.[0]?.mainsnak?.datavalue?.value?.time;
    if (startTime) {
      return new Date(startTime).toISOString().split('T')[0];
    }
    return '';
  }
}

export default EventLoader;