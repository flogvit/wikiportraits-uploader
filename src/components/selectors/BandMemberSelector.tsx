'use client';

import { useState, useEffect } from 'react';
import { Search, X, User, Music, Globe, Calendar, Plus, UserPlus } from 'lucide-react';
import { BandMember, PendingWikidataEntity, PendingBandMemberData } from '@/types/music';
import { 
  saveBandMembers, 
  loadBandMembers, 
  savePendingBandMembers, 
  loadPendingBandMembers,
  saveSelectedBandMembers,
  loadSelectedBandMembers
} from '@/utils/localStorage';
import { getCountryWikidataId } from '@/utils/countries';
import CountrySelector from './CountrySelector';

interface BandMemberSelectorProps {
  bandName?: string;
  bandId?: string;
  selectedMembers: string[];
  onMembersChange: (memberIds: string[]) => void;
  onPendingMemberAdd?: (member: PendingWikidataEntity) => void;
  onPendingMembersSync?: (members: PendingWikidataEntity[]) => void;
  pendingMembers?: PendingWikidataEntity[];
  placeholder?: string;
}

export default function BandMemberSelector({
  bandName,
  bandId,
  selectedMembers,
  onMembersChange,
  onPendingMemberAdd,
  onPendingMembersSync,
  pendingMembers = [],
  placeholder = "Select band members...",
}: BandMemberSelectorProps) {
  const [members, setMembers] = useState<BandMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [showAddMemberForm, setShowAddMemberForm] = useState(false);
  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberInstruments, setNewMemberInstruments] = useState('');
  const [newMemberNationality, setNewMemberNationality] = useState('');
  const [newMemberGender, setNewMemberGender] = useState('');
  const [newMemberLegalName, setNewMemberLegalName] = useState('');
  const [newMemberBirthYear, setNewMemberBirthYear] = useState('');
  const [localPendingMembers, setLocalPendingMembers] = useState<PendingWikidataEntity[]>([]);

  useEffect(() => {
    if (bandName || bandId) {
      fetchBandMembers();
    }
  }, [bandName, bandId]);

  // Load persisted data on mount
  useEffect(() => {
    const currentBandId = bandId || `pending-band-${bandName}`;
    if (currentBandId) {
      // Load persisted members
      const persistedMembers = loadBandMembers(currentBandId);
      if (persistedMembers.length > 0) {
        setMembers(persistedMembers);
      }
      
      // Load persisted pending members
      const persistedPendingMembers = loadPendingBandMembers(currentBandId);
      setLocalPendingMembers(persistedPendingMembers);
      
      // Load persisted selected members
      const persistedSelectedMembers = loadSelectedBandMembers(currentBandId);
      if (persistedSelectedMembers.length > 0) {
        onMembersChange(persistedSelectedMembers);
      }
    }
  }, [bandId, bandName, onMembersChange]);

  // Sync pending members to form state when they're loaded
  useEffect(() => {
    if (localPendingMembers.length > 0 && onPendingMembersSync) {
      // Filter out members that are already in the form state
      const existingIds = new Set(pendingMembers.map(m => m.id));
      const newPendingMembers = localPendingMembers.filter(m => !existingIds.has(m.id));
      if (newPendingMembers.length > 0) {
        onPendingMembersSync(newPendingMembers);
      }
    }
  }, [localPendingMembers, onPendingMembersSync, pendingMembers]);

  const fetchBandMembers = async () => {
    if (!bandName && !bandId) return;

    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (bandId) params.append('bandId', bandId);
      if (bandName) params.append('bandName', bandName);

      const response = await fetch(`/api/music/band-members?${params}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch band members');
      }

      const data = await response.json();
      const fetchedMembers = data.members || [];
      setMembers(fetchedMembers);
      
      // Persist fetched members
      const currentBandId = bandId || `pending-band-${bandName}`;
      if (currentBandId && fetchedMembers.length > 0) {
        saveBandMembers(currentBandId, fetchedMembers);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch band members');
      setMembers([]);
    } finally {
      setLoading(false);
    }
  };

  // Convert pending members to BandMember format for display and deduplicate
  const allPendingMembers = [...pendingMembers, ...localPendingMembers];
  const pendingMemberMap = new Map<string, BandMember>();
  
  allPendingMembers
    .filter(entity => entity.type === 'band_member')
    .forEach(entity => {
      if (!pendingMemberMap.has(entity.id)) {
        pendingMemberMap.set(entity.id, {
          id: entity.id,
          name: entity.name,
          instruments: (entity.data as PendingBandMemberData).instruments,
          wikidataUrl: entity.wikidataUrl,
        });
      }
    });
  
  const pendingMemberObjects: BandMember[] = Array.from(pendingMemberMap.values());

  // Combine existing members with pending members and deduplicate
  const allMembersMap = new Map<string, BandMember>();
  
  // Add fetched members first
  members.forEach(member => {
    allMembersMap.set(member.id, member);
  });
  
  // Add pending members (will overwrite if same ID)
  pendingMemberObjects.forEach(member => {
    allMembersMap.set(member.id, member);
  });
  
  const allMembers = Array.from(allMembersMap.values());

  const filteredMembers = allMembers.filter(member =>
    member.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    member.instruments?.some(instrument => 
      instrument.toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

  const selectedMemberObjects = allMembers.filter(member => 
    selectedMembers.includes(member.id)
  );


  const toggleMember = (memberId: string) => {
    const newSelected = selectedMembers.includes(memberId)
      ? selectedMembers.filter(id => id !== memberId)
      : [...selectedMembers, memberId];
    
    onMembersChange(newSelected);
    
    // Persist selected members
    const currentBandId = bandId || `pending-band-${bandName}`;
    if (currentBandId) {
      saveSelectedBandMembers(currentBandId, newSelected);
    }
  };

  const removeMember = (memberId: string) => {
    const newSelected = selectedMembers.filter(id => id !== memberId);
    onMembersChange(newSelected);
    
    // Persist selected members
    const currentBandId = bandId || `pending-band-${bandName}`;
    if (currentBandId) {
      saveSelectedBandMembers(currentBandId, newSelected);
    }
  };

  const handleAddNewMember = () => {
    if (!newMemberName.trim() || !newMemberGender.trim()) return;

    // Auto-generate description based on WikiPortraits format: nationality + occupation
    const occupation = newMemberInstruments.trim() ? 
      `${newMemberInstruments.split(',')[0].trim()} player` : 
      'musician';
    
    const description = newMemberNationality.trim() ? 
      `${newMemberNationality.trim()} ${occupation}` : 
      occupation;

    // Get Wikidata Q-code for nationality
    const nationalityQCode = newMemberNationality.trim() ? getCountryWikidataId(newMemberNationality.trim()) : undefined;
    
    const pendingMember: PendingWikidataEntity = {
      id: `pending-member-${Date.now()}`,
      type: 'band_member',
      status: 'pending',
      name: newMemberName.trim(),
      description: description,
      data: {
        name: newMemberName.trim(),
        legalName: newMemberLegalName.trim() || undefined,
        instruments: newMemberInstruments.trim() ? newMemberInstruments.split(',').map(i => i.trim()) : undefined,
        bandId: bandId || `pending-band-${bandName}`,
        nationality: nationalityQCode || undefined, // Store Q-code instead of string
        nationalityName: newMemberNationality.trim() || undefined, // Also store display name
        gender: newMemberGender as any,
        birthYear: newMemberBirthYear.trim() || undefined,
      } as PendingBandMemberData,
    };

    // Add to pending members callback
    onPendingMemberAdd?.(pendingMember);
    
    // Add to local pending members
    const newLocalPendingMembers = [...localPendingMembers, pendingMember];
    setLocalPendingMembers(newLocalPendingMembers);

    // Add to selected members
    const newSelectedMembers = [...selectedMembers, pendingMember.id];
    onMembersChange(newSelectedMembers);
    
    // Persist data
    const currentBandId = bandId || `pending-band-${bandName}`;
    if (currentBandId) {
      savePendingBandMembers(currentBandId, newLocalPendingMembers);
      saveSelectedBandMembers(currentBandId, newSelectedMembers);
    }

    // Reset form
    setNewMemberName('');
    setNewMemberInstruments('');
    setNewMemberNationality('');
    setNewMemberGender('');
    setNewMemberLegalName('');
    setNewMemberBirthYear('');
    setShowAddMemberForm(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-4 border border-gray-300 rounded-lg bg-gray-50">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Loading band members...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 border border-red-300 rounded-lg bg-red-50">
        <p className="text-red-700">Error: {error}</p>
        <button
          onClick={fetchBandMembers}
          className="mt-2 px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* Selected Members Display */}
      {selectedMemberObjects.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedMemberObjects.map(member => {
            const isPending = member.id.startsWith('pending-member-');
            return (
              <div
                key={member.id}
                className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm ${
                  isPending 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-blue-100 text-blue-800'
                }`}
              >
                <User className="w-4 h-4" />
                <span>{member.name}</span>
                {isPending && <span className="text-green-600">(new)</span>}
                {member.instruments && member.instruments.length > 0 && (
                  <span className={isPending ? "text-green-600" : "text-blue-600"}>
                    ({member.instruments.join(', ')})
                  </span>
                )}
                <button
                  onClick={() => removeMember(member.id)}
                  className={isPending 
                    ? "text-green-600 hover:text-green-800"
                    : "text-blue-600 hover:text-blue-800"
                  }
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Search and Selection */}
      <div className="relative">
        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder={placeholder}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onFocus={() => setIsOpen(true)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Dropdown */}
        {isOpen && (
          <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-64 overflow-y-auto">
            {filteredMembers.length === 0 ? (
              <div className="p-4 text-gray-500 text-center">
                {members.length === 0 ? 'No band members found' : 'No matching members'}
              </div>
            ) : (
              filteredMembers.map(member => (
                <div
                  key={member.id}
                  className={`p-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0 ${
                    selectedMembers.includes(member.id) ? 'bg-blue-50' : ''
                  }`}
                  onClick={() => toggleMember(member.id)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-gray-400" />
                        <h3 className="font-medium text-gray-900">{member.name}</h3>
                        {selectedMembers.includes(member.id) && (
                          <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                        )}
                      </div>
                      
                      {member.instruments && member.instruments.length > 0 && (
                        <div className="flex items-center gap-1 mt-1">
                          <Music className="w-3 h-3 text-gray-400" />
                          <span className="text-sm text-gray-600">
                            {member.instruments.join(', ')}
                          </span>
                        </div>
                      )}
                      
                      <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                        {member.birthDate && (
                          <div className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            <span>{new Date(member.birthDate).getFullYear()}</span>
                          </div>
                        )}
                        
                        {member.nationality && (
                          <span>{member.nationality}</span>
                        )}
                        
                        {member.wikipediaUrl && (
                          <a
                            href={member.wikipediaUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-blue-600 hover:text-blue-800"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Globe className="w-3 h-3" />
                            <span>Wikipedia</span>
                          </a>
                        )}
                      </div>
                    </div>
                    
                    {member.imageUrl && (
                      <img
                        src={member.imageUrl}
                        alt={member.name}
                        className="w-12 h-12 rounded-full object-cover ml-3"
                      />
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Add New Member Section */}
      <div className="mt-4 flex gap-2">
        <button
          onClick={() => setShowAddMemberForm(!showAddMemberForm)}
          className="flex items-center gap-1 text-sm text-green-600 hover:text-green-700 underline"
        >
          <UserPlus className="w-4 h-4" />
          Add new member
        </button>
      </div>

      {/* Add New Member Form */}
      {showAddMemberForm && (
        <div className="mt-3 border border-gray-300 dark:border-gray-600 rounded-lg p-4 bg-gray-50 dark:bg-gray-800">
          <h4 className="font-medium text-sm mb-3">Add New Band Member</h4>
          <p className="text-xs text-gray-600 dark:text-gray-400 mb-4">
            Following WikiPortraits requirements for Wikidata entity creation. Fields marked with * are mandatory.
          </p>
          
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                Member Name *
              </label>
              <input
                type="text"
                value={newMemberName}
                onChange={(e) => setNewMemberName(e.target.value)}
                placeholder="Enter member name"
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              />
            </div>
            
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                Legal Name (optional)
              </label>
              <input
                type="text"
                value={newMemberLegalName}
                onChange={(e) => setNewMemberLegalName(e.target.value)}
                placeholder="Full legal name if different from stage name"
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              />
              <p className="text-xs text-gray-500 mt-1">Only fill if different from the name above</p>
            </div>
            
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                Gender *
              </label>
              <select
                value={newMemberGender}
                onChange={(e) => setNewMemberGender(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              >
                <option value="">Select gender</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="non-binary gender">Non-binary</option>
                <option value="trans man">Trans man</option>
                <option value="trans woman">Trans woman</option>
              </select>
            </div>
            
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                Instruments (optional)
              </label>
              <input
                type="text"
                value={newMemberInstruments}
                onChange={(e) => setNewMemberInstruments(e.target.value)}
                placeholder="e.g., vocals, guitar, bass"
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              />
              <p className="text-xs text-gray-500 mt-1">Separate multiple instruments with commas</p>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Nationality (optional)
                </label>
                <CountrySelector
                  value={newMemberNationality}
                  onChange={(country) => setNewMemberNationality(country)}
                  placeholder="Select country..."
                  className="text-sm"
                />
                <p className="text-xs text-gray-500 mt-1">Used for description and country of citizenship</p>
              </div>
              
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Birth Year (optional)
                </label>
                <input
                  type="text"
                  value={newMemberBirthYear}
                  onChange={(e) => setNewMemberBirthYear(e.target.value)}
                  placeholder="e.g., 1990"
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                />
                <p className="text-xs text-gray-500 mt-1">Used for date of birth in Wikidata</p>
              </div>
            </div>
          </div>
          
          <div className="flex gap-2 mt-4">
            <button
              onClick={handleAddNewMember}
              disabled={!newMemberName.trim() || !newMemberGender.trim()}
              className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Add Member
            </button>
            <button
              onClick={() => {
                setShowAddMemberForm(false);
                setNewMemberName('');
                setNewMemberInstruments('');
                setNewMemberNationality('');
                setNewMemberGender('');
                setNewMemberLegalName('');
                setNewMemberBirthYear('');
              }}
              className="px-3 py-1 text-sm bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
            >
              Cancel
            </button>
          </div>
          
          <p className="text-xs text-gray-500 mt-2">
            This member will be created in Wikidata during the publishing process, following WikiPortraits standards.
          </p>
        </div>
      )}

      {/* Click outside to close */}
      {isOpen && (
        <div
          className="fixed inset-0 z-0"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
}