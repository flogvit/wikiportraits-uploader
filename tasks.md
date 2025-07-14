# WikiPortraits Bulk Uploader - Tasks

## High Priority (Core Features)

### 1. Project Setup
- [x] Initialize Next.js project with TypeScript
- [x] Set up project structure (components, pages, api routes)
- [x] Install required dependencies (react-dropzone, lucide-react)
- [x] Configure environment variables for OAuth credentials

### 2. Authentication System
- [ ] Register OAuth consumer on Meta-Wiki (Special:OAuthConsumerRegistration)
- [x] Configure NextAuth.js with Wikimedia OAuth 2.0 provider
- [x] Request appropriate grants:
  - Basic editing rights
  - File upload permissions
  - High-volume editing (bot) rights
  - Wikidata editing permissions
- [x] Implement login/logout functionality
- [x] Handle OAuth token management and refresh

### 3. File Upload Interface
- [x] Create drag-and-drop file upload component
- [x] Support multiple image formats (JPEG, PNG, etc.)
- [x] Add file preview functionality
- [x] Implement file validation (size, format, etc.)
- [x] Add duplicate detection with warning modal
- [x] Implement click-to-view full image functionality
- [x] Create progress indicators for uploads

### 4. Metadata Management
- [x] Build metadata form for each image:
  - Image description
  - Author/photographer credit
  - Date taken
  - Source information
  - License selection (CC-BY-SA-4.0, etc.)
  - Categories (WikiPortraits event categories)
- [x] Implement metadata validation
- [x] Add template previews for Commons file pages

### 5. Commons Upload Implementation
- [x] Implement CSRF token fetching from Commons API
- [x] Build upload API route using `action=upload`
- [x] Generate proper Commons file descriptions using {{Information}} template
- [x] Handle upload responses and error cases
- [x] Implement chunked uploads for large files

## Medium Priority (Enhanced Features)

### 6. WikiPortraits Integration
- [x] Create category selection interface for WikiPortraits events
- [x] Implement automatic category tagging
- [x] Add WikiPortraits-specific metadata fields
- [x] Generate proper Commons categories structure

### 7. Wikidata Integration
- [x] Implement Wikidata item search functionality
- [x] Add P18 (image) claim creation via `wbcreateclaim` API
- [x] Handle existing image claims (detect and update)
- [x] Create QuickStatements export option for batch Wikidata edits

### 8. Queue and Progress Management
- [x] Implement upload queue with status tracking
- [x] Add batch processing capabilities
- [x] Create progress dashboard
- [x] Handle rate limiting and API throttling
- [x] Add retry mechanisms for failed uploads

### 9. Error Handling and Validation
- [x] Implement comprehensive error handling
- [x] Add user-friendly error messages
- [x] Create validation for file names and metadata
- [x] Handle API rate limits gracefully
- [x] Add logging and debugging capabilities

## Low Priority (Optional Features)

### 10. Wikipedia Infobox Updates
- [x] Implement Wikipedia article search
- [x] Add infobox image update functionality
- [ ] Handle different infobox template formats
- [ ] Create preview of infobox changes
- [ ] Implement semi-automated editing (user confirmation)

### 11. Advanced Features
- [ ] Add structured data support for Commons media
- [ ] Implement "depicts" statements for images
- [x] Create batch operations dashboard
- [x] Add export/import functionality for metadata
- [x] Implement bulk metadata editing
- [ ] Implement user preferences and settings

### 12. User Experience Enhancements
- [x] Add scroll-to-image functionality from upload queue
- [x] Implement expandable incomplete metadata list for large batches
- [x] Add duplicate file detection and warnings
- [x] Implement click-to-view full image modal
- [x] Fix text contrast issues in input fields
- [x] Add hover effects and visual feedback
- [x] Create scalable UI for bulk operations (150+ images)

### 13. Soccer Match Upload Feature
- [x] Create upload type selection interface (soccer, music, portraits, general)
- [x] Design multi-step soccer match workflow
- [x] Implement Wikipedia API integration for team search
- [x] Create team selector component with search functionality
- [x] Implement player selector with automatic team roster fetching
- [x] Generate automatic soccer-specific categories and metadata
- [x] Create match category page functionality
- [x] Extend metadata interface for soccer-specific fields
- [x] Integrate soccer workflow with existing upload system

## Technical Considerations

### Security & Compliance
- [ ] Ensure OAuth tokens are securely stored
- [ ] Implement proper CSRF protection
- [ ] Follow Wikimedia bot policy guidelines
- [ ] Add rate limiting to prevent abuse
- [ ] Implement proper error logging without exposing sensitive data

