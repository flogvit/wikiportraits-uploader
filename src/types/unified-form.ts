import { WikidataEntity } from './wikidata';

/**
 * Unified Form Data Structure - Single Source of Truth
 * Eliminates event bus, uses only React Hook Form with cross-pane reactivity
 */

export interface UniversalFormData {
  // Workflow discriminator - determines which panes are active
  workflowType: 'music-event' | 'soccer-match' | 'portraits' | 'general-upload' | 'custom';
  
  // WikiPortraits workflow flag - simple boolean to indicate if this is a WikiPortraits job
  isWikiPortraitsJob?: boolean;
  
  // Universal entities (shared across ALL workflows and panes)
  entities: {
    // People who can appear in images, categories, templates
    people: Array<{
      entity: WikidataEntity;
      roles: PersonRole[];           // ['performer', 'player', 'subject']
      isNew?: boolean;               // Created in this session
      source?: string;               // Which pane added this
      metadata?: Record<string, any>; // Workflow-specific data
    }>;
    
    // Organizations (bands, teams, companies, venues)
    organizations: Array<{
      entity: WikidataEntity;
      roles: OrganizationRole[];     // ['main-band', 'home-team', 'venue']
      isNew?: boolean;
      source?: string;
      metadata?: Record<string, any>;
    }>;
    
    // Locations (cities, venues, stadiums, countries)
    locations: Array<{
      entity: WikidataEntity;
      roles: LocationRole[];         // ['venue', 'city', 'country']
      isNew?: boolean;
      source?: string;
      metadata?: Record<string, any>;
    }>;
    
    // Events (concerts, matches, festivals - can be nested)
    events: Array<{
      entity: WikidataEntity;
      roles: EventRole[];            // ['main-event', 'sub-event', 'series']
      isNew?: boolean;
      source?: string;
      metadata?: Record<string, any>;
    }>;
  };
  
  // Event details (unified structure)
  eventDetails: {
    // Common to all workflows
    title: string;                 // Event title/name
    date?: Date;                   // When it happened
    description?: string;          // Free text description
    language: string;              // Content language (default: 'en')
    
    // Event sub-type (workflow-specific)
    type?: string;                 // 'festival', 'concert', 'league', 'cup', etc.
    
    // Location and venue (common to most workflows)
    venue?: WikidataEntity;        // Where it happened
    location?: WikidataEntity;     // City/region
    country?: WikidataEntity;      // Country
    
    // Workflow-specific fields (based on workflowType)
    // Music events
    mainBand?: WikidataEntity;     // Primary performing band/artist
    genre?: string[];              // Music genres
    festival?: WikidataEntity;     // Parent festival if applicable
    setlistUrl?: string;           // External setlist link
    recordingType?: 'live' | 'studio' | 'rehearsal';
    
    // Soccer matches
    homeTeam?: WikidataEntity;     // Home team
    awayTeam?: WikidataEntity;     // Away team
    competition?: WikidataEntity;  // League/tournament
    score?: {
      home: number;
      away: number;
    };
    
    // Portrait sessions
    sessionType?: 'individual' | 'group' | 'family' | 'professional';
    photographer?: WikidataEntity; // Who took the photos
    occasion?: string;             // What was the occasion
    
    // General uploads
    category?: string;             // General category
    creator?: WikidataEntity;      // Who created the content
    
    // Custom workflow (user-defined)
    custom?: {
      workflowName: string;
      fields: Record<string, any>;
    };
  };
  
  // Auto-computed/derived data (updated automatically when base data changes)
  computed: {
    // Categories (auto-generated from entities + event details)
    categories: {
      auto: Array<{
        name: string;
        source: 'band' | 'event' | 'location' | 'date' | 'person' | 'genre';
        confidence: number;          // 0-1, how confident we are
        reasoning: string;           // Why this was generated
      }>;
      suggested: Array<{
        name: string;
        reason: string;
      }>;
      manual: string[];              // User-added categories
      rejected: string[];            // User-rejected suggestions
      all: string[];                 // Final combined list
    };
    
    // File naming (computed from available context)
    fileNaming: {
      pattern: string;               // e.g., "{band}_{event}_{date}_{index}"
      components: {
        band?: string;               // Coldplay
        event?: string;              // Glastonbury_2024
        location?: string;           // Worthy_Farm
        date?: string;               // 2024-06-28
        teams?: string;              // ManUtd_vs_Liverpool
      };
      preview: string;               // e.g., "Coldplay_Glastonbury_2024"
      examples: string[];            // ["Coldplay_Glastonbury_2024_001.jpg", ...]
    };
    
    // Commons templates (auto-generated)
    templates: {
      description: string;           // Wikitext description
      information: string;           // {{Information}} template
      categories: string;            // Category wikitext
      license: string;               // License template
    };
    
    // Summary for user review
    summary: {
      title: string;                 // "Coldplay at Glastonbury 2024"
      peopleCount: number;           // How many people involved
      organizationCount: number;     // How many orgs involved
      locationCount: number;         // How many locations
      autoCategories: number;        // How many auto categories
      estimatedQuality: 'low' | 'medium' | 'high'; // Based on completeness
    };
  };
  
