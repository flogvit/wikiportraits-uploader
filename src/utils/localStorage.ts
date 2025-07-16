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

// JSON utilities for complex objects
export const setJsonItem = (key: string, value: any) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem(key, JSON.stringify(value));
  }
};

export const getJsonItem = <T>(key: string, defaultValue: T): T => {
  if (typeof window !== 'undefined') {
    const item = localStorage.getItem(key);
    if (item) {
      try {
        return JSON.parse(item);
      } catch (e) {
        console.warn(`Failed to parse localStorage item for key "${key}":`, e);
      }
    }
  }
  return defaultValue;
};

// Application-wide keys
export const KEYS = {
  // Author info (used for all upload types) - Q-ID only, fetch name from Wikidata
  AUTHOR_WIKIDATA_QID: 'author-wikidata-qid',
  
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
  
  // Band members
  BAND_MEMBERS: 'music-event-band-members',
  PENDING_BAND_MEMBERS: 'music-event-pending-band-members',
  SELECTED_BAND_MEMBERS: 'music-event-selected-band-members',
};

// Band member utilities
export const saveBandMembers = (bandId: string, members: any[]) => {
  if (!bandId) return;
  const key = `${KEYS.BAND_MEMBERS}-${bandId}`;
  setJsonItem(key, members);
};

export const loadBandMembers = (bandId: string): any[] => {
  if (!bandId) return [];
  const key = `${KEYS.BAND_MEMBERS}-${bandId}`;
  return getJsonItem(key, []);
};

export const savePendingBandMembers = (bandId: string, pendingMembers: any[]) => {
  if (!bandId) return;
  const key = `${KEYS.PENDING_BAND_MEMBERS}-${bandId}`;
  setJsonItem(key, pendingMembers);
};

export const loadPendingBandMembers = (bandId: string): any[] => {
  if (!bandId) return [];
  const key = `${KEYS.PENDING_BAND_MEMBERS}-${bandId}`;
  return getJsonItem(key, []);
};

export const saveSelectedBandMembers = (bandId: string, selectedMembers: string[]) => {
  if (!bandId) return;
  const key = `${KEYS.SELECTED_BAND_MEMBERS}-${bandId}`;
  setJsonItem(key, selectedMembers);
};

export const loadSelectedBandMembers = (bandId: string): string[] => {
  if (!bandId) return [];
  const key = `${KEYS.SELECTED_BAND_MEMBERS}-${bandId}`;
  return getJsonItem(key, []);
};

export const clearBandMemberData = (bandId: string) => {
  if (!bandId) return;
  const bandMembersKey = `${KEYS.BAND_MEMBERS}-${bandId}`;
  const pendingMembersKey = `${KEYS.PENDING_BAND_MEMBERS}-${bandId}`;
  const selectedMembersKey = `${KEYS.SELECTED_BAND_MEMBERS}-${bandId}`;
  
  removeItem(bandMembersKey);
  removeItem(pendingMembersKey);
  removeItem(selectedMembersKey);
};

// Author utilities - Q-ID only, names fetched from Wikidata
export const saveAuthorWikidataQid = (qid: string) => {
  setItem(KEYS.AUTHOR_WIKIDATA_QID, qid);
};

export const loadAuthorWikidataQid = (): string => {
  return getItem(KEYS.AUTHOR_WIKIDATA_QID);
};

export const clearAuthorWikidataQid = () => {
  removeItem(KEYS.AUTHOR_WIKIDATA_QID);
};