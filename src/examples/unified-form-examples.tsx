/**
 * Examples showing how different panes interact with the Unified Form Structure
 * No event bus needed - everything reactive through form watch/setValue
 *
 * NOTE: These are illustrative examples showing the intended API patterns.
 * Types may not match the current implementation exactly.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import React from 'react';
import { useFormContext } from 'react-hook-form';
import { UniversalFormData, PersonRole, OrganizationRole } from '../types/unified-form';
import { WikidataEntity } from '../types/wikidata';

// Example 1: BandPerformersPane
export function BandPerformersPane() {
  const { watch, setValue } = useFormContext<UniversalFormData>();
  
  // Watch relevant data
  const entities = watch('entities');
  const eventDetails = watch('eventDetails');
  const computed = watch('computed');
  
  const addMainBand = (band: WikidataEntity) => {
    // Add to organizations (runtime uses EntityWithRole wrapper)
    const currentOrgs = entities.organizations || [];
    (setValue as any)('entities.organizations', [
      ...currentOrgs,
      {
        entity: band,
        roles: ['main-band' as OrganizationRole],
        source: 'band-performers',
        isNew: band.id.startsWith('temp-')
      }
    ]);

    // Set in event details
    (setValue as any)('eventDetails.mainBand', band);
    
    // Form automatically recomputes categories, file naming, etc.!
  };
  
  const addPerformer = (person: WikidataEntity) => {
    const currentPeople = entities.people || [];
    (setValue as any)('entities.people', [
      ...currentPeople,
      {
        entity: person,
        roles: ['performer' as PersonRole],
        source: 'band-performers'
      }
    ]);
    
    // Categories automatically update to include "Photos of [Person]"
    // File naming automatically includes band name
  };
  
  return (
    <div>
      <h2>Band & Performers</h2>
      
      {/* Show automatically computed preview */}
      <div className="bg-blue-50 p-4">
        <h3>Auto-computed Data:</h3>
        <p><strong>File naming:</strong> {computed.fileNaming.preview}</p>
        <p><strong>Auto categories:</strong> {computed.categories.auto.map(c => c.name).join(', ')}</p>
      </div>
      
      {/* Band selection UI... */}
    </div>
  );
}

// Example 2: EventDetailsPane  
export function EventDetailsPane() {
  const { watch, setValue } = useFormContext<UniversalFormData>();
  
  const eventDetails = watch('eventDetails');
  const workflowType = watch('workflowType');
  const computed = watch('computed');
  
  const setEventName = (name: string) => {
    setValue('eventDetails.title' as any, name);
    // This automatically updates:
    // - File naming preview
    // - Category suggestions
    // - Commons templates
  };

  const setEventDate = (date: Date) => {
    setValue('eventDetails.date' as any, date);
    // Automatically adds year categories, updates file naming
  };
  
  const setVenue = (venue: WikidataEntity) => {
    // Add to locations
    const currentLocations = watch('entities.locations') || [];
    (setValue as any)('entities.locations', [
      ...currentLocations,
      {
        entity: venue,
        roles: ['venue'],
        source: 'event-details'
      }
    ]);

    if (workflowType === 'music-event') {
      (setValue as any)('eventDetails.venue', venue);
    }
    
    // Automatically adds location-based categories
  };
  
  return (
    <div>
      <h2>Event Details</h2>
      
      {/* Show real-time updates */}
      <div className="bg-green-50 p-4">
        <h3>Live Preview:</h3>
        <p><strong>Title:</strong> {computed.summary.title}</p>
        <p><strong>Categories:</strong> {computed.categories.all.length} total</p>
        <p><strong>File pattern:</strong> {computed.fileNaming.pattern}</p>
      </div>
    </div>
  );
}

