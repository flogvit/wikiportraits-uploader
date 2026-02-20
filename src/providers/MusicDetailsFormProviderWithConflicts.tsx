'use client';

import React, { createContext, useContext, useCallback, useEffect, useState } from 'react';
import { useFormContext } from 'react-hook-form';
import { WikidataEntity, DataConflict, WorkflowItem } from '@/types/wikidata';
import { useConflictResolutionWithOptions, ConflictResolutionOptions } from '@/hooks/useConflictResolution';
import { ConflictResolutionDialog, ConflictBadge } from '@/components/common';
import { logger } from '@/utils/logger';

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
  setEvent: (event: MusicEvent, externalData?: MusicEvent) => void;
  
  // Festival/Concert specific
  getFestival: () => MusicEvent | null;
  setFestival: (festival: MusicEvent, externalData?: MusicEvent) => void;
  
  // Band/Artist management with conflict resolution
  getBand: () => WikidataEntity | null;
  setBand: (band: WikidataEntity, externalData?: WikidataEntity) => void;
  getBands: () => WikidataEntity[];
  setBands: (bands: WikidataEntity[], externalData?: WikidataEntity[]) => void;
  addBand: (band: WikidataEntity) => void;
  removeBand: (bandId: string) => void;
  
  // Musicians management with conflict resolution
  getMusicians: () => WikidataEntity[];
  setMusicians: (musicians: WikidataEntity[], externalData?: WikidataEntity[]) => void;
  addMusician: (musician: WikidataEntity) => void;
  removeMusician: (musicianId: string) => void;
  
  // Venue details with conflict resolution
  getVenue: () => WikidataEntity | null;
  setVenue: (venue: WikidataEntity, externalData?: WikidataEntity) => void;
  
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
  
  // Conflict resolution
  conflicts: DataConflict[];
  hasConflicts: boolean;
  showConflictDialog: () => void;
  hideConflictDialog: () => void;
  resolveAllConflicts: () => void;
  
  // WorkflowItem management
  workflowItems: Map<string, WorkflowItem<WikidataEntity>>;
  getWorkflowItem: (key: string) => WorkflowItem<WikidataEntity> | null;
  
  // Validation
  validate: () => boolean;
  clear: () => void;
}

const MusicDetailsFormContext = createContext<MusicDetailsFormContextType | undefined>(undefined);

export function useMusicDetailsFormWithConflicts(): MusicDetailsFormContextType {
  const context = useContext(MusicDetailsFormContext);
  if (!context) {
    throw new Error('useMusicDetailsFormWithConflicts must be used within a MusicDetailsFormProviderWithConflicts');
  }
  return context;
}

interface MusicDetailsFormProviderWithConflictsProps {
  children: React.ReactNode;
  conflictResolutionOptions?: ConflictResolutionOptions;
}

