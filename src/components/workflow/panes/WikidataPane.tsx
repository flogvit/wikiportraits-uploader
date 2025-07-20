'use client';

import { useState } from 'react';
import { Database, User, Users, Edit3, Trash2, CheckCircle, AlertCircle } from 'lucide-react';
import { useUniversalForm, useUniversalFormEntities } from '@/providers/UniversalFormProvider';
import { PendingWikidataEntity, PendingBandMemberData, PendingBandData } from '@/types/music';

interface WikidataPaneProps {
  onComplete?: () => void;
}

export default function WikidataPane({
  onComplete
}: WikidataPaneProps) {
  const form = useUniversalForm();
  const { people, organizations, removePerson, removeOrganization } = useUniversalFormEntities();
  
  // Convert UniversalForm entities to old format for compatibility
  const pendingWikidataEntities = [
    ...people.filter(p => p.isNew).map((person, index) => ({
      id: person.entity.id || `person-${index}`,
      name: person.entity.labels?.en?.value || 'Unknown',
      type: 'band_member' as const,
      status: 'created' as const,
      new: true,
      data: {
        name: person.entity.labels?.en?.value || 'Unknown',
        instruments: person.metadata?.instruments || [],
        nationality: person.metadata?.nationality,
        birthDate: person.metadata?.birthDate,
        bandId: person.metadata?.bandId,
        isBandMember: person.roles.includes('band-member'),
        wikidataUrl: person.metadata?.wikidataUrl,
        wikipediaUrl: person.metadata?.wikipediaUrl,
        imageUrl: person.metadata?.imageUrl
      }
    })),
    ...organizations.filter(o => o.isNew).map((org, index) => ({
      id: org.entity.id || `org-${index}`,
      name: org.entity.labels?.en?.value || 'Unknown',
      type: 'band' as const,
      status: 'created' as const,
      new: true,
      data: {
        name: org.entity.labels?.en?.value || 'Unknown'
      }
    }))
  ];
  
  const performers = people;
  const [editingEntity, setEditingEntity] = useState<string | null>(null);

  const handleEntityUpdate = (entityId: string, updates: Partial<PendingWikidataEntity>) => {
    // Find and update the entity in people or organizations
    const personIndex = people.findIndex(p => p.entity.id === entityId);
    if (personIndex >= 0) {
      const person = people[personIndex];
      const updatedPerson = {
        ...person,
        entity: {
          ...person.entity,
          labels: {
            ...person.entity.labels,
            en: {
              language: 'en' as const,
              value: updates.name || person.entity.labels?.en?.value || 'Unknown'
            }
          }
        },
        metadata: {
          ...person.metadata,
          ...updates.data
        }
      };
      
      // Update directly through form setValue instead of using hooks
      const currentPeople = form.getValues('entities.people');
      const newPeople = [...currentPeople];
      newPeople[personIndex] = updatedPerson;
      form.setValue('entities.people', newPeople, { shouldDirty: true });
    }
    
    const orgIndex = organizations.findIndex(o => o.entity.id === entityId);
    if (orgIndex >= 0) {
      const org = organizations[orgIndex];
      const updatedOrg = {
        ...org,
        entity: {
          ...org.entity,
          labels: {
            ...org.entity.labels,
            en: {
              language: 'en' as const,
              value: updates.name || org.entity.labels?.en?.value || 'Unknown'
            }
          }
        },
        metadata: {
          ...org.metadata,
          ...updates.data
        }
      };
      
      // Update directly through form setValue instead of using hooks
      const currentOrgs = form.getValues('entities.organizations');
      const newOrgs = [...currentOrgs];
      newOrgs[orgIndex] = updatedOrg;
      form.setValue('entities.organizations', newOrgs, { shouldDirty: true });
    }
    
    setEditingEntity(null);
  };

  const handleEntityDelete = (entityId: string) => {
    // Find and remove the entity from people or organizations
    const personIndex = people.findIndex(p => p.entity.id === entityId);
    if (personIndex >= 0) {
      removePerson(personIndex);
      return;
    }
    
    const orgIndex = organizations.findIndex(o => o.entity.id === entityId);
    if (orgIndex >= 0) {
      removeOrganization(orgIndex);
    }
  };

  const bandEntities = pendingWikidataEntities.filter((entity: PendingWikidataEntity) => entity.type === 'band');
  const memberEntities = pendingWikidataEntities.filter((entity: PendingWikidataEntity) => entity.type === 'band_member');

  return (
    <div className="space-y-6">
      <div className="text-center">
        <Database className="w-12 h-12 mx-auto mb-4 text-primary" />
        <h2 className="text-2xl font-bold text-card-foreground mb-2">Wikidata Entities</h2>
        <p className="text-muted-foreground">
          Review and configure entities to be created in Wikidata
        </p>
      </div>

      {pendingWikidataEntities.length === 0 ? (
        <div className="text-center py-8">
          <AlertCircle className="w-16 h-16 mx-auto mb-4 text-gray-400" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Pending Entities</h3>
          <p className="text-gray-500">
            All bands and members are already in Wikidata, or you haven't added any custom members yet.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Bands to Create */}
          {bandEntities.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-card-foreground mb-4 flex items-center gap-2">
                <Users className="w-5 h-5" />
                Bands to Create ({bandEntities.length})
              </h3>
              <div className="space-y-3">
                {bandEntities.map((entity: PendingWikidataEntity) => (
                  <BandEntityCard
                    key={entity.id}
                    entity={entity}
                    isEditing={editingEntity === entity.id}
                    onEdit={() => setEditingEntity(entity.id)}
                    onUpdate={(updates) => handleEntityUpdate(entity.id, updates)}
                    onDelete={() => handleEntityDelete(entity.id)}
                    onCancelEdit={() => setEditingEntity(null)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Band Members to Create */}
          {memberEntities.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-card-foreground mb-4 flex items-center gap-2">
                <User className="w-5 h-5" />
                Band Members to Create ({memberEntities.length})
              </h3>
              <div className="space-y-3">
                {memberEntities.map((entity: PendingWikidataEntity) => (
                  <BandMemberEntityCard
                    key={entity.id}
                    entity={entity}
                    isEditing={editingEntity === entity.id}
                    onEdit={() => setEditingEntity(entity.id)}
                    onUpdate={(updates) => handleEntityUpdate(entity.id, updates)}
                    onDelete={() => handleEntityDelete(entity.id)}
                    onCancelEdit={() => setEditingEntity(null)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Summary */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="w-5 h-5 text-blue-600" />
              <h4 className="font-medium text-blue-900 dark:text-blue-100">Creation Summary</h4>
            </div>
            <div className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
              <p>• {bandEntities.length} band{bandEntities.length !== 1 ? 's' : ''} will be created</p>
              <p>• {memberEntities.length} band member{memberEntities.length !== 1 ? 's' : ''} will be created</p>
              <p>• Relationships will be established between bands and members</p>
            </div>
          </div>

          {/* Continue Button */}
          <div className="text-center">
            <button
              onClick={() => onComplete?.()}
              className="px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
            >
              Continue to Publishing - Create {pendingWikidataEntities.length} Entities
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

interface EntityCardProps {
  entity: PendingWikidataEntity;
  isEditing: boolean;
  onEdit: () => void;
  onUpdate: (updates: Partial<PendingWikidataEntity>) => void;
  onDelete: () => void;
  onCancelEdit: () => void;
}

function BandEntityCard({ entity, isEditing, onEdit, onUpdate, onDelete, onCancelEdit }: EntityCardProps) {
  const [editName, setEditName] = useState(entity.name);
  const [editDescription, setEditDescription] = useState(entity.description || '');

  const handleSave = () => {
    onUpdate({
      name: editName,
      description: editDescription,
      data: {
        ...entity.data,
        name: editName,
      } as PendingBandData
    });
  };

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-white dark:bg-gray-800">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-gray-400" />
          <span className="font-medium text-gray-900 dark:text-gray-100">{entity.name}</span>
          <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">Band</span>
        </div>
        <div className="flex gap-2">
          <button
            onClick={onEdit}
            className="p-1 text-gray-400 hover:text-gray-600"
          >
            <Edit3 className="w-4 h-4" />
          </button>
          <button
            onClick={onDelete}
            className="p-1 text-gray-400 hover:text-red-600"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {isEditing ? (
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Band Name
            </label>
            <input
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Description
            </label>
            <input
              type="text"
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
              placeholder="e.g., Norwegian rock band"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700"
            >
              Save
            </button>
            <button
              onClick={onCancelEdit}
              className="px-3 py-1 text-sm bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="text-sm text-gray-600 dark:text-gray-400">
          <p>{entity.description || 'No description'}</p>
        </div>
      )}
    </div>
  );
}

function BandMemberEntityCard({ entity, isEditing, onEdit, onUpdate, onDelete, onCancelEdit }: EntityCardProps) {
  const [editName, setEditName] = useState(entity.name);
  const [editInstruments, setEditInstruments] = useState(
    ((entity.data as PendingBandMemberData).instruments || []).join(', ')
  );

  const handleSave = () => {
    onUpdate({
      name: editName,
      data: {
        ...entity.data,
        name: editName,
        instruments: editInstruments.trim() ? editInstruments.split(',').map(i => i.trim()) : undefined,
      } as PendingBandMemberData
    });
  };

  const memberData = entity.data as PendingBandMemberData;

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-white dark:bg-gray-800">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <User className="w-5 h-5 text-gray-400" />
          <span className="font-medium text-gray-900 dark:text-gray-100">{entity.name}</span>
          <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full">Member</span>
        </div>
        <div className="flex gap-2">
          <button
            onClick={onEdit}
            className="p-1 text-gray-400 hover:text-gray-600"
          >
            <Edit3 className="w-4 h-4" />
          </button>
          <button
            onClick={onDelete}
            className="p-1 text-gray-400 hover:text-red-600"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {isEditing ? (
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Member Name
            </label>
            <input
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Instruments
            </label>
            <input
              type="text"
              value={editInstruments}
              onChange={(e) => setEditInstruments(e.target.value)}
              placeholder="e.g., vocals, guitar, bass"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700"
            >
              Save
            </button>
            <button
              onClick={onCancelEdit}
              className="px-3 py-1 text-sm bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
          <p>
            <strong>Gender:</strong> {memberData.gender || 'Not specified'}
          </p>
          <p>
            <strong>Instruments:</strong> {memberData.instruments && memberData.instruments.length > 0
              ? memberData.instruments.join(', ')
              : 'Not specified'
            }
          </p>
          <p>
            <strong>Nationality:</strong> {memberData.nationalityName || 'Not specified'}
            {memberData.nationality && (
              <span className="text-xs text-muted-foreground ml-1">({memberData.nationality})</span>
            )}
          </p>
          <p>
            <strong>Birth Date:</strong> {memberData.birthDate || 'Not specified'}
          </p>
          {memberData.legalName && (
            <p>
              <strong>Legal Name:</strong> {memberData.legalName}
            </p>
          )}
        </div>
      )}
    </div>
  );
}