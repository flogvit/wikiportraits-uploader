# 🎯 Unified Form Architecture - Complete Solution

## 🎪 The Problem We Solved

**Before:** Dual complexity with form + event bus
- Form system for UI state
- Event bus for inter-pane communication  
- Complex synchronization between systems
- Panes knowing about each other (`if payload.pane === 'images'`)

**After:** Single unified form system
- All data in one reactive form structure
- Cross-pane communication through shared form state
- Automatic computed fields (categories, file naming, templates)
- Panes are completely decoupled - they just read/write form fields

## 🏗️ Key Architecture Principles

### 1. **Semantic Entity Structure**
```typescript
entities: {
  people: [{ entity: WikidataEntity, roles: ['performer', 'player'] }]
  organizations: [{ entity: WikidataEntity, roles: ['main-band', 'home-team'] }]
  locations: [{ entity: WikidataEntity, roles: ['venue'] }]
}
```
- Universal entities work across ALL workflows
- Role-based system allows same entity to have multiple purposes
- ImagesPane automatically gets ALL people/organizations for tagging

### 2. **Workflow-Agnostic Design**
```typescript
workflowType: 'music-event' | 'soccer-match' | 'portraits' | 'general-upload'
```
- Same form structure supports all current + future workflows
- Computed fields adapt automatically to workflow type
- Easy to add new workflows without breaking existing panes

### 3. **Automatic Computed Fields** 
```typescript
computed: {
  categories: { auto: [...], suggested: [...] }  // From entities + event details
  fileNaming: { preview: "Coldplay_Glastonbury_2024" }  // From available context  
  templates: { description: "...", information: "..." }  // For Commons upload
}
```
- No manual synchronization needed
- Categories auto-update when you add performers, change event name, etc.
- File naming auto-updates with available context

## 🎯 Solving Your Use Cases

### ✅ Music Event Categories
```typescript
// EventDetailsPane sets name + date
setValue('eventDetails.common.title', 'Glastonbury 2024');
setValue('eventDetails.common.date', new Date('2024-06-28'));

// BandPerformersPane adds band
setValue('entities.organizations', [...orgs, { entity: coldplay, roles: ['main-band'] }]);

// Categories automatically computed:
// - "Glastonbury Festival 2024"
// - "Coldplay concerts" 
// - "2024 concerts"
// - "Music festivals in England"
```

### ✅ Cross-Pane Data Sharing
```typescript
// BandPerformersPane adds performers
const performers = watch('entities.people'); 

// ImagesPane automatically sees them (no event bus!)
const imagePeople = watch('entities.people').filter(p => 
  p.roles.includes('performer')
);

// File naming automatically includes band name
const fileNaming = watch('computed.fileNaming.preview'); 
// -> "Coldplay_Glastonbury_2024"
```

### ✅ File Naming Context
```typescript
// ImagesPane knows everything automatically:
computed.fileNaming: {
  components: {
    band: "Coldplay",           // From BandPerformersPane
    event: "Glastonbury_2024",  // From EventDetailsPane  
    date: "2024-06-28"          // From EventDetailsPane
  },
  preview: "Coldplay_Glastonbury_2024",
  examples: ["Coldplay_Glastonbury_2024_001.jpg", "Coldplay_Glastonbury_2024_002.jpg"]
}
```

### ✅ Universal Workflows
```typescript
// Same structure works for ALL workflows:

// Soccer match
entities.organizations = [
  { entity: manUtd, roles: ['home-team'] },
  { entity: liverpool, roles: ['away-team'] }
];
// -> File naming: "ManUtd_vs_Liverpool_2024-03-15"
// -> Categories: "Manchester United players", "Liverpool FC matches"

// Portraits  
entities.people = [
  { entity: johnSmith, roles: ['portrait-subject'] }
];
// -> File naming: "Portrait_JohnSmith_2024-03-15"
// -> Categories: "Portraits of John Smith"
```

## 🚀 Implementation Benefits

### 1. **No Event Bus Complexity**
- ❌ No `await globalEventBus.emit()`
- ❌ No `globalEventBus.subscribe()`  
- ❌ No event name coordination
- ✅ Just `setValue()` and `watch()`

### 2. **Perfect React Integration**
- ✅ Built on React Hook Form (already used)
- ✅ Automatic re-renders when data changes
- ✅ Built-in validation system
- ✅ TypeScript integration

### 3. **Automatic Data Flow**
```
BandPerformersPane -> setValue('entities.people', [...])
                           ↓
ImagesPane -> watch('entities.people') -> auto-updates
                           ↓  
CategoriesPane -> watch('computed.categories') -> auto-updates
                           ↓
PublishPane -> watch('computed.templates') -> auto-updates
```

### 4. **Future-Proof Extensibility**
```typescript
// Add new workflow type
workflowType: 'art-exhibition' | 'conference' | 'wedding'

// Add new entity type  
entities.artworks: [{ entity: WikidataEntity, roles: ['featured-artwork'] }]

// Existing panes automatically work with new entity types!
```

## 🎪 Real-World Example Flow

```typescript
// 1. User selects "Music Event" workflow
setValue('workflowType', 'music-event');

// 2. EventDetailsPane: User enters event details
setValue('eventDetails.common.title', 'Glastonbury 2024');
setValue('eventDetails.common.date', new Date('2024-06-28'));
// -> Automatically computes: categories.auto = ["2024 concerts", "Glastonbury Festival 2024"]
// -> Automatically computes: fileNaming.components.event = "Glastonbury_2024"

// 3. BandPerformersPane: User adds Coldplay  
setValue('entities.organizations', [{ entity: coldplay, roles: ['main-band'] }]);
// -> Automatically adds: categories.auto = ["Coldplay concerts"]
// -> Automatically updates: fileNaming.components.band = "Coldplay" 
// -> fileNaming.preview = "Coldplay_Glastonbury_2024"

// 4. BandPerformersPane: User adds band members
setValue('entities.people', [
  { entity: chrisMartin, roles: ['performer'] },
  { entity: jonnyBuckland, roles: ['performer'] }
]);
// -> Automatically adds: categories.auto = ["Photos of Chris Martin", "Photos of Jonny Buckland"]

// 5. ImagesPane: User uploads files
// -> Sees: "Linked Entities: Chris Martin, Jonny Buckland, Coldplay"
// -> Files auto-named: "Coldplay_Glastonbury_2024_001.jpg"
// -> Files auto-categorized with ALL above categories

// 6. PublishPane: Ready to upload
// -> Commons description auto-generated from all context
// -> Categories = ["Coldplay concerts", "2024 concerts", "Glastonbury Festival 2024", "Photos of Chris Martin", "Photos of Jonny Buckland"]
```

## 🎯 Next Steps

1. **Convert existing panes** to use unified form structure
2. **Implement computed field logic** in form provider  
3. **Add form validation rules** for cross-pane consistency
4. **Create form persistence** (localStorage, versioning)
5. **Build workflow configuration** system for custom fields

This unified approach is **much cleaner**, **more maintainable**, and **perfectly aligned** with React's reactive principles! 🎉