### Performance & UX
- [ ] Optimize for large file uploads
- [ ] Implement responsive design
- [ ] Add loading states and progress indicators
- [ ] Create intuitive user interface
- [ ] Add keyboard shortcuts and accessibility features

### Testing & Deployment
- [ ] Set up testing environment
- [ ] Create unit tests for API functions
- [ ] Implement integration tests
- [ ] Set up deployment pipeline
- [ ] Create user documentation

## Dependencies to Install
```json
{
  "next": "^14.0.0",
  "react": "^18.0.0",
  "next-auth": "^4.0.0",
  "typescript": "^5.0.0",
  "@types/node": "^20.0.0",
  "tailwindcss": "^3.0.0",
  "react-dropzone": "^14.0.0",
  "axios": "^1.0.0"
}
```

## Component Refactoring Plan

### Code Quality Improvements
- [x] Component bloat reduction and directory restructuring
- [ ] React Hook Form migration for better form management
- [x] Improved maintainability for open source contributors

### Phase 1: Setup & Dependencies
- [x] Add react-hook-form: `npm install react-hook-form @hookform/resolvers zod`
- [x] Create new directory structure (move files gradually)
- [x] Update import paths in existing files

### Phase 2: Component Splitting (Priority Order)
- [x] **ImageCard.tsx** (412 lines) → Split into 4 components:
  - `image/ImageCard.tsx` - Main card wrapper (100 lines)
  - `image/ImagePreview.tsx` - Thumbnail/preview (80 lines)
  - `forms/ImageMetadataForm.tsx` - Metadata editing form (150 lines)
  - `forms/CategoryForm.tsx` - Category management (80 lines)

- [x] **ImageUploader.tsx** (404 lines) → Split into 4 components:
  - `upload/ImageUploader.tsx` - Main coordinator (100 lines)
  - `upload/FileDropzone.tsx` - Drag/drop interface (100 lines)
  - `upload/FileProcessor.tsx` - EXIF/metadata extraction (120 lines)
  - `upload/DuplicateHandler.tsx` - Duplicate detection logic (80 lines)

- [x] **WikimediaWorkflow.tsx** (453 lines) → Split into 4 components:
  - `workflow/WikimediaWorkflow.tsx` - Main orchestrator (150 lines)
  - `workflow/steps/WorkflowStepper.tsx` - Step navigation (80 lines)
  - `workflow/steps/WorkflowStep.tsx` - Individual step wrapper (50 lines)
  - `workflow/WorkflowProvider.tsx` - Context/state management (100 lines)

- [x] **EventDetailsPane.tsx** (366 lines) → Split into 3 components:
  - `workflow/panes/EventDetailsPane.tsx` - Main pane (120 lines)
  - `forms/EventDetailsForm.tsx` - Form logic (150 lines)
  - `forms/FestivalDetailsForm.tsx` - Festival-specific form (100 lines)

- [x] **ArtistSelector.tsx** (329 lines) → Split into 3 components:
  - `selectors/ArtistSelector.tsx` - Main selector (150 lines)
  - `selectors/ArtistSearchInput.tsx` - Search input (100 lines)
  - `selectors/ArtistResultsList.tsx` - Results display (80 lines)

- [x] **BulkEditModal.tsx** (313 lines) → Split into 3 components:
  - `modals/BulkEditModal.tsx` - Modal wrapper (100 lines)
  - `forms/BulkEditForm.tsx` - Form logic (150 lines)
  - `forms/FieldSelector.tsx` - Field selection UI (60 lines)

### Phase 3: React Hook Form Migration (Priority Order)
- [x] **ImageMetadataForm** (highest impact) - Reduce 15+ useState hooks to 1 useForm
- [x] **BulkEditForm** (complex state management) - Dynamic field registration
- [x] **CategoriesPane** (form state management) - Category input and management
- [x] **EventDetailsForm** (nested data) - Handle nested object structures with validation
- [x] **TemplatesPane** (template generation) - Template code and language selection
- [x] **UploadPane** (upload state) - Upload progress and step management
- [ ] **Selector components** (API integration) - Better form state management

### Phase 4: Directory Structure
```
src/components/
├── ui/                    # Basic UI components
├── forms/                 # Form components
├── selectors/            # Search/selection components
├── modals/               # Modal dialogs
├── workflow/             # Workflow-specific components
│   ├── panes/
│   └── steps/
├── upload/               # Upload-related components
├── image/                # Image-related components
├── layout/               # Layout components
├── auth/                 # Authentication components
└── __tests__/           # Test files
```