export function MusicDetailsFormProviderWithConflicts({ 
  children,
  conflictResolutionOptions = {}
}: MusicDetailsFormProviderWithConflictsProps) {
  const form = useFormContext();
  const FORM_KEY = 'musicDetails';

  // State for managing conflict resolution
  const [showConflictDialog, setShowConflictDialog] = useState(false);
  const [workflowItems, setWorkflowItems] = useState<Map<string, WorkflowItem<WikidataEntity>>>(new Map());
  
  // Conflict resolution for bands
  const bandConflictResolution = useConflictResolutionWithOptions(
    undefined,
    false,
    {
      ...conflictResolutionOptions,
      onConflictDetected: (conflicts) => {
        logger.debug('MusicDetailsFormProviderWithConflicts', 'Band conflicts detected', conflicts);
        conflictResolutionOptions.onConflictDetected?.(conflicts);
      }
    }
  );

  // Conflict resolution for musicians
  const musicianConflictResolution = useConflictResolutionWithOptions(
    undefined,
    false,
    {
      ...conflictResolutionOptions,
      onConflictDetected: (conflicts) => {
        logger.debug('MusicDetailsFormProviderWithConflicts', 'Musician conflicts detected', conflicts);
        conflictResolutionOptions.onConflictDetected?.(conflicts);
      }
    }
  );

  // Conflict resolution for venue
  const venueConflictResolution = useConflictResolutionWithOptions(
    undefined,
    false,
    {
      ...conflictResolutionOptions,
      onConflictDetected: (conflicts) => {
        logger.debug('MusicDetailsFormProviderWithConflicts', 'Venue conflicts detected', conflicts);
        conflictResolutionOptions.onConflictDetected?.(conflicts);
      }
    }
  );

  // Aggregate all conflicts
  const allConflicts = [
    ...bandConflictResolution.conflicts,
    ...musicianConflictResolution.conflicts,
    ...venueConflictResolution.conflicts
  ];

  const hasConflicts = allConflicts.length > 0;

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

  // Update workflow items map
  useEffect(() => {
    const newItems = new Map(workflowItems);
    
    if (bandConflictResolution.workflowItem) {
      newItems.set('band', bandConflictResolution.workflowItem);
    }
    if (musicianConflictResolution.workflowItem) {
      newItems.set('musicians', musicianConflictResolution.workflowItem);
    }
    if (venueConflictResolution.workflowItem) {
      newItems.set('venue', venueConflictResolution.workflowItem);
    }
    
    setWorkflowItems(newItems);
  }, [
    bandConflictResolution.workflowItem,
    musicianConflictResolution.workflowItem,
    venueConflictResolution.workflowItem,
    workflowItems
  ]);

  const getEvent = useCallback((): MusicEvent | null => {
    return form.getValues(`${FORM_KEY}.event`) || null;
  }, [form]);

  const setEvent = useCallback((event: MusicEvent, externalData?: MusicEvent) => {
    form.setValue(`${FORM_KEY}.event`, event);
    logger.debug('MusicDetailsFormProviderWithConflicts', 'Set music event', event.name);

    if (externalData) {
      logger.debug('MusicDetailsFormProviderWithConflicts', 'External event data provided for conflict detection');
    }
  }, [form]);

  const getFestival = useCallback((): MusicEvent | null => {
    return form.getValues(`${FORM_KEY}.festival`) || null;
  }, [form]);

  const setFestival = useCallback((festival: MusicEvent, externalData?: MusicEvent) => {
    form.setValue(`${FORM_KEY}.festival`, festival);
    logger.debug('MusicDetailsFormProviderWithConflicts', 'Set festival', festival.name);

    if (externalData) {
      logger.debug('MusicDetailsFormProviderWithConflicts', 'External festival data provided for conflict detection');
    }
  }, [form]);

  const getBand = useCallback((): WikidataEntity | null => {
    return form.getValues(`${FORM_KEY}.band`) || null;
  }, [form]);

  const setBand = useCallback((band: WikidataEntity, externalData?: WikidataEntity) => {
    form.setValue(`${FORM_KEY}.band`, band);
    logger.debug('MusicDetailsFormProviderWithConflicts', 'Set band', band.labels?.en?.value || band.id);
    
    // Update conflict resolution with external data
    bandConflictResolution.updateData(band, externalData);
  }, [form, bandConflictResolution]);

  const getBands = useCallback((): WikidataEntity[] => {
    return form.getValues(`${FORM_KEY}.bands`) || [];
  }, [form]);

  const setBands = useCallback((bands: WikidataEntity[], externalData?: WikidataEntity[]) => {
    form.setValue(`${FORM_KEY}.bands`, bands);
    logger.debug('MusicDetailsFormProviderWithConflicts', 'Set bands', bands.length);

    if (externalData) {
      logger.debug('MusicDetailsFormProviderWithConflicts', 'External bands data provided for conflict detection');
      // For arrays, we'd need more sophisticated conflict resolution
      // This is a simplified implementation
    }
  }, [form]);

  const addBand = useCallback((band: WikidataEntity) => {
    const bands = getBands();
    const exists = bands.some(b => b.id === band.id);
    
    if (!exists) {
      const updatedBands = [...bands, band];
      setBands(updatedBands);
      logger.debug('MusicDetailsFormProviderWithConflicts', 'Added band', band.labels?.en?.value || band.id);
    }
  }, [getBands, setBands]);

  const removeBand = useCallback((bandId: string) => {
    const bands = getBands();
    const updatedBands = bands.filter(b => b.id !== bandId);
    setBands(updatedBands);
    logger.debug('MusicDetailsFormProviderWithConflicts', 'Removed band', bandId);
  }, [getBands, setBands]);

  const getMusicians = useCallback((): WikidataEntity[] => {
    return form.getValues(`${FORM_KEY}.musicians`) || [];
  }, [form]);

  const setMusicians = useCallback((musicians: WikidataEntity[], externalData?: WikidataEntity[]) => {
    form.setValue(`${FORM_KEY}.musicians`, musicians);
    logger.debug('MusicDetailsFormProviderWithConflicts', 'Set musicians', musicians.length);

    if (externalData) {
      logger.debug('MusicDetailsFormProviderWithConflicts', 'External musicians data provided for conflict detection');
      // For arrays, we'd need more sophisticated conflict resolution
    }
  }, [form]);

  const addMusician = useCallback((musician: WikidataEntity) => {
    const musicians = getMusicians();
    const exists = musicians.some(m => m.id === musician.id);
    
    if (!exists) {
      const updatedMusicians = [...musicians, musician];
      setMusicians(updatedMusicians);
      logger.debug('MusicDetailsFormProviderWithConflicts', 'Added musician', musician.labels?.en?.value || musician.id);
    }
  }, [getMusicians, setMusicians]);

  const removeMusician = useCallback((musicianId: string) => {
    const musicians = getMusicians();
    const updatedMusicians = musicians.filter(m => m.id !== musicianId);
    setMusicians(updatedMusicians);
    logger.debug('MusicDetailsFormProviderWithConflicts', 'Removed musician', musicianId);
  }, [getMusicians, setMusicians]);

  const getVenue = useCallback((): WikidataEntity | null => {
    return form.getValues(`${FORM_KEY}.venue`) || null;
  }, [form]);

  const setVenue = useCallback((venue: WikidataEntity, externalData?: WikidataEntity) => {
    form.setValue(`${FORM_KEY}.venue`, venue);
    logger.debug('MusicDetailsFormProviderWithConflicts', 'Set venue', venue.labels?.en?.value || venue.id);
    
    // Update conflict resolution with external data
    venueConflictResolution.updateData(venue, externalData);
  }, [form, venueConflictResolution]);

  const getDate = useCallback((): string | null => {
    return form.getValues(`${FORM_KEY}.date`) || null;
  }, [form]);

  const setDate = useCallback((date: string) => {
    form.setValue(`${FORM_KEY}.date`, date);
    logger.debug('MusicDetailsFormProviderWithConflicts', 'Set date', date);
  }, [form]);

  const getStartTime = useCallback((): string | null => {
    return form.getValues(`${FORM_KEY}.startTime`) || null;
  }, [form]);

  const setStartTime = useCallback((time: string) => {
    form.setValue(`${FORM_KEY}.startTime`, time);
    logger.debug('MusicDetailsFormProviderWithConflicts', 'Set start time', time);
  }, [form]);

  const getEndTime = useCallback((): string | null => {
    return form.getValues(`${FORM_KEY}.endTime`) || null;
  }, [form]);

  const setEndTime = useCallback((time: string) => {
    form.setValue(`${FORM_KEY}.endTime`, time);
    logger.debug('MusicDetailsFormProviderWithConflicts', 'Set end time', time);
  }, [form]);

  const getGenres = useCallback((): string[] => {
    return form.getValues(`${FORM_KEY}.genres`) || [];
  }, [form]);

  const setGenres = useCallback((genres: string[]) => {
    form.setValue(`${FORM_KEY}.genres`, genres);
    logger.debug('MusicDetailsFormProviderWithConflicts', 'Set genres', genres.length);
  }, [form]);

  const addGenre = useCallback((genre: string) => {
    const genres = getGenres();
    if (!genres.includes(genre)) {
      const updatedGenres = [...genres, genre];
      setGenres(updatedGenres);
      logger.debug('MusicDetailsFormProviderWithConflicts', 'Added genre', genre);
    }
  }, [getGenres, setGenres]);

  const removeGenre = useCallback((genre: string) => {
    const genres = getGenres();
    const updatedGenres = genres.filter(g => g !== genre);
    setGenres(updatedGenres);
    logger.debug('MusicDetailsFormProviderWithConflicts', 'Removed genre', genre);
  }, [getGenres, setGenres]);

  // Conflict resolution methods
  const showConflictDialogHandler = useCallback(() => {
    setShowConflictDialog(true);
  }, []);

  const hideConflictDialogHandler = useCallback(() => {
    setShowConflictDialog(false);
  }, []);

  const resolveAllConflicts = useCallback(() => {
    bandConflictResolution.clearConflicts();
    musicianConflictResolution.clearConflicts();
    venueConflictResolution.clearConflicts();
    logger.info('MusicDetailsFormProviderWithConflicts', 'Resolved all music details conflicts');
  }, [bandConflictResolution, musicianConflictResolution, venueConflictResolution]);

  const getWorkflowItem = useCallback((key: string): WorkflowItem<WikidataEntity> | null => {
    return workflowItems.get(key) || null;
  }, [workflowItems]);

  const validate = useCallback((): boolean => {
    const event = getEvent();
    const festival = getFestival();
    const bands = getBands();
    const musicians = getMusicians();
    const venue = getVenue();
    const date = getDate();

    // Check for unresolved conflicts
    if (hasConflicts) {
      logger.warn('MusicDetailsFormProviderWithConflicts', 'Cannot validate with unresolved conflicts');
      return false;
    }

    // At least one event type must be defined
    if (!event && !festival) {
      logger.warn('MusicDetailsFormProviderWithConflicts', 'No music event or festival defined');
      return false;
    }

    // At least one performer must be defined
    if (bands.length === 0 && musicians.length === 0) {
      logger.warn('MusicDetailsFormProviderWithConflicts', 'No bands or musicians defined');
      return false;
    }

    // Date is required
    if (!date) {
      logger.warn('MusicDetailsFormProviderWithConflicts', 'No date defined');
      return false;
    }

    // Venue is recommended but not required
    if (!venue) {
      logger.warn('MusicDetailsFormProviderWithConflicts', 'No venue defined (recommended)');
    }

    return true;
  }, [getEvent, getFestival, getBands, getMusicians, getVenue, getDate, hasConflicts]);

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
    
    // Clear all conflict resolution states
    bandConflictResolution.clearConflicts();
    musicianConflictResolution.clearConflicts();
    venueConflictResolution.clearConflicts();
    
    logger.debug('MusicDetailsFormProviderWithConflicts', 'Cleared music details and conflicts');
  }, [form, bandConflictResolution, musicianConflictResolution, venueConflictResolution]);

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
    conflicts: allConflicts,
    hasConflicts,
    showConflictDialog: showConflictDialogHandler,
    hideConflictDialog: hideConflictDialogHandler,
    resolveAllConflicts,
    workflowItems,
    getWorkflowItem,
    validate,
    clear
  };

  return (
    <MusicDetailsFormContext.Provider value={value}>
      {children}
      
      {/* Conflict resolution UI */}
      {hasConflicts && (
        <div className="fixed top-4 right-4 z-40">
          <ConflictBadge
            conflicts={allConflicts}
            onClick={showConflictDialogHandler}
            className="shadow-lg"
          />
        </div>
      )}
      
      {/* Conflict resolution dialog */}
      {showConflictDialog && allConflicts.length > 0 && (
        <ConflictResolutionDialog
          conflicts={allConflicts}
          entity={getBand() || getVenue() || {} as WikidataEntity}
          onResolve={(resolutions) => {
            // Apply resolutions to specific conflict resolution hooks
            const bandConflicts = allConflicts.filter(c => c.property.startsWith('band'));
            const venueConflicts = allConflicts.filter(c => c.property.startsWith('venue'));
            
            if (bandConflicts.length > 0) {
              const bandResolutions = new Map();
              bandConflicts.forEach(c => {
                const resolution = resolutions.get(c.property);
                if (resolution) bandResolutions.set(c.property, resolution);
              });
              bandConflictResolution.resolveConflicts(bandResolutions);
            }
            
            if (venueConflicts.length > 0) {
              const venueResolutions = new Map();
              venueConflicts.forEach(c => {
                const resolution = resolutions.get(c.property);
                if (resolution) venueResolutions.set(c.property, resolution);
              });
              venueConflictResolution.resolveConflicts(venueResolutions);
            }
            
            hideConflictDialogHandler();
          }}
          onCancel={hideConflictDialogHandler}
          isOpen={showConflictDialog}
        />
      )}
    </MusicDetailsFormContext.Provider>
  );
}