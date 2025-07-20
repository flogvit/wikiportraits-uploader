'use client';

import { useState } from 'react';
import { UserPlus, ChevronDown, Plus, X } from 'lucide-react';
import { PendingWikidataEntity, PendingBandMemberData } from '@/types/music';
import { COMMON_INSTRUMENTS, COMMON_ROLES, InstrumentRole } from '@/hooks/useWikidataPersons';
import CountrySelector from './CountrySelector';
import PerformerCard from '@/components/common/PerformerCard';
import { useUniversalForm, useUniversalFormEntities } from '@/providers/UniversalFormProvider';

interface NewPerformerSelectorProps {
  bandName?: string;
  bandId?: string;
  showTitle?: boolean;
}

export default function NewPerformerSelector({
  bandName,
  bandId,
  showTitle = true,
}: NewPerformerSelectorProps) {
  const { getValues, setValue } = useUniversalForm();
  const entities = useUniversalFormEntities();
  const people = entities.people || [];
  const pendingPerformers = people.filter((p: any) => p.new === true);
  const [showAddArtistForm, setShowAddArtistForm] = useState(false);
  const [newArtistName, setNewArtistName] = useState('');
  const [newArtistInstruments, setNewArtistInstruments] = useState<string[]>([]);
  const [newArtistNationality, setNewArtistNationality] = useState('');
  const [newArtistGender, setNewArtistGender] = useState('');
  const [newArtistLegalName, setNewArtistLegalName] = useState('');
  const [newArtistBirthDate, setNewArtistBirthDate] = useState('');
  const [newArtistIsBandMember, setNewArtistIsBandMember] = useState(false);
  const [showInstrumentDropdown, setShowInstrumentDropdown] = useState(false);
  const [customInstrument, setCustomInstrument] = useState('');

  const pendingPerformersForDisplay = pendingPerformers;

  const addInstrumentRole = (item: InstrumentRole) => {
    if (!newArtistInstruments.includes(item.name)) {
      setNewArtistInstruments([...newArtistInstruments, item.name]);
    }
    setShowInstrumentDropdown(false);
  };

  const addCustomInstrument = () => {
    if (customInstrument.trim() && !newArtistInstruments.includes(customInstrument.trim())) {
      setNewArtistInstruments([...newArtistInstruments, customInstrument.trim()]);
      setCustomInstrument('');
    }
  };

  const removeInstrumentRole = (instrument: string) => {
    setNewArtistInstruments(newArtistInstruments.filter(i => i !== instrument));
  };

  const handleAddArtist = async () => {
    if (!newArtistName.trim()) return;

    const newArtist: PendingWikidataEntity = {
      id: `pending-artist-${Date.now()}`,
      type: 'band_member',
      status: 'pending',
      name: newArtistName,
      new: true,
      data: {
        name: newArtistName,
        legalName: newArtistLegalName || undefined,
        instruments: newArtistInstruments,
        nationality: newArtistNationality || undefined,
        gender: newArtistGender as any || undefined,
        birthDate: newArtistBirthDate || undefined,
        isBandMember: newArtistIsBandMember,
        bandId: bandId || `pending-band-${bandName}`,
      } as PendingBandMemberData
    };

    // Add to form - add to entities.people
    entities.addPerson(newArtist);

    // Reset form
    setNewArtistName('');
    setNewArtistInstruments([]);
    setNewArtistNationality('');
    setNewArtistGender('');
    setNewArtistLegalName('');
    setNewArtistBirthDate('');
    setNewArtistIsBandMember(false);
    setShowAddArtistForm(false);
  };

  const handleRemove = (performerId: string) => {
    const currentPeople = getValues('entities.people') || [];
    const index = currentPeople.findIndex((p: any) => p.id === performerId);
    if (index >= 0) {
      entities.removePerson(index);
    }
  };

  const selectedPendingPerformers = pendingPerformersForDisplay;

  return (
    <div className="space-y-4">
      {/* Add New Artist Section */}
      <div className="space-y-2">
        <div className="flex gap-2">
          <button
            onClick={() => setShowAddArtistForm(!showAddArtistForm)}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm"
          >
            <UserPlus className="w-4 h-4" />
            Add New Artist
          </button>
        </div>
      </div>

      {/* Add Artist Form */}
      {showAddArtistForm && (
        <div className="p-4 border border-gray-200 rounded-lg bg-gray-50">
          <h3 className="font-medium text-gray-900 mb-3">Add New Artist</h3>
          
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Artist Name *
              </label>
              <input
                type="text"
                value={newArtistName}
                onChange={(e) => setNewArtistName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="e.g., John Doe"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Legal Name (if different)
              </label>
              <input
                type="text"
                value={newArtistLegalName}
                onChange={(e) => setNewArtistLegalName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="e.g., Jonathan Smith"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Instruments/Role
              </label>
              
              {/* Selected instruments/roles display */}
              {newArtistInstruments.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-2">
                  {newArtistInstruments.map((instrument) => (
                    <div
                      key={instrument}
                      className="flex items-center gap-1 px-2 py-1 bg-blue-100 border border-blue-300 rounded-full text-sm"
                    >
                      <span>{instrument}</span>
                      <button
                        onClick={() => removeInstrumentRole(instrument)}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Dropdown for selecting instruments/roles */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowInstrumentDropdown(!showInstrumentDropdown)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent flex items-center justify-between"
                >
                  <span className="text-gray-500">Select instruments/roles...</span>
                  <ChevronDown className="w-4 h-4" />
                </button>

                {showInstrumentDropdown && (
                  <div className="absolute top-full left-0 right-0 bg-white border border-gray-300 rounded-lg shadow-lg z-10 mt-1 max-h-60 overflow-y-auto">
                    {/* Instruments section */}
                    <div className="px-3 py-2 bg-gray-50 border-b text-xs font-medium text-gray-700">
                      Instruments
                    </div>
                    {COMMON_INSTRUMENTS.map((instrument) => (
                      <button
                        key={instrument.id}
                        type="button"
                        onClick={() => addInstrumentRole(instrument)}
                        className="w-full px-3 py-2 text-left hover:bg-gray-50 border-b border-gray-100"
                        disabled={newArtistInstruments.includes(instrument.name)}
                      >
                        <span className={newArtistInstruments.includes(instrument.name) ? 'text-gray-400' : 'text-gray-900'}>
                          {instrument.name}
                        </span>
                        <span className="text-gray-500 text-xs ml-2">({instrument.id})</span>
                      </button>
                    ))}
                    
                    {/* Roles section */}
                    <div className="px-3 py-2 bg-gray-50 border-b text-xs font-medium text-gray-700">
                      Roles
                    </div>
                    {COMMON_ROLES.map((role) => (
                      <button
                        key={role.id}
                        type="button"
                        onClick={() => addInstrumentRole(role)}
                        className="w-full px-3 py-2 text-left hover:bg-gray-50 border-b border-gray-100"
                        disabled={newArtistInstruments.includes(role.name)}
                      >
                        <span className={newArtistInstruments.includes(role.name) ? 'text-gray-400' : 'text-gray-900'}>
                          {role.name}
                        </span>
                        <span className="text-gray-500 text-xs ml-2">({role.id})</span>
                      </button>
                    ))}
                    
                    {/* Custom instrument input */}
                    <div className="px-3 py-2 border-t border-gray-200">
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={customInstrument}
                          onChange={(e) => setCustomInstrument(e.target.value)}
                          placeholder="Custom instrument/role..."
                          className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              addCustomInstrument();
                            }
                          }}
                        />
                        <button
                          type="button"
                          onClick={addCustomInstrument}
                          disabled={!customInstrument.trim()}
                          className="px-2 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Birth Date
              </label>
              <input
                type="date"
                value={newArtistBirthDate}
                onChange={(e) => setNewArtistBirthDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="e.g., 1990-05-15"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Country of Citizenship
              </label>
              <CountrySelector
                value={newArtistNationality}
                onChange={(country) => setNewArtistNationality(country)}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Gender
              </label>
              <select
                value={newArtistGender}
                onChange={(e) => setNewArtistGender(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Select gender</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="non-binary gender">Non-binary</option>
                <option value="trans man">Trans man</option>
                <option value="trans woman">Trans woman</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isBandMember"
                checked={newArtistIsBandMember}
                onChange={(e) => setNewArtistIsBandMember(e.target.checked)}
                className="rounded border-gray-300"
              />
              <label htmlFor="isBandMember" className="text-sm text-gray-700">
                This person is a band member (not a guest or opening act)
              </label>
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleAddArtist}
                disabled={!newArtistName.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Add Artist
              </button>
              <button
                onClick={() => setShowAddArtistForm(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}