### Phase 5: Testing & Cleanup
- [x] Update tests for new component structure
- [x] Verify all imports work correctly
- [x] Test form validation and user experience
- [x] Document new component structure
- [x] Complete React Hook Form migration for all major forms

**Estimated effort**: 2-3 weeks for gradual migration
**Benefits**: More maintainable, testable, and contributor-friendly codebase

## ✅ Component Refactoring Status: COMPLETED ✨

### Phase 1 & 2 Accomplishments:
- **✅ Dependencies**: Added react-hook-form, @hookform/resolvers, zod
- **✅ Directory Structure**: Created comprehensive organization system
- **✅ Component Splitting**: Successfully split 6 major components:
  - ImageCard.tsx (412 lines) → 4 components
  - ImageUploader.tsx (404 lines) → 4 components
  - WikimediaWorkflow.tsx (453 lines) → 4 components
  - EventDetailsPane.tsx (366 lines) → 3 components
  - ArtistSelector.tsx (329 lines) → 3 components
  - BulkEditModal.tsx (313 lines) → 3 components
- **✅ Component Organization**: Moved all 22 components to proper directories
- **✅ Import Updates**: All imports updated and working
- **✅ Build Success**: Project builds successfully with no errors

### Phase 3 & 4 Accomplishments:
- **✅ React Hook Form Migration**: Successfully migrated 6 major forms
  - ImageMetadataForm: Reduced 15+ useState hooks to 1 useForm hook
  - BulkEditForm: Implemented dynamic field registration with validation
  - CategoriesPane: Migrated category management and input state
  - EventDetailsForm: Complex nested form data with validation and error handling
  - TemplatesPane: Template generation with language selection
  - UploadPane: Upload progress and workflow step management
  - Added Zod schema validation for type safety across all forms
  - Improved performance with fewer re-renders
  - Enhanced developer experience with better form state management

- **✅ Unified Form Architecture**: Implemented single form provider pattern
  - Created WorkflowFormProvider with comprehensive schema covering all panes
  - **COMPLETELY ELIMINATED prop drilling** between workflow panes
  - Centralized form state management with single source of truth
  - Migrated ALL workflow panes (CategoriesPane, TemplatesPane, UploadPane, EventDetailsPane, ImagesPane) to use shared form context
  - **Removed redundant props** - panes now get data from form instead of props
  - Simplified component interfaces - most panes now only need `onComplete` prop
  - **Fixed directory structure** - organized workflow components into logical subdirectories
  - **Created dedicated workflows** - separate workflow for each upload type (general, soccer, music, portraits)
  - Improved data consistency and form validation across workflow steps
  - Better performance with shared form state and reduced re-renders

### Final Structure:
```
src/components/
├── auth/           # Authentication (LoginButton + test)
├── forms/          # Form components (4 components)
├── image/          # Image components (4 components)
├── layout/         # Layout components (3 components)
├── modals/         # Modal dialogs (5 components)
├── selectors/      # Search/selection (5 components)
├── ui/             # Basic UI components (ready for expansion)
├── upload/         # Upload components (5 components)
└── workflow/       # Workflow system (organized structure)
    ├── panes/      # All workflow panes (6 components)
    ├── providers/  # Context providers (2 providers)
    ├── steps/      # Step components (2 components)
    └── workflows/  # Dedicated workflows (6 components)
        ├── GeneralWorkflow.tsx     # Standard uploads
        ├── SoccerWorkflow.tsx      # Soccer matches
        ├── MusicWorkflow.tsx       # Music events
        ├── PortraitsWorkflow.tsx   # Portrait uploads
        ├── SoccerMatchWorkflow.tsx # Soccer data component
        └── WikimediaWorkflow.tsx   # Router component
```