  // Files and media
  files: {
    queue: Array<{
      file: File;
      id: string;                    // Unique identifier
      originalName: string;
      suggestedName: string;         // Based on computed naming
      suggestedCategories: string[]; // Based on computed categories
      userCategories: string[];      // User additions
      metadata: {
        size: number;
        type: string;
        dimensions?: { width: number; height: number };
        exif?: Record<string, any>;
        faces?: Array<{              // Detected faces (future feature)
          personId?: string;
          confidence: number;
          boundingBox: { x: number; y: number; width: number; height: number };
        }>;
      };
      status: 'pending' | 'processing' | 'ready' | 'uploaded' | 'error';
      error?: string;
    }>;
    
    uploaded: Array<{
      originalFile: File;
      commonsFilename: string;
      commonsUrl: string;
      uploadTimestamp: Date;
      finalCategories: string[];
    }>;
  };
  
  // Publishing state
  publishing: {
    status: 'draft' | 'ready' | 'publishing' | 'published' | 'error';
    actions: Array<{
      type: 'upload-file' | 'create-wikidata' | 'update-wikidata';
      target: string;                // Filename or entity ID
      status: 'pending' | 'success' | 'error';
      result?: any;
      error?: string;
    }>;
    publishedAt?: Date;
    publishedBy?: string;
  };
  
  // UI state (pane-specific, not shared)
  ui?: {
    currentStep?: number;
    completedSteps?: string[];
    activePane?: string;
    
    // Pane-specific UI state that doesn't affect other panes
    paneState?: {
      bandPerformers?: {
        searchQuery?: string;
        selectedTab?: 'band' | 'members' | 'additional';
        expandedSections?: string[];
      };
      
      eventDetails?: {
        datePickerOpen?: boolean;
        venueSearchOpen?: boolean;
        customFields?: Record<string, any>;
      };
      
      images?: {
        uploadProgress?: Record<string, number>;
        previewMode?: 'grid' | 'list';
        selectedFiles?: string[];
      };
      
      categories?: {
        showSuggestions?: boolean;
        filterType?: 'all' | 'auto' | 'manual';
        searchQuery?: string;
      };
      
      publish?: {
        reviewStep?: number;
        agreedToTerms?: boolean;
        selectedActions?: string[];
      };
      
      wikiPortraits?: {
        isWikiPortraitsJob?: boolean;
        addToWikiPortraitsConcerts?: boolean;
      };
    };
  };
  
  // Validation state (computed)
  validation: {
    isValid: boolean;
    errors: Array<{
      field: string;
      message: string;
      severity: 'error' | 'warning' | 'info';
      pane?: string;
    }>;
    warnings: Array<{
      field: string;
      message: string;
      suggestion?: string;
    }>;
    completeness: number;            // 0-100, how complete the data is
  };
  
  // Session metadata
  session: {
    id: string;                      // Session identifier
    createdAt: Date;
    lastModified: Date;
    version: number;                 // For conflict resolution
    savedAt?: Date;                  // Last saved to localStorage
  };
}

// Type definitions for roles
export type PersonRole = 
  | 'performer'           // Music performer
  | 'band-member'         // Band member
  | 'player'              // Soccer player
  | 'portrait-subject'    // Person being photographed
  | 'photographer'        // Person taking photos
  | 'creator'             // Content creator
  | 'featured-person';    // Generally featured person

export type OrganizationRole = 
  | 'main-band'           // Primary performing band
  | 'supporting-band'     // Supporting act
  | 'home-team'           // Home soccer team
  | 'away-team'           // Away soccer team
  | 'venue'               // Event venue
  | 'organizer'           // Event organizer
  | 'sponsor'             // Event sponsor
  | 'featured-organization'; // Generally featured org

export type LocationRole = 
  | 'venue'               // Event venue
  | 'city'                // City where event happened
  | 'country'             // Country
  | 'region'              // State/province/region
  | 'photo-location'      // Where photos were taken
  | 'featured-location';  // Generally featured location

export type EventRole = 
  | 'main-event'          // The primary event being documented
  | 'parent-event'        // Festival/tournament this is part of
  | 'sub-event'           // Part of a larger event
  | 'related-event'       // Related but separate event
  | 'series-event';       // Part of an ongoing series

// Utility types
export interface EntityWithRole<T = WikidataEntity> {
  entity: T;
  roles: string[];
  isNew?: boolean;
  source?: string;
  metadata?: Record<string, any>;
}

// Workflow-specific form getters (computed properties)
export interface WorkflowFormGetters {
  // Get all people who should appear in image tags/categories
  getImagePeople(): WikidataEntity[];
  
  // Get all organizations for categories
  getImageOrganizations(): WikidataEntity[];
  
  // Get the main event title for file naming
  getEventTitle(): string;
  
  // Get the date for file naming/categories
  getEventDate(): Date | null;
  
  // Get the primary location
  getPrimaryLocation(): WikidataEntity | null;
  
  // Get workflow-specific category suggestions
  getWorkflowCategories(): string[];
  
  // Get file naming components
  getFileNamingComponents(): Record<string, string>;
}