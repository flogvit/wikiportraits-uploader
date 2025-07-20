'use client';

import React, { createContext, useContext, useCallback, useEffect } from 'react';
import { useFormContext } from 'react-hook-form';
import { WikidataEntity } from '@/types/wikidata';

interface MusicEvent {
  id: string;
  name: string;
  type: 'festival' | 'concert' | 'tour';
  date: string;
  venue: string;
  location: string;
  country: string;
  description?: string;
  wikipediaUrl?: string;
  wikidataId?: string;
}

interface MusicDetailsFormContextType {
  // Event details
  getEvent: () => MusicEvent | null;
  setEvent: (event: MusicEvent) => void;
  
  // Festival/Concert specific
  getFestival: () => MusicEvent | null;
  setFestival: (festival: MusicEvent) => void;
  
  // Band/Artist management
  getBand: () => WikidataEntity | null;
  setBand: (band: WikidataEntity) => void;
  getBands: () => WikidataEntity[];
  setBands: (bands: WikidataEntity[]) => void;
  addBand: (band: WikidataEntity) => void;
  removeBand: (bandId: string) => void;
  
  // Musicians management
  getMusicians: () => WikidataEntity[];
  setMusicians: (musicians: WikidataEntity[]) => void;
  addMusician: (musician: WikidataEntity) => void;
  removeMusician: (musicianId: string) => void;
  
  // Venue details
  getVenue: () => WikidataEntity | null;
  setVenue: (venue: WikidataEntity) => void;
  
  // Date/time
  getDate: () => string | null;
  setDate: (date: string) => void;
  getStartTime: () => string | null;
  setStartTime: (time: string) => void;
  getEndTime: () => string | null;
  setEndTime: (time: string) => void;
  
  // Additional details
  getGenres: () => string[];
  setGenres: (genres: string[]) => void;
  addGenre: (genre: string) => void;
  removeGenre: (genre: string) => void;
  
  // Validation
  validate: () => boolean;
  clear: () => void;
}

const MusicDetailsFormContext = createContext<MusicDetailsFormContextType | undefined>(undefined);

export function useMusicDetailsForm(): MusicDetailsFormContextType {
  const context = useContext(MusicDetailsFormContext);
  if (!context) {
    throw new Error('useMusicDetailsForm must be used within a MusicDetailsFormProvider');
  }
  return context;
}

interface MusicDetailsFormProviderProps {
  children: React.ReactNode;
}