### Impact:
- **Reduced complexity**: Large components split into focused units
- **Better maintainability**: Clear separation of concerns and unified form state
- **Improved testability**: Smaller, focused components with centralized form logic
- **Enhanced contributor experience**: Organized, discoverable structure
- **Scalability**: Easy to add new components and form fields in the right places
- **Better performance**: React Hook Form with unified state reduces re-renders significantly
- **Type safety**: Comprehensive Zod schema validation ensures robust data handling
- **Developer experience**: Cleaner, more modern React patterns with single source of truth
- **Eliminated prop drilling**: No more passing form data between components
- **Consistent form validation**: Cross-pane validation and form state management
- **Better UX**: Form state persistence across workflow navigation
- **Fixed infinite re-render bug**: EventDetailsForm now properly uses unified form context with eventDetails.* field paths
- **Eliminated redundant props**: Removed form data props from WikimediaWorkflow - all workflow data now flows through WorkflowFormProvider instead of prop drilling
- **Major prop reduction**: WikimediaWorkflow now takes only 6 props instead of 14 (57% reduction!) - eliminated all image manipulation props since they're handled by WorkflowFormProvider context
- **Complete data architecture unification**: Images are now managed entirely within WorkflowFormProvider just like all other workflow data - no more inconsistent data handling between images and other workflow state
- **Final prop elimination**: Removed uploadType prop from WorkflowStepper and WorkflowStep - they now get it from form context. WikimediaWorkflow reduced from 14 props to just 5 props (64% reduction!)
- **ULTIMATE ACHIEVEMENT**: Eliminated ALL remaining props from WikimediaWorkflow! Moved modal state and UI handlers (onExportMetadata, onBulkEdit, onScrollToImage, onImageClick) inside the workflow. WikimediaWorkflow now takes just 1 prop (uploadType) instead of 14 (93% reduction!)
- **FINAL CLEANUP**: Removed redundant UI handler props from all individual workflow components (GeneralWorkflow, SoccerWorkflow, MusicWorkflow, PortraitsWorkflow). Created WorkflowUIProvider context to cleanly provide UI actions to components that need them. All workflows now have zero props and get their functionality through context providers.
- **ELIMINATED DUPLICATE UPLOAD TYPE**: Removed redundant uploadType prop from WorkflowProvider since it's already available through WorkflowFormProvider context. This eliminates the need to pass the same data through multiple providers.
- **FINAL PANE SIMPLIFICATION**: Refactored all workflow panes (EventTypePane, EventDetailsPane, ImagesPane) to get data directly from form context instead of receiving it as props. Each pane now only needs `onComplete` callback. This eliminates ALL data prop drilling to individual panes.

## Data Flow Achievement
- **WorkflowStep**: Previously passed 8+ props to each pane → Now passes only `onComplete`
- **Panes**: Get all data directly from `useWorkflowForm()` and `useFormContext()`
- **Zero prop drilling**: All workflow data flows through unified context providers
- **Single source of truth**: All form data managed in one place with consistent access patterns
- **Template logic encapsulation**: Moved template calculation and image update logic from WorkflowStep to TemplatesPane for better separation of concerns
- **Clean interfaces**: All panes now have minimal, focused interfaces with only completion callbacks
- **Modernized SoccerMatchWorkflow**: Refactored old `SoccerMatchWorkflow.tsx` into `SoccerMatchForm.tsx` using React Hook Form instead of useState, moved to forms directory for better organization
- **Fixed workflow switching**: Added proper synchronization between uploadType prop changes and form context updates, ensuring workflow switches correctly when user selects different upload types (music, soccer, etc.)
- **Restored localStorage integration**: Centralized localStorage persistence in WorkflowFormProvider to automatically save/restore form data (festival details, author info, band selection) ensuring user data persists across sessions
- **Fixed undefined images crashes**: Added proper null checks for `images` array across all workflow panes (CategoriesPane, ImagesPane, UploadPane) to prevent runtime crashes when no images have been added yet
- **Fixed Categories pane music event generation**: Modified `hasValidData()` function to properly validate music event data and allow category generation without requiring images first - music event categories (festival/concert categories, WikiPortraits categories, band categories) now appear automatically when event details are completed
- **Renamed "Upload" step to "Publish"**: Updated UploadPane.tsx and WorkflowStepper.tsx to use "Publish" terminology since this step creates templates, publishes images, and completes the entire publishing process - more accurately reflects the comprehensive nature of this workflow step

## Code Quality & Cleanup

### TypeScript & Lint Fixes
- [x] **Fixed authOptions export issue** - Exported authOptions from NextAuth route for proper API authentication
- [x] **Eliminated unused variables** - Added underscore prefix to intentionally unused parameters
- [x] **Improved type safety** - Replaced 'any' types with proper TypeScript interfaces in API routes
- [x] **Code cleanup** - Removed unused imports and variables across components
- [x] **Build success** - Project compiles cleanly with no TypeScript errors

## API Endpoints Needed
- Commons: `https://commons.wikimedia.org/w/api.php`
- Wikidata: `https://wikidata.org/w/api.php`
- Wikipedia: `https://en.wikipedia.org/w/api.php` (and other language versions)
- OAuth: `https://meta.wikimedia.org/w/api.php`