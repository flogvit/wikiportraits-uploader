import { MusicEventMetadata } from './music';

export interface ImageFile {
  id: string;
  file: File;
  preview: string;
  metadata: ImageMetadata;
}

export interface Caption {
  language: string; // ISO language code (e.g., 'en', 'no', 'de')
  text: string; // Short caption text
}

export interface ImageMetadata {
  description: string;
  author: string; // Generated from Q-ID using {{Creator:Q-ID}} format
  wikidataQid?: string;
  date: string;
  time?: string; // Time portion (HH:MM:SS)
  dateFromExif?: boolean; // Indicates if date came from EXIF data
  source: string;
  license: string;
  categories: string[];
  wikiPortraitsEvent: string;
  // Captions - short multilingual descriptions for structured data
  captions?: Caption[];
  // Music-specific fields
  musicEvent?: MusicEventMetadata;
  selectedBand?: string; // Band name selected for this specific image
  selectedBandMembers?: string[]; // Array of band member IDs for this specific image
  // GPS coordinates from EXIF or event location
  gps?: GPSMetadata;
  // Generated wikitext (editable by user)
  wikitext?: string;
  wikitextModified?: boolean; // Track if user has manually edited wikitext
  // Template to include in wikitext (editable by user)
  template?: string;
  templateModified?: boolean; // Track if user has manually edited template
  // WikiPortraits template (if this is a WikiPortraits job)
  wikiportraitsTemplate?: string;
  // Suggested filename for upload
  suggestedFilename?: string;
  // Personality rights permission
  permission?: string;
  permissionOverride?: string;
  // EXIF metadata status
  metadataStripped?: boolean;
  metadataWarnings?: string[];
  // Image flags
  setAsMainImage?: boolean;
  // WikiPortraits year context
  wikiportraitsYear?: string;
}

// Extended image file with optional fields used in different contexts
export interface ExistingImageFile {
  id: string;
  filename: string;
  commonsPageId: number;
  url: string;
  thumbUrl?: string;
  isExisting: boolean;
  metadata: {
    description?: string;
    categories?: string[];
    date?: string;
    author?: string;
    source?: string;
    license?: string;
  };
}

export interface GPSMetadata {
  latitude: number;
  longitude: number;
  source: 'exif' | 'event' | 'manual';
}

export type UploadType =
  | 'music'
  | 'general'
  | 'awards'
  | 'red-carpet'
  | 'press'
  | 'sports'
  | 'production'
  | 'political'
  | 'cultural'
  | 'corporate'
  | 'portraits';