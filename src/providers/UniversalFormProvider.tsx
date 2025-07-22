'use client';

import React, { createContext, useContext, ReactNode, useEffect } from 'react';
import { useForm, UseFormReturn, FormProvider } from 'react-hook-form';
import { UniversalFormData } from '../types/unified-form';
import { WikidataEntity } from '../types/wikidata';

interface UniversalFormContextType extends UseFormReturn<UniversalFormData> {
  // Additional helper methods
  hasChanges: boolean;
  changedSections: string[];
  resetToOriginal: () => void;
  getChangedFields: () => Partial<Record<keyof UniversalFormData, any>>;
  saveToStorage: () => void;
  loadFromStorage: () => boolean;
  clearStorage: () => void;
}

const UniversalFormContext = createContext<UniversalFormContextType | null>(null);

interface UniversalFormProviderProps {
  children: ReactNode;
  defaultValues?: Partial<UniversalFormData>;
  onSubmitAction?: (data: UniversalFormData) => void;
  sessionId?: string; // Optional session ID for localStorage
  autoSave?: boolean; // Auto-save to localStorage on changes
}

export function UniversalFormProvider({ 
  children, 
  defaultValues,
  onSubmitAction: onSubmit,
  sessionId,
  autoSave = true
}: UniversalFormProviderProps) {
  
  const storageKey = `universal-form-${sessionId || 'default'}`;
  
  // Try to load from localStorage first
  const loadFromStorage = (): UniversalFormData | null => {
    if (typeof window === 'undefined') return null;
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Convert date strings back to Date objects
        if (parsed.eventDetails?.common?.date) {
          parsed.eventDetails.common.date = new Date(parsed.eventDetails.common.date);
        }
        if (parsed.session?.createdAt) {
          parsed.session.createdAt = new Date(parsed.session.createdAt);
        }
        if (parsed.session?.lastModified) {
          parsed.session.lastModified = new Date(parsed.session.lastModified);
        }
        return parsed;
      }
    } catch (error) {
      console.warn('Failed to load from localStorage:', error);
    }
    return null;
  };
  
  // Create default values if none provided
  const createInitialValues = (): UniversalFormData => {
    return {
      workflowType: 'music-event',
    isWikiPortraitsJob: true,
    entities: {
      people: [],
      organizations: [],
      locations: [],
      events: []
    },
    eventDetails: {
      title: '',
      language: 'en'
    },
    computed: {
      categories: {
        auto: [],
        suggested: [],
        manual: [],
        rejected: [],
        all: []
      },
      fileNaming: {
        pattern: '',
        components: {},
        preview: '',
        examples: []
      },
      templates: {
        description: '',
        information: '',
        categories: '',
        license: ''
      },
      summary: {
        title: '',
        peopleCount: 0,
        organizationCount: 0,
        locationCount: 0,
        autoCategories: 0,
        estimatedQuality: 'low'
      }
    },
    files: {
      queue: [],
      uploaded: []
    },
    publishing: {
      status: 'draft',
      actions: []
    },
    ui: {
      currentStep: 0,
      completedSteps: [],
      paneState: {}
    },
    validation: {
      isValid: false,
      errors: [],
      warnings: [],
      completeness: 0
    },
    session: {
      id: crypto.randomUUID(),
      createdAt: new Date(),
      lastModified: new Date(),
      version: 1
    }
    };
  };
  
  // Use stored data, then defaultValues, then defaults
  const storedData = loadFromStorage();
  const finalValues = storedData || {
    ...createInitialValues(),
    ...defaultValues
  };

  const form = useForm<UniversalFormData>({
    defaultValues: finalValues,
    mode: 'onChange'
  });

  // Storage functions
  const saveToStorageFunc = () => {
    if (typeof window === 'undefined') return;
    try {
      const currentData = form.getValues();
      const dataToSave = {
        ...currentData,
        session: {
          ...currentData.session,
          lastModified: new Date(),
          savedAt: new Date()
        }
      };
      localStorage.setItem(storageKey, JSON.stringify(dataToSave));
      console.log('💾 Saved to localStorage:', storageKey);
    } catch (error) {
      console.warn('Failed to save to localStorage:', error);
    }
  };
  
  const loadFromStorageFunc = (): boolean => {
    const stored = loadFromStorage();
    if (stored) {
      form.reset(stored);
      console.log('📂 Loaded from localStorage:', storageKey);
      return true;
    }
    return false;
  };
  
  const clearStorageFunc = () => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.removeItem(storageKey);
      console.log('🗑️ Cleared localStorage:', storageKey);
    } catch (error) {
      console.warn('Failed to clear localStorage:', error);
    }
  };
  
  // Auto-save on form changes
  useEffect(() => {
    if (!autoSave) return;
    
    let timeoutId: NodeJS.Timeout;
    
    const subscription = form.watch(() => {
      // Clear previous timeout
      if (timeoutId) clearTimeout(timeoutId);
      
      // Debounce the save operation
      timeoutId = setTimeout(() => {
        saveToStorageFunc();
      }, 1000); // Save 1 second after last change
    });
    
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      subscription.unsubscribe();
    };
  }, [autoSave, form.watch]);

  // Enhanced context value with helper methods
  const contextValue: UniversalFormContextType = {
    ...form,
    hasChanges: form.formState.isDirty,
    changedSections: Object.keys(form.formState.dirtyFields),
    resetToOriginal: () => form.reset(),
    getChangedFields: () => form.formState.dirtyFields || {},
    saveToStorage: saveToStorageFunc,
    loadFromStorage: loadFromStorageFunc,
    clearStorage: clearStorageFunc
  };

  const handleSubmit = form.handleSubmit((data) => {
    onSubmit?.(data);
  });

  return (
    <UniversalFormContext.Provider value={contextValue}>
      <FormProvider {...form}>
        <form onSubmit={handleSubmit}>
          {children}
        </form>
      </FormProvider>
    </UniversalFormContext.Provider>
  );
}