// Example 3: ImagesPane (knows about everything automatically!)
export function ImagesPane() {
  const { watch, setValue } = useFormContext<UniversalFormData>();
  
  const entities = watch('entities');
  const computed = watch('computed');
  const files = watch('files');
  
  // Get all people who should be in image tags (from ANY source)
  const imagePeople = entities.people?.filter((p: any) =>
    p.roles?.some((role: string) => ['performer', 'player', 'portrait-subject'].includes(role))
  ) || [];

  // Get all organizations for tagging
  const imageOrganizations = entities.organizations?.filter((o: any) =>
    o.roles?.some((role: string) => ['main-band', 'home-team', 'away-team'].includes(role))
  ) || [];
  
  const addFile = (file: File) => {
    const newFile = {
      file,
      id: `file-${Date.now()}`,
      originalName: file.name,
      suggestedName: `${computed.fileNaming.preview}_${String(files.queue.length + 1).padStart(3, '0')}.jpg`,
      suggestedCategories: computed.categories.all,
      userCategories: [],
      metadata: {
        size: file.size,
        type: file.type
      },
      status: 'pending' as const
    };
    
    setValue('files.queue', [...(files.queue || []), newFile]);
  };
  
  return (
    <div>
      <h2>Images & Media</h2>

      {/* Show linked entities (from ANY pane) */}
      <div className="bg-yellow-50 p-4">
        <h3>Linked Entities:</h3>
        <p><strong>People:</strong> {imagePeople.map((p: any) => p.entity?.labels?.en?.value || p.labels?.en?.value).join(', ')}</p>
        <p><strong>Organizations:</strong> {imageOrganizations.map((o: any) => o.entity?.labels?.en?.value || o.labels?.en?.value).join(', ')}</p>
      </div>
      
      {/* File upload with auto-naming */}
      <div>
        <p>Files will be named: <code>{computed.fileNaming.examples[0]}</code></p>
        <p>Auto-categories: {computed.categories.auto.length}</p>
      </div>
    </div>
  );
}

// Example 4: SoccerTeamPane (works with same structure!)
export function SoccerTeamPane() {
  const { watch, setValue } = useFormContext<UniversalFormData>();
  
  const entities = watch('entities');
  
  const setHomeTeam = (team: WikidataEntity) => {
    const currentOrgs = entities.organizations || [];
    (setValue as any)('entities.organizations', [
      ...currentOrgs,
      {
        entity: team,
        roles: ['home-team' as OrganizationRole],
        source: 'soccer-teams'
      }
    ]);

    (setValue as any)('eventDetails.homeTeam', team);
    
    // ImagesPane automatically sees this team for tagging!
    // Categories automatically include "Manchester United players" etc.
  };
  
  const addPlayer = (player: WikidataEntity) => {
    const currentPeople = entities.people || [];
    (setValue as any)('entities.people', [
      ...currentPeople,
      {
        entity: player,
        roles: ['player' as PersonRole],
        source: 'soccer-teams'
      }
    ]);
    
    // Player automatically appears in ImagesPane as "linked person"
    // Categories automatically include player names
  };
  
  return (
    <div>
      <h2>Soccer Match</h2>
      {/* Soccer-specific UI, but uses same entity structure */}
    </div>
  );
}

// Example 5: CategoriesPane (reads computed categories)
export function CategoriesPane() {
  const { watch, setValue } = useFormContext<UniversalFormData>();
  
  const computed = watch('computed');
  const entities = watch('entities');
  const eventDetails = watch('eventDetails');
  
  // Categories are automatically computed from all the above data!
  const autoCategories = computed.categories.auto || [];
  const suggestedCategories = computed.categories.suggested || [];
  
  const acceptSuggestion = (categoryName: string) => {
    const currentManual = computed.categories.manual || [];
    setValue('computed.categories.manual', [...currentManual, categoryName]);
    
    // Remove from suggestions
    const filtered = suggestedCategories.filter(s => s.name !== categoryName);
    setValue('computed.categories.suggested', filtered);
  };
  
  return (
    <div>
      <h2>Categories</h2>
      
      {/* Auto-generated categories */}
      <div>
        <h3>Auto-generated ({autoCategories.length})</h3>
        {autoCategories.map(cat => (
          <div key={cat.name}>
            {cat.name} <small>({cat.source})</small>
          </div>
        ))}
      </div>
      
      {/* Show what data this is based on */}
      <div className="bg-gray-50 p-4">
        <h4>Based on:</h4>
        <ul>
          <li>Event: {eventDetails.title}</li>
          <li>People: {entities.people?.length || 0}</li>
          <li>Organizations: {entities.organizations?.length || 0}</li>
          <li>Locations: {entities.locations?.length || 0}</li>
        </ul>
      </div>
    </div>
  );
}

