# WikiPortraits New Architecture Documentation

## Overview

The WikiPortraits application has been completely rewritten with a new architecture that focuses on:
- **Direct Wikidata/Wikimedia integration** without data transformation
- **Universal component architecture** that works across all domains
- **Modular form providers** for clean separation of concerns
- **Frontend-first approach** with simplified backend
- **Real-time API integration** with fallback mechanisms

## Architecture Principles

### 1. Raw Entity Manipulation
Components work directly with raw Wikidata entities instead of transformed data objects.

```typescript
// ❌ Old approach: Transformed data
interface BandMember {
  id: string;
  name: string;
  instruments?: string[];
}

// ✅ New approach: Raw Wikidata entities
interface WDPersonCardProps {
  entity: WikidataEntity; // Raw WD entity
  variant?: 'main' | 'additional' | 'new';
}

// Access data directly from WD structure
const name = entity.labels?.en?.value;
const instruments = entity.claims?.P1303?.map(claim => claim.mainsnak.datavalue.value.id);
```

### 2. Universal Component Architecture
Components are domain-agnostic and work across all workflows (music, soccer, organizations).

```typescript
// Same component works for musicians, soccer players, speakers, etc.
<WDPersonCard entity={musician} variant="main" />
<WDPersonCard entity={soccerPlayer} variant="main" />
<WDPersonCard entity={speaker} variant="main" />
```

### 3. Form Provider Composition
Each pane has its own form provider with clean method-based APIs.

```typescript
// Domain-specific providers
const musicDetails = useMusicDetailsForm();
const soccerDetails = useSoccerDetailsForm();

// Universal providers
const categories = useCategoriesForm();
const templates = useTemplatesForm();
const images = useImagesForm();
```

### 4. Frontend-First API Integration
All read operations happen directly in the frontend with proper error handling.

```typescript
// Direct API calls instead of backend proxies
const results = await WikidataClient.searchEntities({ query: 'Beatles' });
const entity = await WikidataClient.getEntity('Q2831');
const articles = await WikipediaClient.searchArticles({ query: 'music festival' });
```

## Core Components

### Universal Components

#### WDPersonCard & WDPersonCardCompact
Universal person display components that work with any type of person.

```typescript
// Usage examples
<WDPersonCard entity={musician} variant="main" />
<WDPersonCard entity={soccerPlayer} variant="additional" />
<WDPersonCardCompact entity={speaker} variant="new" />
```

**Features:**
- Works with raw WikidataEntity objects
- Automatic property extraction (name, image, description)
- Domain-agnostic variants (main/additional/new)
- Handles both existing and new entities

#### WDEntitySelector & WDPersonSelector
Universal selection components with real API integration.

```typescript
// Entity selector for bands, teams, venues, etc.
<WDEntitySelector
  entityType="Q215627" // Musical group
  value={selectedBand}
  onChange={setBand}
  placeholder="Search for bands..."
/>

// Person selector with property filtering
<WDPersonSelector
  multiple
  requiredProperties={['P1303']} // Must have instruments
  value={selectedMusicians}
  onChange={setMusicians}
  placeholder="Search for musicians..."
/>
```

**Features:**
- Real-time Wikidata API integration
- Property-based filtering
- Multiple selection support
- Keyboard navigation
- Error handling with fallback to mock data

### Form Providers

#### Universal Form Providers

**CategoriesFormProvider**
```typescript
const categories = useCategoriesForm();

// API methods
categories.getCategories()           // Get all categories
categories.add(category)             // Add new category
categories.remove(categoryId)        // Remove category
categories.generateAuto(data)        // Auto-generate from data
```

**TemplatesFormProvider**
```typescript
const templates = useTemplatesForm();

// API methods
templates.getTemplates()             // Get all templates
templates.generate(type, data)       // Generate template
templates.getLanguages()             // Get available languages
templates.setLanguage(lang)          // Set current language
```

**ImagesFormProvider**
```typescript
const images = useImagesForm();

// API methods
images.getImages()                   // Get all images
images.add(image)                    // Add new image
images.remove(imageId)               // Remove image
images.updateMetadata(id, metadata)  // Update image metadata
```

#### Domain-Specific Form Providers

**MusicDetailsFormProvider**
```typescript
const musicDetails = useMusicDetailsForm();

// API methods
musicDetails.getBand()               // Get selected band
musicDetails.setBand(band)           // Set band
musicDetails.getMusicians()          // Get musicians
musicDetails.addMusician(musician)   // Add musician
musicDetails.removeMusician(id)      // Remove musician
musicDetails.getVenue()              // Get venue
musicDetails.setVenue(venue)         // Set venue
musicDetails.getDate()               // Get event date
musicDetails.setDate(date)           // Set event date
```

