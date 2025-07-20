'use client';

import React, { createContext, useContext, useCallback, useEffect } from 'react';
import { useFormContext } from 'react-hook-form';
import { WikidataEntity } from '@/types/wikidata';

interface SoccerMatch {
  id: string;
  homeTeam: WikidataEntity;
  awayTeam: WikidataEntity;
  date: string;
  venue: WikidataEntity;
  competition: string;
  score?: string;
  referee?: WikidataEntity;
  attendance?: number;
}

interface SoccerDetailsFormContextType {
  // Match details
  getMatch: () => SoccerMatch | null;
  setMatch: (match: SoccerMatch) => void;
  
  // Team management
  getHomeTeam: () => WikidataEntity | null;
  setHomeTeam: (team: WikidataEntity) => void;
  getAwayTeam: () => WikidataEntity | null;
  setAwayTeam: (team: WikidataEntity) => void;
  
  // Player management
  getPlayers: () => WikidataEntity[];
  setPlayers: (players: WikidataEntity[]) => void;
  addPlayer: (player: WikidataEntity) => void;
  removePlayer: (playerId: string) => void;
  getPlayersByTeam: (teamId: string) => WikidataEntity[];
  
  // Match details
  getVenue: () => WikidataEntity | null;
  setVenue: (venue: WikidataEntity) => void;
  getDate: () => string | null;
  setDate: (date: string) => void;
  getCompetition: () => string | null;
  setCompetition: (competition: string) => void;
  
  // Match results
  getScore: () => string | null;
  setScore: (score: string) => void;
  getReferee: () => WikidataEntity | null;
  setReferee: (referee: WikidataEntity) => void;
  getAttendance: () => number | null;
  setAttendance: (attendance: number) => void;
  
  // Additional details
  getStadium: () => WikidataEntity | null;
  setStadium: (stadium: WikidataEntity) => void;
  getLocation: () => string | null;
  setLocation: (location: string) => void;
  
  // Validation
  validate: () => boolean;
  clear: () => void;
}

const SoccerDetailsFormContext = createContext<SoccerDetailsFormContextType | undefined>(undefined);

export function useSoccerDetailsForm(): SoccerDetailsFormContextType {
  const context = useContext(SoccerDetailsFormContext);
  if (!context) {
    throw new Error('useSoccerDetailsForm must be used within a SoccerDetailsFormProvider');
  }
  return context;
}

interface SoccerDetailsFormProviderProps {
  children: React.ReactNode;
}

