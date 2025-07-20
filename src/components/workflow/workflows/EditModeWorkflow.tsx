'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { LoadedEvent } from '@/utils/event-loading';
import { useEventLoader } from '@/hooks/useEventLoader';
import { usePublishActions } from '@/hooks/usePublishActions';
import { EventSelector, ConflictSummary, ConflictBadge, PublishActionList } from '@/components/common';
import { UniversalFormProvider, useUniversalForm } from '@/providers/UniversalFormProvider';
import { UniversalFormData } from '@/types/unified-form';
import { WikidataEntity, WorkflowItem } from '@/types/wikidata';

interface EditModeWorkflowProps {
  onEventLoaded?: (event: LoadedEvent) => void;
  onSave?: (event: LoadedEvent, changes: Record<string, any>) => void;
  onCancel?: () => void;
  className?: string;
}

interface EditableEventData {
  name: string;
  description: string;
  date: string;
  location: string;
  participants: WikidataEntity[];
  venue?: WikidataEntity;
  categories: string[];
}

export function EditModeWorkflow({
  onEventLoaded,
  onSave,
  onCancel,
  className = ""
}: EditModeWorkflowProps) {
  const [selectedEvent, setSelectedEvent] = useState<LoadedEvent | null>(null);
  const [editMode, setEditMode] = useState<'search' | 'edit' | 'save'>('search');
  const [editedData, setEditedData] = useState<EditableEventData | null>(null);

  const eventLoader = useEventLoader({
    defaultFilters: { limit: 25 },
    onEventLoaded: (event) => {
      console.log('Event loaded for editing:', event.entity.labels?.en?.value);
      onEventLoaded?.(event);
    },
    onError: (error) => {
      console.error('Event loading failed:', error);
    }
  });


  const publishActions = usePublishActions({
    onActionComplete: (action) => {
      console.log('✅ Action completed:', action.title);
    },
    onActionFailed: (action, error) => {
      console.log('❌ Action failed:', action.title, error);
    },
    onPlanComplete: (plan) => {
      console.log('🎉 Publish plan completed:', plan.id);
    }
  });

  // Initialize editable data when event is selected
  useEffect(() => {
    if (selectedEvent && editMode === 'edit') {
      const entity = selectedEvent.entity;
      
      setEditedData({
        name: entity.labels?.en?.value || '',
        description: entity.descriptions?.en?.value || '',
        date: extractDateFromEntity(entity),
        location: selectedEvent.location?.labels?.en?.value || '',
        participants: selectedEvent.participants || [],
        venue: selectedEvent.venue,
        categories: selectedEvent.categories || []
      });
    }
  }, [selectedEvent, editMode]);

  const extractDateFromEntity = (entity: WikidataEntity): string => {
    const startTime = entity.claims?.['P580']?.[0]?.mainsnak?.datavalue?.value?.time ||
                     entity.claims?.['P585']?.[0]?.mainsnak?.datavalue?.value?.time;
    if (startTime) {
      return new Date(startTime).toISOString().split('T')[0];
    }
    return '';
  };

  const handleEventSelect = useCallback((event: LoadedEvent) => {
    setSelectedEvent(event);
    setEditMode('edit');
  }, []);

  const handleDataChange = useCallback((field: keyof EditableEventData, value: any) => {
    if (!editedData) return;
    
    const updatedData = { ...editedData, [field]: value };
    setEditedData(updatedData);
  }, [editedData]);

  const handleSave = useCallback(async () => {
    if (!selectedEvent || !editedData) return;

    setEditMode('save');
    
    try {
      // Create updated entity with edited data
      const updatedEntity: WikidataEntity = {
        ...selectedEvent.entity,
        labels: {
          ...selectedEvent.entity.labels,
          en: { language: 'en', value: editedData.name }
        },
        descriptions: {
          ...selectedEvent.entity.descriptions,
          en: { language: 'en', value: editedData.description }
        }
      };

      // Create a workflow item from the current changes
      const workflowItem: WorkflowItem<WikidataEntity> = {
        orgData: selectedEvent.entity,
        data: updatedEntity,
        new: false,
        dirty: true, // Always consider it dirty if we're saving
        conflicts: [],
        lastModified: new Date(),
        version: 1
      };

      // Build publish actions plan
      publishActions.buildPlan([workflowItem]);

      console.log('💾 Built save plan with', publishActions.totalActions, 'actions');
      console.log('🎯 Actions ready for PublishPane execution');
      
      // Note: Actual saving will happen in PublishPane
      onSave?.(selectedEvent, editedData);
      
    } catch (error) {
      console.error('Failed to prepare save actions:', error);
    } finally {
      setEditMode('edit');
    }
  }, [selectedEvent, editedData, publishActions, onSave]);

  const handleCancel = useCallback(() => {
    setSelectedEvent(null);
    setEditedData(null);
    setEditMode('search');
    onCancel?.();
  }, [onCancel]);

  const handleBackToSearch = useCallback(() => {
    handleCancel();
  }, [handleCancel]);

  return (
    <div className={`max-w-6xl mx-auto p-6 ${className}`}>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Edit Existing Event</h1>
        <p className="text-gray-600 mt-2">
          Search for an existing event from Wikidata and edit its details for your upload workflow.
        </p>
      </div>

      {/* Mode Indicator */}
      <div className="mb-6">
        <div className="flex items-center space-x-2">
          <div className={`px-3 py-1 rounded text-sm font-medium ${
            editMode === 'search' 
              ? 'bg-blue-100 text-blue-800' 
              : 'bg-gray-100 text-gray-600'
          }`}>
            1. Search
          </div>
          <div className="text-gray-400">→</div>
          <div className={`px-3 py-1 rounded text-sm font-medium ${
            editMode === 'edit' 
              ? 'bg-blue-100 text-blue-800' 
              : 'bg-gray-100 text-gray-600'
          }`}>
            2. Edit
          </div>
          <div className="text-gray-400">→</div>
          <div className={`px-3 py-1 rounded text-sm font-medium ${
            editMode === 'save' 
              ? 'bg-blue-100 text-blue-800' 
              : 'bg-gray-100 text-gray-600'
          }`}>
            3. Save
          </div>
          
        </div>
      </div>

      {/* Search Mode */}
      {editMode === 'search' && (
        <div className="space-y-6">
          <EventSelector
            onEventSelect={handleEventSelect}
            onEventLoad={onEventLoaded}
            initialFilters={{ limit: 25 }}
            placeholder="Search for events to edit (festivals, concerts, conferences, etc.)"
            className="w-full"
          />

          {/* Loading State */}
          {eventLoader.isLoading && (
            <div className="text-center py-8">
              <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
              <p className="text-gray-600">Searching for events...</p>
            </div>
          )}
        </div>
      )}

      {/* Edit Mode */}
      {editMode === 'edit' && selectedEvent && editedData && (
        <div className="space-y-6">
          <div className="flex items-center justify-between bg-blue-50 p-4 rounded-lg">
            <div>
              <h2 className="text-lg font-semibold text-blue-900">
                Editing: {selectedEvent.entity.labels?.en?.value || selectedEvent.entity.id}
              </h2>
              <p className="text-sm text-blue-700">
                Make your changes below. Original data will be preserved.
              </p>
            </div>
            <button
              onClick={handleBackToSearch}
              className="px-3 py-1 text-sm text-blue-600 hover:text-blue-800 border border-blue-200 rounded-md"
            >
              ← Back to Search
            </button>
          </div>

          {/* Conflict Resolution */}
          {eventLoader.workflowItems.has(selectedEvent.entity.id) && (
            <ConflictSummary
              conflicts={eventLoader.workflowItems.get(selectedEvent.entity.id)?.conflicts || []}
            />
          )}

          {/* Edit Form */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Basic Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900">Basic Information</h3>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Event Name
                </label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={editedData.name}
                  onChange={(e) => handleDataChange('name', e.target.value)}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={editedData.description}
                  onChange={(e) => handleDataChange('description', e.target.value)}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Date
                </label>
                <input
                  type="date"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={editedData.date}
                  onChange={(e) => handleDataChange('date', e.target.value)}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Location
                </label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={editedData.location}
                  onChange={(e) => handleDataChange('location', e.target.value)}
                />
              </div>
            </div>

            {/* Original Data Comparison */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900">Original Data</h3>
              
              <div className="bg-gray-50 p-4 rounded-lg space-y-3">
                <div>
                  <span className="text-sm font-medium text-gray-600">Original Name:</span>
                  <p className="text-sm text-gray-800">
                    {selectedEvent.entity.labels?.en?.value || 'No name'}
                  </p>
                </div>

                <div>
                  <span className="text-sm font-medium text-gray-600">Original Description:</span>
                  <p className="text-sm text-gray-800">
                    {selectedEvent.entity.descriptions?.en?.value || 'No description'}
                  </p>
                </div>

                <div>
                  <span className="text-sm font-medium text-gray-600">Original Date:</span>
                  <p className="text-sm text-gray-800">
                    {extractDateFromEntity(selectedEvent.entity) || 'No date'}
                  </p>
                </div>

                <div>
                  <span className="text-sm font-medium text-gray-600">Participants:</span>
                  <p className="text-sm text-gray-800">
                    {selectedEvent.participants.length} participants
                  </p>
                </div>

                <div>
                  <span className="text-sm font-medium text-gray-600">Venue:</span>
                  <p className="text-sm text-gray-800">
                    {selectedEvent.venue?.labels?.en?.value || 'No venue'}
                  </p>
                </div>

                <div>
                  <span className="text-sm font-medium text-gray-600">Wikidata ID:</span>
                  <p className="text-sm text-gray-800 font-mono">
                    {selectedEvent.entity.id}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Categories */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-3">Categories</h3>
            <div className="flex flex-wrap gap-2">
              {editedData.categories.map((category, index) => (
                <span
                  key={index}
                  className="px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full"
                >
                  {category}
                </span>
              ))}
            </div>
          </div>


          {/* Publish Actions Preview */}
          {publishActions.plan && publishActions.totalActions > 0 && (
            <div className="border-t pt-6">
              <div className="mb-4">
                <h3 className="text-lg font-medium text-gray-900 mb-2">Publish Actions Preview</h3>
                <p className="text-sm text-gray-600">
                  These actions will be executed when you publish your changes in the PublishPane.
                </p>
              </div>
              
              <PublishActionList
                actions={publishActions.actions}
                groups={publishActions.groups}
                showGrouped={true}
                showDetails={false}
                onExecuteAction={(actionId) => {
                  console.log('⚠️ Actions should be executed in PublishPane, not here');
                }}
              />
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-6 border-t">
            <div className="flex items-center space-x-2">
              {publishActions.plan && publishActions.totalActions > 0 && (
                <div className="text-sm text-gray-600 bg-blue-50 px-3 py-2 rounded-md">
                  📋 {publishActions.totalActions} actions ready for PublishPane
                </div>
              )}
            </div>
            
            <div className="flex items-center space-x-3">
              <button
                onClick={handleCancel}
                className="px-6 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={editMode === 'save'}
                className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {editMode === 'save' ? 'Preparing...' : 'Prepare for Publish'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default EditModeWorkflow;