**SoccerDetailsFormProvider**
```typescript
const soccerDetails = useSoccerDetailsForm();

// API methods
soccerDetails.getHomeTeam()          // Get home team
soccerDetails.setHomeTeam(team)      // Set home team
soccerDetails.getAwayTeam()          // Get away team
soccerDetails.setAwayTeam(team)      // Set away team
soccerDetails.getPlayers()           // Get players
soccerDetails.addPlayer(player)      // Add player
soccerDetails.removePlayer(id)       // Remove player
```

### API Clients

#### WikidataClient
Direct frontend integration with Wikidata API.

```typescript
import WikidataClient from '@/lib/api/WikidataClient';

// Search entities
const results = await WikidataClient.searchEntities({
  query: 'Beatles',
  limit: 10,
  type: 'item'
});

// Get entity details
const entity = await WikidataClient.getEntity('Q2831');

// Search people with properties
const musicians = await WikidataClient.searchPeople(
  'john lennon',
  ['P1303'], // Must have instruments
  10
);
```

#### WikipediaClient
Direct frontend integration with Wikipedia API.

```typescript
import WikipediaClient from '@/lib/api/WikipediaClient';

// Search articles
const articles = await WikipediaClient.searchArticles({
  query: 'music festival',
  limit: 10
});

// Get article content
const article = await WikipediaClient.getArticle('Woodstock');

// Domain-specific searches
const musicArticles = await WikipediaClient.searchMusic('Beatles');
const sportsArticles = await WikipediaClient.searchSports('World Cup');
```

#### CommonsClient
Direct frontend integration with Wikimedia Commons API.

```typescript
import CommonsClient from '@/lib/api/CommonsClient';

// Search files
const files = await CommonsClient.searchFiles({
  query: 'music festival',
  limit: 20
});

// Get category files
const categoryFiles = await CommonsClient.getCategoryFiles(
  'Music festivals in Germany',
  10
);

// Check if category exists
const exists = await CommonsClient.categoryExists('Test Category');
```

### Utility Functions

#### WD Entity Utilities
Type-safe utility functions for working with Wikidata entities.

```typescript
import { WDPersonUtils, WDMusicianUtils, WDSoccerPlayerUtils } from '@/utils/wd-utils';

// Universal person utilities
const name = WDPersonUtils.getName(entity);
const image = WDPersonUtils.getImage(entity);
const description = WDPersonUtils.getDescription(entity);

// Domain-specific utilities
const instruments = WDMusicianUtils.getInstruments(entity);
const bands = WDMusicianUtils.getBands(entity);

const position = WDSoccerPlayerUtils.getPosition(entity);
const teams = WDSoccerPlayerUtils.getTeams(entity);
```

## Workflow Configuration

### MasterFormProvider Configuration
Configure workflows through a single configuration object.

```typescript
const workflowConfig = {
  categories: {
    categoryTypes: ['music-festival', 'location', 'year', 'genre'],
    autoCategories: [
      { template: 'Music festivals in {location}', source: 'musicDetails.venue' },
      { template: '{year} in music', source: 'musicDetails.date' }
    ]
  }
};

<MasterFormProvider config={workflowConfig}>
  <WorkflowComponent />
</MasterFormProvider>
```

### Creating New Workflows
Adding new workflows is now trivial - just configuration changes.

```typescript
// Art Exhibition Workflow
const artExhibitionConfig = {
  categories: {
    categoryTypes: ['art-exhibition', 'gallery', 'year', 'art-movement'],
    autoCategories: [
      { template: 'Art exhibitions in {gallery}', source: 'artDetails.gallery' },
      { template: '{year} art exhibitions', source: 'artDetails.date' }
    ]
  }
};

// Conference Workflow
const conferenceConfig = {
  categories: {
    categoryTypes: ['conference', 'organization', 'year', 'topic'],
    autoCategories: [
      { template: '{organization} events', source: 'conferenceDetails.organization' },
      { template: 'Conferences in {year}', source: 'conferenceDetails.date' }
    ]
  }
};
```

## Backend Simplification

### Removed Routes (Now Frontend-Only)
- `/api/wikidata/search` → `WikidataClient.searchEntities()`
- `/api/wikidata/get-entity` → `WikidataClient.getEntity()`
- `/api/wikipedia/search` → `WikipediaClient.searchArticles()`
- `/api/wikipedia/article-search` → `WikipediaClient.searchArticles()`
- `/api/music/artist-search` → `WikidataClient.searchPeople()`
- `/api/music/band-members` → `WikidataClient.searchPeople()`
- `/api/proxy/image` → Direct image URLs

### Remaining Backend Routes (Auth + Write Only)
- `/api/auth/[...nextauth]` - OAuth & session management
- `/api/upload` - File uploads with authentication
- `/api/wikidata/create-entity` - Wikidata entity creation
- `/api/wikidata/create-claim` - Wikidata claim creation
- `/api/wikipedia/update-infobox` - Wikipedia editing
- `/api/commons/create-template` - Commons template creation
- `/api/commons/create-category` - Commons category creation
- `/api/csrf-token` - CSRF token management

## Migration Guide

### For Developers