export function MusicDetailsFormProvider({ children }: MusicDetailsFormProviderProps) {
  const form = useFormContext();
  const FORM_KEY = 'musicDetails';

  // Initialize music details if not present
  useEffect(() => {
    if (!form.getValues(FORM_KEY)) {
      form.setValue(FORM_KEY, {
        event: null,
        festival: null,
        band: null,
        bands: [],
        musicians: [],
        venue: null,
        date: null,
        startTime: null,
        endTime: null,
        genres: []
      });
    }
  }, [form]);

  const getEvent = useCallback((): MusicEvent | null => {
    return form.getValues(`${FORM_KEY}.event`) || null;
  }, [form]);

  const setEvent = useCallback((event: MusicEvent) => {
    form.setValue(`${FORM_KEY}.event`, event);
    console.log('🎵 Set music event:', event.name);
  }, [form]);

  const getFestival = useCallback((): MusicEvent | null => {
    return form.getValues(`${FORM_KEY}.festival`) || null;
  }, [form]);

  const setFestival = useCallback((festival: MusicEvent) => {
    form.setValue(`${FORM_KEY}.festival`, festival);
    console.log('🎪 Set festival:', festival.name);
  }, [form]);

  const getBand = useCallback((): WikidataEntity | null => {
    return form.getValues(`${FORM_KEY}.band`) || null;
  }, [form]);

  const setBand = useCallback((band: WikidataEntity) => {
    form.setValue(`${FORM_KEY}.band`, band);
    console.log('🎸 Set band:', band.labels?.en?.value || band.id);
  }, [form]);

  const getBands = useCallback((): WikidataEntity[] => {
    return form.getValues(`${FORM_KEY}.bands`) || [];
  }, [form]);

  const setBands = useCallback((bands: WikidataEntity[]) => {
    form.setValue(`${FORM_KEY}.bands`, bands);
    console.log('🎸 Set bands:', bands.length);
  }, [form]);

  const addBand = useCallback((band: WikidataEntity) => {
    const bands = getBands();
    const exists = bands.some(b => b.id === band.id);
    
    if (!exists) {
      const updatedBands = [...bands, band];
      setBands(updatedBands);
      console.log('➕ Added band:', band.labels?.en?.value || band.id);
    }
  }, [getBands, setBands]);

  const removeBand = useCallback((bandId: string) => {
    const bands = getBands();
    const updatedBands = bands.filter(b => b.id !== bandId);
    setBands(updatedBands);
    console.log('➖ Removed band:', bandId);
  }, [getBands, setBands]);

  const getMusicians = useCallback((): WikidataEntity[] => {
    return form.getValues(`${FORM_KEY}.musicians`) || [];
  }, [form]);

  const setMusicians = useCallback((musicians: WikidataEntity[]) => {
    form.setValue(`${FORM_KEY}.musicians`, musicians);
    console.log('🎤 Set musicians:', musicians.length);
  }, [form]);

  const addMusician = useCallback((musician: WikidataEntity) => {
    const musicians = getMusicians();
    const exists = musicians.some(m => m.id === musician.id);
    
    if (!exists) {
      const updatedMusicians = [...musicians, musician];
      setMusicians(updatedMusicians);
      console.log('➕ Added musician:', musician.labels?.en?.value || musician.id);
    }
  }, [getMusicians, setMusicians]);

  const removeMusician = useCallback((musicianId: string) => {
    const musicians = getMusicians();
    const updatedMusicians = musicians.filter(m => m.id !== musicianId);
    setMusicians(updatedMusicians);
    console.log('➖ Removed musician:', musicianId);
  }, [getMusicians, setMusicians]);

  const getVenue = useCallback((): WikidataEntity | null => {
    return form.getValues(`${FORM_KEY}.venue`) || null;
  }, [form]);

  const setVenue = useCallback((venue: WikidataEntity) => {
    form.setValue(`${FORM_KEY}.venue`, venue);
    console.log('🏛️ Set venue:', venue.labels?.en?.value || venue.id);
  }, [form]);

  const getDate = useCallback((): string | null => {
    return form.getValues(`${FORM_KEY}.date`) || null;
  }, [form]);

  const setDate = useCallback((date: string) => {
    form.setValue(`${FORM_KEY}.date`, date);
    console.log('📅 Set date:', date);
  }, [form]);

  const getStartTime = useCallback((): string | null => {
    return form.getValues(`${FORM_KEY}.startTime`) || null;
  }, [form]);

  const setStartTime = useCallback((time: string) => {
    form.setValue(`${FORM_KEY}.startTime`, time);
    console.log('⏰ Set start time:', time);
  }, [form]);

  const getEndTime = useCallback((): string | null => {
    return form.getValues(`${FORM_KEY}.endTime`) || null;
  }, [form]);

  const setEndTime = useCallback((time: string) => {
    form.setValue(`${FORM_KEY}.endTime`, time);
    console.log('⏰ Set end time:', time);
  }, [form]);

  const getGenres = useCallback((): string[] => {
    return form.getValues(`${FORM_KEY}.genres`) || [];
  }, [form]);

  const setGenres = useCallback((genres: string[]) => {
    form.setValue(`${FORM_KEY}.genres`, genres);
    console.log('🎵 Set genres:', genres.length);
  }, [form]);

  const addGenre = useCallback((genre: string) => {
    const genres = getGenres();
    if (!genres.includes(genre)) {
      const updatedGenres = [...genres, genre];
      setGenres(updatedGenres);
      console.log('➕ Added genre:', genre);
    }
  }, [getGenres, setGenres]);

  const removeGenre = useCallback((genre: string) => {
    const genres = getGenres();
    const updatedGenres = genres.filter(g => g !== genre);
    setGenres(updatedGenres);
    console.log('➖ Removed genre:', genre);
  }, [getGenres, setGenres]);

  const validate = useCallback((): boolean => {
    const event = getEvent();
    const festival = getFestival();
    const bands = getBands();
    const musicians = getMusicians();
    const venue = getVenue();
    const date = getDate();

    // At least one event type must be defined
    if (!event && !festival) {
      console.warn('⚠️ No music event or festival defined');
      return false;
    }

    // At least one performer must be defined
    if (bands.length === 0 && musicians.length === 0) {
      console.warn('⚠️ No bands or musicians defined');
      return false;
    }

    // Date is required
    if (!date) {
      console.warn('⚠️ No date defined');
      return false;
    }

    // Venue is recommended but not required
    if (!venue) {
      console.warn('⚠️ No venue defined (recommended)');
    }

    return true;
  }, [getEvent, getFestival, getBands, getMusicians, getVenue, getDate]);

  const clear = useCallback(() => {
    form.setValue(FORM_KEY, {
      event: null,
      festival: null,
      band: null,
      bands: [],
      musicians: [],
      venue: null,
      date: null,
      startTime: null,
      endTime: null,
      genres: []
    });
    console.log('🧹 Cleared music details');
  }, [form]);

  const value: MusicDetailsFormContextType = {
    getEvent,
    setEvent,
    getFestival,
    setFestival,
    getBand,
    setBand,
    getBands,
    setBands,
    addBand,
    removeBand,
    getMusicians,
    setMusicians,
    addMusician,
    removeMusician,
    getVenue,
    setVenue,
    getDate,
    setDate,
    getStartTime,
    setStartTime,
    getEndTime,
    setEndTime,
    getGenres,
    setGenres,
    addGenre,
    removeGenre,
    validate,
    clear
  };

  return (
    <MusicDetailsFormContext.Provider value={value}>
      {children}
    </MusicDetailsFormContext.Provider>
  );
}