// Example 6: Form-level computed updates (would be in a provider/hook)
export function useComputedUpdates() {
  const { watch, setValue } = useFormContext<UniversalFormData>();
  
  const entities = watch('entities');
  const eventDetails = watch('eventDetails');
  const workflowType = watch('workflowType');
  
  // Automatically update computed fields when base data changes
  React.useEffect(() => {
    // Update file naming
    const fileNamingComponents = generateFileNamingComponents(entities, eventDetails, workflowType);
    setValue('computed.fileNaming.components', fileNamingComponents);
    setValue('computed.fileNaming.preview', generateFileNamePreview(fileNamingComponents));
    
    // Update categories
    const autoCategories = generateAutoCategories(entities, eventDetails, workflowType);
    setValue('computed.categories.auto', autoCategories as any);
    
    // Update summary
    const summary = generateSummary(entities, eventDetails);
    setValue('computed.summary', summary);
    
  }, [entities, eventDetails, workflowType, setValue]);
}

// Helper functions (would be in separate utils)
function generateFileNamingComponents(entities: any, eventDetails: any, workflowType: string) {
  const components: Record<string, string> = {};
  
  if (workflowType === 'music-event') {
    const mainBand = entities.organizations?.find((o: any) => o.roles.includes('main-band'));
    if (mainBand) components.band = sanitizeForFilename(mainBand.entity.labels?.en?.value);
    
    if (eventDetails.title) components.event = sanitizeForFilename(eventDetails.title);
  }
  
  if (workflowType === 'soccer-match') {
    const homeTeam = entities.organizations?.find((o: any) => o.roles.includes('home-team'));
    const awayTeam = entities.organizations?.find((o: any) => o.roles.includes('away-team'));
    if (homeTeam && awayTeam) {
      components.teams = `${sanitizeForFilename(homeTeam.entity.labels?.en?.value)}_vs_${sanitizeForFilename(awayTeam.entity.labels?.en?.value)}`;
    }
  }
  
  if (eventDetails.date) {
    components.date = eventDetails.date.toISOString().split('T')[0];
  }
  
  return components;
}

function generateAutoCategories(entities: any, eventDetails: any, workflowType: string) {
  const categories = [];
  
  // Add organization-based categories
  entities.organizations?.forEach((org: any) => {
    if (org.roles.includes('main-band')) {
      categories.push({
        name: `${org.entity.labels?.en?.value} concerts`,
        source: 'band',
        confidence: 0.9,
        reasoning: 'Main performing band'
      });
    }
  });
  
  // Add person-based categories  
  entities.people?.forEach((person: any) => {
    if (person.roles.includes('performer')) {
      categories.push({
        name: `Photos of ${person.entity.labels?.en?.value}`,
        source: 'person',
        confidence: 0.8,
        reasoning: 'Performing person'
      });
    }
  });
  
  // Add date-based categories
  if (eventDetails.date) {
    const year = eventDetails.date.getFullYear();
    categories.push({
      name: `${year} concerts`,
      source: 'date', 
      confidence: 0.7,
      reasoning: 'Event year'
    });
  }
  
  return categories;
}

function sanitizeForFilename(str: string): string {
  return str?.replace(/[^a-zA-Z0-9]/g, '_') || '';
}

function generateFileNamePreview(components: Record<string, string>): string {
  const parts = [components.band, components.event || components.teams, components.date].filter(Boolean);
  return parts.join('_');
}

function generateSummary(entities: any, eventDetails: any) {
  return {
    title: eventDetails.title || 'Untitled Event',
    peopleCount: entities.people?.length || 0,
    organizationCount: entities.organizations?.length || 0,
    locationCount: entities.locations?.length || 0,
    autoCategories: 0, // Would be computed
    estimatedQuality: 'medium' as const
  };
}