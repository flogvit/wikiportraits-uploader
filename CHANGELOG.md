# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Added
- Auto-update image metadata and extract richer data from Commons
- Reorder workflow to start with WikiPortraits selection
- Centralized PublishDataProvider and migrated panes
- Expanded structured data and improved Commons API
- Multilingual captions support
- Expanded upload types with new event categories
- User settings configuration UI
- Utility functions for Commons and category handling
- API routes for Commons and Wikidata integration
- Filename uniqueness checking
- Open source documentation (CONTRIBUTING.md, CODE_OF_CONDUCT.md, SECURITY.md)

### Changed
- Simplified pane headers and improved UI interactions
- Improved type definitions and category generation
- Improved performer and entity handling
- Improved image ordering and personality rights permission
- Standardized User-Agent strings across all API calls

### Fixed
- Added await for async generateCommonsFilename calls
- Added null checks and improved image readiness detection
- Removed debug logging across components