export function useUniversalForm(): UniversalFormContextType {
  const context = useContext(UniversalFormContext);
  if (!context) {
    throw new Error('useUniversalForm must be used within UniversalFormProvider');
  }
  return context;
}

// Convenience hooks for specific sections
export function useUniversalFormEntities() {
  const form = useUniversalForm();
  return {
    // Return WikidataEntity arrays directly
    people: form.watch('entities.people') as WikidataEntity[],
    organizations: form.watch('entities.organizations') as WikidataEntity[],
    locations: form.watch('entities.locations') as WikidataEntity[],
    events: form.watch('entities.events') as WikidataEntity[],
    addPerson: (person: WikidataEntity) => {
      const current = form.getValues('entities.people') as WikidataEntity[];
      form.setValue('entities.people', [...current, person], { shouldDirty: true });
    },
    removePerson: (index: number) => {
      const current = form.getValues('entities.people') as WikidataEntity[];
      form.setValue('entities.people', current.filter((_, i) => i !== index), { shouldDirty: true });
    },
    addOrganization: (org: WikidataEntity) => {
      const current = form.getValues('entities.organizations') as WikidataEntity[];
      form.setValue('entities.organizations', [...current, org], { shouldDirty: true });
    },
    removeOrganization: (index: number) => {
      const current = form.getValues('entities.organizations') as WikidataEntity[];
      form.setValue('entities.organizations', current.filter((_, i) => i !== index), { shouldDirty: true });
    }
  };
}

export function useUniversalFormEventDetails() {
  const form = useUniversalForm();
  const eventDetails = form.watch('eventDetails');
  return {
    common: eventDetails,
    musicEvent: eventDetails,
    soccerMatch: eventDetails,
    portraitSession: eventDetails,
    generalUpload: eventDetails,
    custom: eventDetails,
    setTitle: (title: string) => form.setValue('eventDetails.title' as any, title, { shouldDirty: true }),
    setDate: (date: Date) => form.setValue('eventDetails.date' as any, date, { shouldDirty: true })
  };
}

export function useUniversalFormFiles() {
  const form = useUniversalForm();
  return {
    queue: form.watch('files.queue'),
    uploaded: form.watch('files.uploaded'),
    addToQueue: (file: any) => {
      const current = form.getValues('files.queue');
      form.setValue('files.queue', [...current, file], { shouldDirty: true });
    },
    removeFromQueue: (id: string) => {
      const current = form.getValues('files.queue');
      form.setValue('files.queue', current.filter(f => f.id !== id), { shouldDirty: true });
    }
  };
}

export function useUniversalFormCategories() {
  const form = useUniversalForm();
  return {
    all: form.watch('computed.categories.all'),
    manual: form.watch('computed.categories.manual'),
    auto: form.watch('computed.categories.auto'),
    suggested: form.watch('computed.categories.suggested'),
    rejected: form.watch('computed.categories.rejected'),
    addManual: (category: string) => {
      const current = form.getValues('computed.categories.manual');
      if (!current.includes(category)) {
        form.setValue('computed.categories.manual', [...current, category], { shouldDirty: true });
        // Update 'all' categories
        const allCurrent = form.getValues('computed.categories.all');
        form.setValue('computed.categories.all', [...allCurrent, category], { shouldDirty: true });
      }
    },
    removeManual: (category: string) => {
      const current = form.getValues('computed.categories.manual');
      form.setValue('computed.categories.manual', current.filter(c => c !== category), { shouldDirty: true });
      // Update 'all' categories
      const allCurrent = form.getValues('computed.categories.all');
      form.setValue('computed.categories.all', allCurrent.filter(c => c !== category), { shouldDirty: true });
    },
    rejectSuggestion: (category: string) => {
      const rejected = form.getValues('computed.categories.rejected');
      form.setValue('computed.categories.rejected', [...rejected, category], { shouldDirty: true });
      const suggested = form.getValues('computed.categories.suggested');
      form.setValue('computed.categories.suggested', suggested.filter(s => s.name !== category), { shouldDirty: true });
    }
  };
}