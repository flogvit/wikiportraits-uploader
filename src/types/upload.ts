import { MusicEventMetadata } from './music';

export interface ImageFile {
  id: string;
  file: File;
  preview: string;
  metadata: ImageMetadata;
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
}

export interface GPSMetadata {
  latitude: number;
  longitude: number;
  source: 'exif' | 'event' | 'manual';
}

export type UploadType = 'music';