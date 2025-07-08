// Simple localStorage utility
export const setItem = (key: string, value: string) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem(key, value);
  }
};

export const getItem = (key: string): string => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem(key) || '';
  }
  return '';
};

export const removeItem = (key: string) => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(key);
  }
};

// Music event specific keys
export const KEYS = {
  // Author info
  AUTHOR_USERNAME: 'music-event-author-username',
  AUTHOR_FULLNAME: 'music-event-author-fullname',
  
  // Festival info
  FESTIVAL_NAME: 'music-event-festival-name',
  FESTIVAL_YEAR: 'music-event-festival-year',
  FESTIVAL_LOCATION: 'music-event-festival-location',
  FESTIVAL_COUNTRY: 'music-event-festival-country',
  FESTIVAL_BAND_ID: 'music-event-festival-band-id',
  FESTIVAL_BAND_NAME: 'music-event-festival-band-name',
  FESTIVAL_BAND_WIKIPEDIA: 'music-event-festival-band-wikipedia',
  FESTIVAL_BAND_WIKIDATA: 'music-event-festival-band-wikidata',
  FESTIVAL_BAND_MUSICBRAINZ: 'music-event-festival-band-musicbrainz',
  FESTIVAL_BAND_COUNTRY: 'music-event-festival-band-country',
  
  // Concert info
  CONCERT_VENUE: 'music-event-concert-venue',
  CONCERT_DATE: 'music-event-concert-date',
  CONCERT_CITY: 'music-event-concert-city',
  CONCERT_COUNTRY: 'music-event-concert-country',
  CONCERT_TOUR: 'music-event-concert-tour',
  CONCERT_ARTIST_ID: 'music-event-concert-artist-id',
  CONCERT_ARTIST_NAME: 'music-event-concert-artist-name',
  CONCERT_ARTIST_WIKIPEDIA: 'music-event-concert-artist-wikipedia',
  CONCERT_ARTIST_WIKIDATA: 'music-event-concert-artist-wikidata',
  CONCERT_ARTIST_MUSICBRAINZ: 'music-event-concert-artist-musicbrainz',
  CONCERT_ARTIST_COUNTRY: 'music-event-concert-artist-country',
};