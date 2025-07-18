import { useState, useEffect } from 'react';
import { BandMember, PendingWikidataEntity, PendingBandMemberData } from '@/types/music';
import { 
  loadBandMembers,
  getJsonItem,
} from '@/utils/localStorage';

// Common Wikidata instruments and roles
export const COMMON_INSTRUMENTS = [
  { id: 'Q6607', name: 'guitar' },
  { id: 'Q46185', name: 'bass guitar' },
  { id: 'Q5994', name: 'piano' },
  { id: 'Q11404', name: 'drums' },
  { id: 'Q17172850', name: 'vocals' },
  { id: 'Q8355', name: 'violin' },
  { id: 'Q8388', name: 'saxophone' },
  { id: 'Q8338', name: 'trumpet' },
  { id: 'Q11405', name: 'flute' },
  { id: 'Q11874', name: 'cello' },
  { id: 'Q11399', name: 'accordion' },
  { id: 'Q8371', name: 'clarinet' },
  { id: 'Q8377', name: 'trombone' },
  { id: 'Q8343', name: 'tuba' },
  { id: 'Q8361', name: 'viola' },
];

export const COMMON_ROLES = [
  { id: 'Q177220', name: 'singer' },
  { id: 'Q639669', name: 'musician' },
  { id: 'Q36834', name: 'composer' },
  { id: 'Q753110', name: 'songwriter' },
  { id: 'Q183945', name: 'producer' },
  { id: 'Q158852', name: 'conductor' },
  { id: 'Q222344', name: 'guitarist' },
  { id: 'Q584301', name: 'bassist' },
  { id: 'Q386854', name: 'drummer' },
  { id: 'Q486748', name: 'pianist' },
  { id: 'Q1259917', name: 'violinist' },
];

export interface InstrumentRole {
  id: string;
  name: string;
}

interface PerformerData {
  performers: BandMember[];
}

export interface UseWikidataPersonsReturn {
  performers: BandMember[];
  searchResults: BandMember[];
  loading: boolean;
  error: string | null;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  fetchBandMembers: () => Promise<void>;
  searchArtists: (query: string) => Promise<void>;
  addPerformer: (performer: BandMember) => void;
  removePerformer: (performerId: string) => void;
  getAllPerformers: (pendingPerformers?: PendingWikidataEntity[]) => BandMember[];
  getBandMembers: (allPerformers: BandMember[], currentBandId: string) => BandMember[];
  getAdditionalArtists: (allPerformers: BandMember[], currentBandId: string) => BandMember[];
  getPendingPerformers: (allPerformers: BandMember[]) => BandMember[];
}

