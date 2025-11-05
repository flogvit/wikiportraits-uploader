import { useState, useEffect } from 'react';
import { BandMember, PendingWikidataEntity, PendingBandMemberData } from '@/types/music';
import { searchWikidataEntities, getWikidataEntity } from '@/utils/wikidata';
import { 
  loadBandMembers,
  getJsonItem,
} from '@/utils/localStorage';

// Common Wikidata instruments and roles
export const COMMON_INSTRUMENTS = [
  { id: 'Q6607', name: 'guitar' },
  { id: 'Q46185', name: 'bass guitar' },
  { id: 'Q5994', name: 'piano' },
  { id: 'Q52954', name: 'keyboard' },
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
      // Search for the band entity first
      const bandSearchResults = await searchWikidataEntities(bandName, 5, 'en', 'item');
      
      let bandEntity = null;
      let fetchedMembers: BandMember[] = [];
      
      // Find the musical group/band entity
      for (const searchResult of bandSearchResults) {
        try {
          const entity = await getWikidataEntity(searchResult.id, 'en', 'labels|descriptions|claims');
          const instanceOf = entity.claims?.P31;
          
          // Check if it's a musical group
          const isMusicGroup = instanceOf?.some((claim: any) => {
            const qid = claim.mainsnak?.datavalue?.value?.id;
            return qid === 'Q215380' || // musical group
                   qid === 'Q2088357' || // musical ensemble
                   qid === 'Q5741069'; // rock band
          });
          
          if (isMusicGroup) {
            bandEntity = entity;
            break;
          }
        } catch (entityError) {
          console.warn(`Failed to get entity ${searchResult.id}:`, entityError);
        }
      }
      
      if (bandEntity) {
        // Get band members using P527 (has part) property
        const hasPartClaims = bandEntity.claims?.P527;
        if (hasPartClaims && hasPartClaims.length > 0) {
          const memberIds = hasPartClaims
            .map((claim: any) => claim.mainsnak?.datavalue?.value?.id)
            .filter(Boolean);
          
          // Fetch member details
          const memberPromises = memberIds.map(async (memberId: string) => {
            try {
              const memberEntity = await getWikidataEntity(memberId, 'en', 'labels|descriptions|claims|sitelinks');
              
              // Get Wikipedia URL
              const enwikiSitelink = memberEntity.sitelinks?.enwiki;
              const wikipediaUrl = enwikiSitelink 
                ? `https://en.wikipedia.org/wiki/${encodeURIComponent(enwikiSitelink.title)}`
                : undefined;
              
              // Get instruments from claims (P1303 - instrument)
              const instrumentClaims = memberEntity.claims?.P1303;
              const instruments = instrumentClaims 
                ? await Promise.all(
                    instrumentClaims.map(async (claim: any) => {
                      const instrumentId = claim.mainsnak?.datavalue?.value?.id;
                      if (instrumentId) {
                        try {
                          const instrumentEntity = await getWikidataEntity(instrumentId, 'en', 'labels');
                          return instrumentEntity.labels?.en?.value || instrumentId;
                        } catch {
                          return instrumentId;
                        }
                      }
                      return null;
                    })
                  ).then(results => results.filter(Boolean))
                : [];
              
              return {
                id: memberEntity.id,
                name: memberEntity.labels?.en?.value || memberEntity.id,
                wikidataUrl: `https://www.wikidata.org/wiki/${memberEntity.id}`,
                wikipediaUrl,
                instruments,
                nationality: undefined, // Could be extracted from P27 if needed
                birthDate: undefined, // Could be extracted from P569 if needed
                bandQID: bandId || `pending-band-${bandName}`
              };
            } catch (memberError) {
              console.warn(`Failed to get member ${memberId}:`, memberError);
              return null;
            }
          });
          
          const memberResults = await Promise.all(memberPromises);
          fetchedMembers = memberResults.filter(Boolean) as BandMember[];
        }
      }
      
      console.log('Fetched band members:', fetchedMembers.length);
      setPerformers(fetchedMembers);
      
    } catch (err) {
      console.error('Error fetching band members:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch band members');
      
      // Fallback: return empty array for now
      setPerformers([]);
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
      // Search for entities using client-side search
      const searchResults = await searchWikidataEntities(query, 10, 'en', 'item');
      
      if (searchResults.length === 0) {
        setSearchResults([]);
        return;
      }

      // Get full entity details for filtering and conversion
      const entityPromises = searchResults.map(result => 
        getWikidataEntity(result.id, 'en', 'labels|descriptions|claims|sitelinks')
      );
      
      const entities = await Promise.all(entityPromises);

      // Filter and convert to BandMember format
      const artistPerformers: BandMember[] = [];
      
      for (const entity of entities) {
        try {
          const instanceOf = entity.claims?.P31;
          if (!instanceOf) continue;
          
          // Check if entity is music-related (human or musical group)
          const isMusicRelated = instanceOf.some((claim: any) => {
            const qid = claim.mainsnak?.datavalue?.value?.id;
            return qid === 'Q5' || // human
                   qid === 'Q215380' || // musical group
                   qid === 'Q2088357' || // musical ensemble
                   qid === 'Q5741069'; // rock band
          });
          
          if (!isMusicRelated) continue;
          
          // Determine entity type
          const isHuman = instanceOf.some((claim: any) => 
            claim.mainsnak?.datavalue?.value?.id === 'Q5'
          );
          
          // Get Wikipedia URL
          const enwikiSitelink = entity.sitelinks?.enwiki;
          const wikipediaUrl = enwikiSitelink 
            ? `https://en.wikipedia.org/wiki/${encodeURIComponent(enwikiSitelink.title)}`
            : undefined;
          
          // Get instruments if it's a person
          let instruments: string[] = [];
          if (isHuman) {
            const instrumentClaims = entity.claims?.P1303;
            if (instrumentClaims) {
              instruments = await Promise.all(
                instrumentClaims.map(async (claim: any) => {
                  const instrumentId = claim.mainsnak?.datavalue?.value?.id;
                  if (instrumentId) {
                    try {
                      const instrumentEntity = await getWikidataEntity(instrumentId, 'en', 'labels');
                      return instrumentEntity.labels?.en?.value || instrumentId;
                    } catch {
                      return instrumentId;
                    }
                  }
                  return null;
                })
              ).then(results => results.filter(Boolean) as string[]);
            }
          } else {
            instruments = ['band'];
          }

          artistPerformers.push({
            id: entity.id,
            name: entity.labels?.en?.value || entity.id,
            wikidataUrl: `https://www.wikidata.org/wiki/${entity.id}`,
            wikipediaUrl,
            instruments,
            nationality: undefined, // Could be extracted from P27 if needed
            birthDate: undefined, // Could be extracted from P569 if needed
          });
        } catch (entityError) {
          console.warn(`Failed to process entity ${entity.id}:`, entityError);
        }
      }

      setSearchResults(artistPerformers.slice(0, 10));
    } catch (err) {
      console.error('Error searching for artists:', err);
      setError(err instanceof Error ? err.message : 'Failed to search artists');
      
      // Fallback to basic search results
      try {
        const basicResults = await searchWikidataEntities(query, 10, 'en', 'item');
        const fallbackResults: BandMember[] = basicResults.map(result => ({
          id: result.id,
          name: result.display?.label?.value || result.label || result.id,
          wikidataUrl: `https://www.wikidata.org/wiki/${result.id}`,
          wikipediaUrl: undefined,
          instruments: [],
          nationality: undefined,
          birthDate: undefined,
        }));
        setSearchResults(fallbackResults);
      } catch (fallbackError) {
        console.error('Fallback search also failed:', fallbackError);
        setSearchResults([]);
      }
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