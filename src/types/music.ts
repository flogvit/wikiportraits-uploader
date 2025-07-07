export interface MusicArtist {
  id: string;
  name: string;
  genre?: string;
  country?: string;
  wikipediaUrl?: string;
}

export interface Band extends MusicArtist {
  members?: string[];
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
}

export interface FestivalMetadata {
  festival: Festival;
  selectedBands: Band[];
  addToWikiPortraitsConcerts: boolean;
}

export interface ConcertMetadata {
  concert: Concert;
  addToWikiPortraitsConcerts: boolean;
}

export type MusicEventType = 'festival' | 'concert';

export interface MusicEventMetadata {
  eventType: MusicEventType;
  festivalData?: FestivalMetadata;
  concertData?: ConcertMetadata;
}