export interface MusicArtist {
  id: string;
  name: string;
  wikipediaUrl?: string;
  wikidataUrl?: string;
  musicbrainzId?: string;
  country?: string;
  entityType?: 'person' | 'group' | 'unknown';
  source?: 'wikidata' | 'wikipedia';
}

export interface BandMember {
  id: string;
  name: string;
  wikipediaUrl?: string;
  wikidataUrl?: string;
  instruments?: string[];
  role?: string;
  memberFrom?: string;
  memberTo?: string;
  birthDate?: string;
  nationality?: string;
  imageUrl?: string;
  bandQID?: string; // Wikidata ID of the band this member belongs to
  new?: boolean; // True if this is a new performer to be created in Wikidata
  type?: 'band_member' | 'additional_artist'; // Type for categorization on reload
}

export interface Band extends MusicArtist {
  members?: BandMember[];
  formedYear?: string;
}

export interface Festival {
  id: string;
  name: string;
  year: string;
  location: string;
  country: string;
  startDate?: string;
  endDate?: string;
  wikipediaUrl?: string;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
}

export interface Concert {
  id: string;
  artist: MusicArtist;
  venue: string;
  date: string;
  city: string;
  country: string;
  tour?: string;
  wikipediaUrl?: string;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
}

export interface FestivalMetadata {
  festival: Festival;
  selectedBands: Band[];
  addToWikiPortraitsConcerts: boolean;
  authorUsername?: string;
  authorFullName?: string;
}

export interface ConcertMetadata {
  concert: Concert;
  addToWikiPortraitsConcerts: boolean;
  authorUsername?: string;
  authorFullName?: string;
}

export type MusicEventType = 'festival' | 'concert';

export interface MusicEventMetadata {
  eventType: MusicEventType;
  festivalData?: FestivalMetadata;
  concertData?: ConcertMetadata;
}

// Pending Wikidata entity creation
export interface PendingWikidataEntity {
  id: string; // Temporary ID for tracking
  type: 'band' | 'band_member' | 'artist';
  status: 'pending' | 'creating' | 'created' | 'failed';
  name: string;
  description?: string;
  data: PendingBandData | PendingBandMemberData;
  wikidataId?: string; // Set after successful creation
  error?: string;
  new?: boolean; // Mark as new for later WD creation
}

export interface PendingBandData {
  name: string;
  country?: string;
  formedYear?: string;
  genre?: string;
  wikipediaUrl?: string;
  members?: string[]; // IDs of pending band members
}

export interface PendingBandMemberData {
  name: string;
  legalName?: string; // "Also known as" field
  instruments?: string[];
  role?: string;
  nationality?: string; // Wikidata Q-code for country of citizenship
  nationalityName?: string; // Display name for nationality
  gender?: 'male' | 'female' | 'non-binary gender' | 'trans man' | 'trans woman';
  birthDate?: string; // Birth date for P569 (date of birth)
  bandId?: string; // ID of the band (existing or pending)
  isBandMember?: boolean; // Whether this artist is a band member or guest/other
  wikidataUrl?: string; // URL to Wikidata page
  wikipediaUrl?: string; // URL to Wikipedia page
  imageUrl?: string; // URL to image on Commons
}

export interface WikidataCreationPlan {
  pendingEntities: PendingWikidataEntity[];
  relationships: PendingWikidataRelationship[];
}

export interface PendingWikidataRelationship {
  id: string;
  type: 'band_membership'; // Can be extended for other relationship types
  subjectId: string; // ID of the subject entity (band member)
  objectId: string; // ID of the object entity (band)
  property: string; // Wikidata property (e.g., 'P463' for member of)
  status: 'pending' | 'creating' | 'created' | 'failed';
  error?: string;
}