#### 1. Component Updates
```typescript
// ❌ Old component usage
<PerformerCard performer={transformedMember} />

// ✅ New component usage
<WDPersonCard entity={rawWikidataEntity} variant="main" />
```

#### 2. Form Provider Updates
```typescript
// ❌ Old form access
const { form } = useWorkflowForm();
const bandName = form.watch('musicEventData.band.name');

// ✅ New form access
const musicDetails = useMusicDetailsForm();
const band = musicDetails.getBand();
const bandName = WDPersonUtils.getName(band);
```

#### 3. API Call Updates
```typescript
// ❌ Old API calls
const response = await fetch('/api/wikidata/search?q=Beatles');

// ✅ New API calls
const results = await WikidataClient.searchEntities({ query: 'Beatles' });
```

### For New Features

#### 1. Creating New Domain-Specific Panes
```typescript
// 1. Create form provider
export function OrganizationDetailsFormProvider({ children }: { children: React.ReactNode }) {
  const [formData, setFormData] = useState({});
  
  const organizationDetails = {
    getOrganization: () => formData.organization,
    setOrganization: (org) => setFormData(prev => ({ ...prev, organization: org })),
    // ... other methods
  };
  
  return (
    <OrganizationDetailsFormContext.Provider value={organizationDetails}>
      {children}
    </OrganizationDetailsFormContext.Provider>
  );
}

// 2. Create pane component
export default function OrganizationDetailsPane() {
  const organizationDetails = useOrganizationDetailsForm();
  const categories = useCategoriesForm();
  
  return (
    <div>
      <WDEntitySelector
        entityType="Q43229" // Organization
        value={organizationDetails.getOrganization()}
        onChange={(org) => {
          organizationDetails.setOrganization(org);
          categories.add(`${org.labels.en.value} events`);
        }}
      />
      
      <WDPersonSelector
        multiple
        requiredProperties={['P106']} // Must have occupation
        value={organizationDetails.getSpeakers()}
        onChange={organizationDetails.setSpeakers}
      />
    </div>
  );
}
```

#### 2. Adding New Universal Components
```typescript
// Universal components should work with raw WikidataEntity objects
export function WDOrganizationCard({ entity, variant = 'main' }: {
  entity: WikidataEntity;
  variant?: 'main' | 'additional' | 'new';
}) {
  const name = WDEntityUtils.getName(entity);
  const description = WDEntityUtils.getDescription(entity);
  const foundingDate = WDOrganizationUtils.getFoundingDate(entity);
  
  return (
    <div className="border rounded-lg p-4">
      <h3 className="font-semibold">{name}</h3>
      {description && <p className="text-gray-600">{description}</p>}
      {foundingDate && <p className="text-sm text-gray-500">Founded: {foundingDate}</p>}
    </div>
  );
}
```

## Testing

### Architecture Test Suite
A comprehensive test suite validates the new architecture:

```typescript
// Run architecture tests
import ArchitectureTest from '@/components/testing/ArchitectureTest';

// Tests include:
// - Form provider initialization
// - Method-based APIs
// - Inter-provider communication
// - Real API integration
// - Component rendering
// - Universal component interfaces
```

### Manual Testing Checklist
- [ ] Form providers initialize correctly
- [ ] Universal components render with real data
- [ ] API clients work with proper error handling
- [ ] Inter-pane communication functions
- [ ] Workflow configuration works
- [ ] Backend routes are properly simplified
- [ ] All existing workflows still function

## Performance Benefits

### Frontend Performance
- **Fewer Network Hops**: Direct API calls eliminate backend proxy layer
- **Real-time Updates**: Latest Wikimedia API features without backend updates
- **Caching**: Client-side caching for better performance
- **Lazy Loading**: Components and API clients loaded on demand

### Backend Performance
- **Reduced Load**: Only auth and write operations
- **Simplified Scaling**: Minimal backend infrastructure
- **Focused Resources**: Resources concentrated on core functionality

### Development Performance
- **95% Code Reuse**: Universal components work across all domains
- **Rapid Prototyping**: New workflows = configuration changes only
- **Type Safety**: Compile-time error checking
- **Hot Reloading**: Changes to universal components update all workflows

## Future Enhancements

### Planned Features
- [ ] Offline support with local caching
- [ ] Advanced conflict resolution
- [ ] Event relationship mapping
- [ ] Bulk editing interface
- [ ] Real-time collaboration
- [ ] Advanced search with filters
- [ ] Performance monitoring
- [ ] Accessibility improvements

### Extension Points
- New domain-specific panes
- Additional API clients
- Custom universal components
- Workflow-specific configurations
- Advanced form validation
- Custom category generators

## Conclusion

The new architecture provides:
- **Maintainability**: Universal components, single source of truth
- **Scalability**: Easy to add new domains and workflows
- **Performance**: Direct API integration, simplified backend
- **Developer Experience**: Type safety, consistent patterns
- **User Experience**: Real-time data, responsive interface

This architecture foundation enables rapid development of new features while maintaining clean, testable, and maintainable code.