export function useWikidataPersons(
  bandName?: string,
  bandId?: string,
  pendingPerformers: PendingWikidataEntity[] = []
): UseWikidataPersonsReturn {
  const [performers, setPerformers] = useState<BandMember[]>([]);
  const [searchResults, setSearchResults] = useState<BandMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Helper functions for localStorage - single source of truth
  const savePerformerData = (data: PerformerData) => {
    // No longer writing to localStorage directly - form provider handles this
  };

  const loadPerformerData = (): PerformerData => {
    return getJsonItem('music-event-festival-performers', {
      performers: []
    });
  };

  const fetchBandMembers = async () => {
    if (!bandName) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/music/band-members?bandName=${encodeURIComponent(bandName)}`);
      if (!response.ok) {
        throw new Error('Failed to fetch band members');
      }
      
      const data = await response.json();
      const fetchedMembers = data.members || [];
      
      // Add bandQID to each member
      const currentBandId = bandId || `pending-band-${bandName}`;
      const membersWithBandId = fetchedMembers.map((member: BandMember) => ({
        ...member,
        bandQID: currentBandId
      }));
      
      console.log('Fetched band members:', membersWithBandId.length);
      setPerformers(membersWithBandId);
      
      // No longer saving to localStorage directly - form provider handles this
      // saveBandMembers(currentBandId, membersWithBandId);
      
    } catch (err) {
      console.error('Error fetching band members:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch band members');
    } finally {
      setLoading(false);
    }
  };

  const searchArtists = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/music/artist-search?q=${encodeURIComponent(query)}&limit=10&wikidata_only=true`);
      
      if (!response.ok) {
        throw new Error('Failed to search artists');
      }

      const data = await response.json();
      const results = data.results || [];
      
      // Convert search results to BandMember format for consistency
      const artistPerformers: BandMember[] = results.map((result: any) => ({
        id: result.id,
        name: result.name,
        wikidataUrl: result.wikidataUrl,
        wikipediaUrl: result.wikipediaUrl,
        instruments: result.entityType === 'group' ? ['band'] : undefined,
        nationality: result.country,
        birthDate: result.birthDate,
        // Search results don't have bandQID initially - it will be added when selected
      }));

      setSearchResults(artistPerformers);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to search artists');
      setSearchResults([]);
    } finally {
      setLoading(false);
    }
  };

  const addPerformer = (performer: BandMember) => {
    // No longer managing local state - form provider handles this
    // Just keep performers in sync for API search functionality
    if (!performers.find(p => p.id === performer.id)) {
      setPerformers([...performers, performer]);
    }
  };

  const removePerformer = (performerId: string) => {
    const currentBandId = bandId || `pending-band-${bandName}`;
    const originalBandMembers = loadBandMembers(currentBandId);
    const originalBandMemberIds = originalBandMembers.map(m => m.id);
    
    const performer = performers.find(p => p.id === performerId);
    if (performer && !originalBandMemberIds.includes(performerId) && !performer.new && !performer.bandQID) {
      // This was an additional artist (no bandQID), remove it from performers
      const updatedPerformers = performers.filter(p => p.id !== performerId);
      setPerformers(updatedPerformers);
    }
  };

  const getAllPerformers = (pendingPerformers: PendingWikidataEntity[] = []): BandMember[] => {
    // Convert pending performers to BandMember format and add to main performers array
    const pendingPerformerObjects = pendingPerformers
      .filter(entity => entity.type === 'band_member')
      .map(entity => ({
        id: entity.id,
        name: entity.name,
        instruments: (entity.data as PendingBandMemberData).instruments || [],
        nationality: (entity.data as PendingBandMemberData).nationality || undefined,
        role: (entity.data as PendingBandMemberData).role || undefined,
        bandQID: bandId || `pending-band-${bandName}`,
        new: true
      }));

    // Create combined performers array with deduplication
    const allPerformersMap = new Map<string, BandMember>();
    
    // Add performers first
    performers.forEach(performer => {
      allPerformersMap.set(performer.id, performer);
    });
    
    // Add pending performers (will overwrite if same ID, which is fine)
    pendingPerformerObjects.forEach(performer => {
      allPerformersMap.set(performer.id, performer);
    });
    
    return Array.from(allPerformersMap.values());
  };

  const getBandMembers = (allPerformers: BandMember[], currentBandId: string): BandMember[] => {
    const originalBandMembers = loadBandMembers(currentBandId);
    const originalBandMemberIds = originalBandMembers.map(m => m.id);
    return allPerformers.filter(p => {
      // Use saved type if available, otherwise fall back to original logic
      if (p.type) {
        return p.type === 'band_member';
      }
      // Original fallback logic
      return originalBandMemberIds.includes(p.id);
    });
  };

  const getAdditionalArtists = (allPerformers: BandMember[], currentBandId: string): BandMember[] => {
    const originalBandMembers = loadBandMembers(currentBandId);
    const originalBandMemberIds = originalBandMembers.map(m => m.id);
    return allPerformers.filter(p => {
      // Use saved type if available, otherwise fall back to original logic
      if (p.type) {
        return p.type === 'additional_artist';
      }
      // Original fallback logic
      return !p.new && !originalBandMemberIds.includes(p.id) && !p.bandQID;
    });
  };

  const getPendingPerformers = (allPerformers: BandMember[]): BandMember[] => {
    return allPerformers.filter(p => p.new);
  };

  // Load and initialize data when band changes
  useEffect(() => {
    if (bandName || bandId) {
      const currentBandId = bandId || `pending-band-${bandName}`;
      const currentBandName = bandName || '';
      
      // Load existing performer data
      const performerData = loadPerformerData();
      
      // Check if we have performer data for this band
      const originalBandMembers = loadBandMembers(currentBandId);
      const hasPerformersForThisBand = performerData.performers.some(p => 
        p.bandQID === currentBandId || 
        (p.bandQID === `pending-band-${currentBandName}` && currentBandId === `pending-band-${currentBandName}`)
      ) || originalBandMembers.length > 0;
      
      console.log('useWikidataPersons Debug:', {
        currentBandId,
        currentBandName,
        performersCount: performerData.performers.length,
        hasPerformersForThisBand,
        performersWithBandQID: performerData.performers.filter(p => p.bandQID === currentBandId).length,
        originalBandMembers: originalBandMembers.length
      });
      
      if (!hasPerformersForThisBand) {
        // No performer data for this band - fetch from Wikidata
        console.log('No performers for this band, fetching from Wikidata');
        fetchBandMembers();
        
        // Clear search state
        setSearchResults([]);
        setSearchTerm('');
      } else {
        // Have performer data for this band - load from localStorage
        console.log('Loading performers from localStorage:', {
          performersCount: performerData.performers.length,
          forThisBand: performerData.performers.filter(p => p.bandQID === currentBandId).length,
          additionalArtists: performerData.performers.filter(p => !p.bandQID && !p.new).length,
          originalBandMembers: originalBandMembers.length
        });
        
        // Include: band members (with bandQID or type='band_member') + additional artists (type='additional_artist' or legacy logic)
        const bandPerformers = performerData.performers.filter(p => {
          // Use saved type if available
          if (p.type) {
            return p.type === 'band_member' || p.type === 'additional_artist';
          }
          // Original fallback logic
          return p.bandQID === currentBandId || (!p.bandQID && !p.new);
        });
        
        // If we have original band members but no performers in localStorage, merge them
        if (originalBandMembers.length > 0 && bandPerformers.filter(p => p.bandQID === currentBandId).length === 0) {
          const combinedPerformers = [...bandPerformers, ...originalBandMembers];
          setPerformers(combinedPerformers);
        } else {
          setPerformers(bandPerformers);
        }
      }
    }
  }, [bandName, bandId]);

  // Persist performer data to localStorage whenever it changes
  useEffect(() => {
    if (bandName || bandId) {
      const performerData: PerformerData = {
        performers: performers
      };
      
      console.log('Saving performer data to localStorage:', {
        performersCount: performers.length,
        pendingPerformers: pendingPerformers
      });
      
      savePerformerData(performerData);
    }
  }, [performers, bandId, bandName]);

  return {
    performers,
    searchResults,
    loading,
    error,
    searchTerm,
    setSearchTerm,
    fetchBandMembers,
    searchArtists,
    addPerformer,
    removePerformer,
    getAllPerformers,
    getBandMembers,
    getAdditionalArtists,
    getPendingPerformers
  };
}