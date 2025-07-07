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

## API Endpoints Needed
- Commons: `https://commons.wikimedia.org/w/api.php`
- Wikidata: `https://wikidata.org/w/api.php`
- Wikipedia: `https://en.wikipedia.org/w/api.php` (and other language versions)
- OAuth: `https://meta.wikimedia.org/w/api.php`