export function SoccerDetailsFormProvider({ children }: SoccerDetailsFormProviderProps) {
  const form = useFormContext();
  const FORM_KEY = 'soccerDetails';

  // Initialize soccer details if not present
  useEffect(() => {
    if (!form.getValues(FORM_KEY)) {
      form.setValue(FORM_KEY, {
        match: null,
        homeTeam: null,
        awayTeam: null,
        players: [],
        venue: null,
        date: null,
        competition: null,
        score: null,
        referee: null,
        attendance: null,
        stadium: null,
        location: null
      });
    }
  }, [form]);

  const getMatch = useCallback((): SoccerMatch | null => {
    return form.getValues(`${FORM_KEY}.match`) || null;
  }, [form]);

  const setMatch = useCallback((match: SoccerMatch) => {
    form.setValue(`${FORM_KEY}.match`, match);
    console.log('⚽ Set soccer match:', `${match.homeTeam.labels?.en?.value} vs ${match.awayTeam.labels?.en?.value}`);
  }, [form]);

  const getHomeTeam = useCallback((): WikidataEntity | null => {
    return form.getValues(`${FORM_KEY}.homeTeam`) || null;
  }, [form]);

  const setHomeTeam = useCallback((team: WikidataEntity) => {
    form.setValue(`${FORM_KEY}.homeTeam`, team);
    console.log('🏠 Set home team:', team.labels?.en?.value || team.id);
  }, [form]);

  const getAwayTeam = useCallback((): WikidataEntity | null => {
    return form.getValues(`${FORM_KEY}.awayTeam`) || null;
  }, [form]);

  const setAwayTeam = useCallback((team: WikidataEntity) => {
    form.setValue(`${FORM_KEY}.awayTeam`, team);
    console.log('🚌 Set away team:', team.labels?.en?.value || team.id);
  }, [form]);

  const getPlayers = useCallback((): WikidataEntity[] => {
    return form.getValues(`${FORM_KEY}.players`) || [];
  }, [form]);

  const setPlayers = useCallback((players: WikidataEntity[]) => {
    form.setValue(`${FORM_KEY}.players`, players);
    console.log('👥 Set players:', players.length);
  }, [form]);

  const addPlayer = useCallback((player: WikidataEntity) => {
    const players = getPlayers();
    const exists = players.some(p => p.id === player.id);
    
    if (!exists) {
      const updatedPlayers = [...players, player];
      setPlayers(updatedPlayers);
      console.log('➕ Added player:', player.labels?.en?.value || player.id);
    }
  }, [getPlayers, setPlayers]);

  const removePlayer = useCallback((playerId: string) => {
    const players = getPlayers();
    const updatedPlayers = players.filter(p => p.id !== playerId);
    setPlayers(updatedPlayers);
    console.log('➖ Removed player:', playerId);
  }, [getPlayers, setPlayers]);

  const getPlayersByTeam = useCallback((teamId: string): WikidataEntity[] => {
    const players = getPlayers();
    // This would need more complex logic to determine which players belong to which team
    // For now, return all players - this could be enhanced with team membership data
    return players;
  }, [getPlayers]);

  const getVenue = useCallback((): WikidataEntity | null => {
    return form.getValues(`${FORM_KEY}.venue`) || null;
  }, [form]);

  const setVenue = useCallback((venue: WikidataEntity) => {
    form.setValue(`${FORM_KEY}.venue`, venue);
    console.log('🏟️ Set venue:', venue.labels?.en?.value || venue.id);
  }, [form]);

  const getDate = useCallback((): string | null => {
    return form.getValues(`${FORM_KEY}.date`) || null;
  }, [form]);

  const setDate = useCallback((date: string) => {
    form.setValue(`${FORM_KEY}.date`, date);
    console.log('📅 Set match date:', date);
  }, [form]);

  const getCompetition = useCallback((): string | null => {
    return form.getValues(`${FORM_KEY}.competition`) || null;
  }, [form]);

  const setCompetition = useCallback((competition: string) => {
    form.setValue(`${FORM_KEY}.competition`, competition);
    console.log('🏆 Set competition:', competition);
  }, [form]);

  const getScore = useCallback((): string | null => {
    return form.getValues(`${FORM_KEY}.score`) || null;
  }, [form]);

  const setScore = useCallback((score: string) => {
    form.setValue(`${FORM_KEY}.score`, score);
    console.log('⚽ Set score:', score);
  }, [form]);

  const getReferee = useCallback((): WikidataEntity | null => {
    return form.getValues(`${FORM_KEY}.referee`) || null;
  }, [form]);

  const setReferee = useCallback((referee: WikidataEntity) => {
    form.setValue(`${FORM_KEY}.referee`, referee);
    console.log('👨‍⚖️ Set referee:', referee.labels?.en?.value || referee.id);
  }, [form]);

  const getAttendance = useCallback((): number | null => {
    return form.getValues(`${FORM_KEY}.attendance`) || null;
  }, [form]);

  const setAttendance = useCallback((attendance: number) => {
    form.setValue(`${FORM_KEY}.attendance`, attendance);
    console.log('👥 Set attendance:', attendance);
  }, [form]);

  const getStadium = useCallback((): WikidataEntity | null => {
    return form.getValues(`${FORM_KEY}.stadium`) || null;
  }, [form]);

  const setStadium = useCallback((stadium: WikidataEntity) => {
    form.setValue(`${FORM_KEY}.stadium`, stadium);
    console.log('🏟️ Set stadium:', stadium.labels?.en?.value || stadium.id);
  }, [form]);

  const getLocation = useCallback((): string | null => {
    return form.getValues(`${FORM_KEY}.location`) || null;
  }, [form]);

  const setLocation = useCallback((location: string) => {
    form.setValue(`${FORM_KEY}.location`, location);
    console.log('📍 Set location:', location);
  }, [form]);

  const validate = useCallback((): boolean => {
    const homeTeam = getHomeTeam();
    const awayTeam = getAwayTeam();
    const date = getDate();
    const players = getPlayers();

    // Both teams must be defined
    if (!homeTeam || !awayTeam) {
      console.warn('⚠️ Both home and away teams must be defined');
      return false;
    }

    // Teams must be different
    if (homeTeam.id === awayTeam.id) {
      console.warn('⚠️ Home and away teams cannot be the same');
      return false;
    }

    // Date is required
    if (!date) {
      console.warn('⚠️ Match date must be defined');
      return false;
    }

    // At least some players should be defined (recommended but not required)
    if (players.length === 0) {
      console.warn('⚠️ No players defined (recommended to add players)');
    }

    return true;
  }, [getHomeTeam, getAwayTeam, getDate, getPlayers]);

  const clear = useCallback(() => {
    form.setValue(FORM_KEY, {
      match: null,
      homeTeam: null,
      awayTeam: null,
      players: [],
      venue: null,
      date: null,
      competition: null,
      score: null,
      referee: null,
      attendance: null,
      stadium: null,
      location: null
    });
    console.log('🧹 Cleared soccer details');
  }, [form]);

  const value: SoccerDetailsFormContextType = {
    getMatch,
    setMatch,
    getHomeTeam,
    setHomeTeam,
    getAwayTeam,
    setAwayTeam,
    getPlayers,
    setPlayers,
    addPlayer,
    removePlayer,
    getPlayersByTeam,
    getVenue,
    setVenue,
    getDate,
    setDate,
    getCompetition,
    setCompetition,
    getScore,
    setScore,
    getReferee,
    setReferee,
    getAttendance,
    setAttendance,
    getStadium,
    setStadium,
    getLocation,
    setLocation,
    validate,
    clear
  };

  return (
    <SoccerDetailsFormContext.Provider value={value}>
      {children}
    </SoccerDetailsFormContext.Provider>
  );
}