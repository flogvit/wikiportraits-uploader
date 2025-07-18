'use client';

import { createContext, useContext, ReactNode, useState, useEffect } from 'react';
import { useForm, FormProvider, UseFormReturn } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ImageFile } from '@/types';
import { SoccerMatchMetadata, SoccerPlayer } from '@/components/forms/SoccerMatchForm';
import { MusicEventMetadata, PendingWikidataEntity } from '@/types/music';
import { UploadType } from '@/components/selectors/UploadTypeSelector';
import { setItem, getItem, KEYS, loadAuthorWikidataQid, getJsonItem, setJsonItem, removeItem } from '@/utils/localStorage';

// Event details schema - common fields for all event types
const eventDetailsSchema = z.object({
  // Common fields for all event types
  name: z.string().default(''), // Festival name, match description, etc.
  year: z.string().default(''),
  location: z.string().default(''),
  country: z.string().default(''),
  
  
  // Soccer specific fields
  homeTeam: z.any().optional(),
  awayTeam: z.any().optional(),
  venue: z.string().optional(),
  competition: z.string().optional(),
  matchday: z.string().optional(),
  result: z.string().optional(),
  date: z.string().optional(),
  
  // General purpose metadata for any event type
  metadata: z.record(z.any()).optional(),
});

// WikiPortraits workflow configuration - maps to WikiPortraitsPane
const wikiPortraitsSchema = z.object({
  isWikiPortraitsJob: z.boolean().default(true),
  addToWikiPortraitsConcerts: z.boolean().default(false),
  // Additional WikiPortraits-specific settings can go here
});

// Band/Performers schema - maps to BandPerformersPane
const bandPerformersSchema = z.object({
  selectedBand: z.object({
    id: z.string(),
    name: z.string(),
    wikipediaUrl: z.string().optional(),
    wikidataUrl: z.string().optional(),
    musicbrainzId: z.string().optional(),
    country: z.string().optional(),
    entityType: z.string().optional(),
    source: z.string().optional(),
  }).optional(),
  performers: z.array(z.any()).default([]), // Selected performers
});

const categoriesSchema = z.object({
  selectedCategories: z.array(z.string()).default([]),
  newCategoryName: z.string().default(''),
  categoryInput: z.string().default(''),
});

const templatesSchema = z.object({
  selectedLanguage: z.string().default('en'),
  templateCode: z.string().default(''),
  customTemplateName: z.string().default(''),
});

const uploadSchema = z.object({
  currentStep: z.enum(['template', 'images', 'complete']).default('template'),
  templateCreated: z.boolean().default(false),
  uploadProgress: z.number().min(0).max(100).default(0),
  currentUploadIndex: z.number().min(0).default(0),
  stepStatuses: z.object({
    template: z.enum(['pending', 'in-progress', 'completed', 'error']).default('pending'),
    images: z.enum(['pending', 'in-progress', 'completed', 'error']).default('pending'),
    complete: z.enum(['pending', 'in-progress', 'completed', 'error']).default('pending'),
  }).default({
    template: 'pending',
    images: 'pending',
    complete: 'pending'
  }),
});

const imageMetadataSchema = z.object({
  description: z.string().default(''),
  categories: z.array(z.string()).default([]),
  date: z.string().default(''),
  author: z.string().default(''),
  source: z.string().default(''),
  license: z.string().default(''),
  permission: z.string().default(''),
  otherVersions: z.string().default(''),
  additionalCategories: z.array(z.string()).default([]),
  template: z.string().optional(),
  templateModified: z.boolean().default(false),
});

// Root-level workflow schema - keys map directly to workflow panes
const workflowFormSchema = z.object({
  // Specific event type (more granular than uploadType)
  // Examples: uploadType=music → eventType=festival|concert, uploadType=soccer → eventType=match
  eventType: z.enum(['general', 'festival', 'concert', 'match', 'portrait']).default('general'),
  uploadType: z.enum(['general', 'soccer', 'music', 'portraits']).default('general'), // Keep for backward compatibility
  
  // Workflow pane data (root-level keys for easy access)
  wikiPortraits: wikiPortraitsSchema,      // Maps to WikiPortraitsPane (first step)
  eventDetails: eventDetailsSchema,        // Maps to EventDetailsPane
  bandPerformers: bandPerformersSchema,    // Maps to BandPerformersPane
  images: z.array(imageMetadataSchema).default([]), // Maps to ImagesPane
  templates: templatesSchema,              // Maps to TemplatesPane
  categories: categoriesSchema,            // Maps to CategoriesPane
  upload: uploadSchema,                    // Maps to UploadPane
  pendingWikidataEntities: z.array(z.any()).default([]), // Maps to WikidataPane
  
  // Legacy support - to be removed gradually
  selectedPlayers: z.array(z.any()).default([]),
});

export type WorkflowFormData = z.infer<typeof workflowFormSchema>;
export type EventType = 'general' | 'festival' | 'concert' | 'match' | 'portrait';

// Load data from localStorage
const loadStoredData = () => {
  const bandId = getItem(KEYS.FESTIVAL_BAND_ID);
  const bandName = getItem(KEYS.FESTIVAL_BAND_NAME);
  const currentBandId = bandId || `pending-band-${bandName}`;
  console.log('🎸 FormProvider - currentBandId determined as:', currentBandId, 'from bandId:', bandId, 'bandName:', bandName);
  
  return {
    wikiPortraits: {
      isWikiPortraitsJob: true, // Default to WikiPortraits workflow
      addToWikiPortraitsConcerts: false,
    },
    eventDetails: {
      name: getItem(KEYS.FESTIVAL_NAME),
      year: getItem(KEYS.FESTIVAL_YEAR),
      location: getItem(KEYS.FESTIVAL_LOCATION),
      country: getItem(KEYS.FESTIVAL_COUNTRY),
    },
    bandPerformers: {
      selectedBand: (bandId || bandName) ? {
        id: bandId,
        name: bandName,
        wikipediaUrl: getItem(KEYS.FESTIVAL_BAND_WIKIPEDIA),
        wikidataUrl: getItem(KEYS.FESTIVAL_BAND_WIKIDATA),
        musicbrainzId: getItem(KEYS.FESTIVAL_BAND_MUSICBRAINZ),
        country: getItem(KEYS.FESTIVAL_BAND_COUNTRY),
      } : undefined,
      performers: (() => {
        if (!currentBandId) {
          console.log('🎸 FormProvider - No currentBandId, returning empty performers');
          return [];
        }
        const performers = getJsonItem(`performers-${currentBandId}`, []);
        console.log('🎸 FormProvider - Loading performers from localStorage for band', currentBandId, ':', performers.length, 'performers');
        console.log('🎸 FormProvider - Performers data:', performers);
        return performers;
      })(),
    },
    pendingWikidataEntities: (() => {
      if (!currentBandId) return [];
      
      // Load performers from localStorage
      const performers = getJsonItem(`performers-${currentBandId}`, []);
      
      // Extract pending performers (marked with new: true)
      const pendingPerformers = performers.filter((p: any) => p.new === true);
      
      // Convert to PendingWikidataEntity format
      return pendingPerformers.map((p: any) => ({
        id: p.id,
        type: 'band_member',
        status: 'pending',
        name: p.name,
        new: true,
        data: {
          name: p.name,
          instruments: p.instruments || [],
          nationality: p.nationality,
          role: p.role,
          bandId: currentBandId,
          wikidataUrl: p.wikidataUrl,
          wikipediaUrl: p.wikipediaUrl,
          imageUrl: p.imageUrl,
          birthDate: p.birthDate
        }
      }));
    })(),
  };
};


interface WorkflowFormContextType {
  form: UseFormReturn<WorkflowFormData>;
  images: ImageFile[];
  updateImageMetadata: (imageId: string, metadata: Partial<z.infer<typeof imageMetadataSchema>>) => void;
  initializeImages: (images: ImageFile[]) => void;
  getImageMetadata: (imageId: string) => z.infer<typeof imageMetadataSchema> | undefined;
  addImages: (newImages: ImageFile[]) => void;
  updateImage: (imageId: string, updates: Partial<ImageFile>) => void;
  removeImage: (imageId: string) => void;
  // Performer management functions
  addPerformer: (performer: PendingWikidataEntity) => void;
  removePerformer: (performerId: string) => void;
  getAllPerformers: () => any[];
  getPendingPerformers: () => any[];
}

const WorkflowFormContext = createContext<WorkflowFormContextType | undefined>(undefined);

interface WorkflowFormProviderProps {
  children: ReactNode;
  uploadType: UploadType;
  eventDetails?: any; // Can contain initial event details from any source
  selectedPlayers?: SoccerPlayer[]; // Legacy support for soccer
}

export function WorkflowFormProvider({ 
  children, 
  uploadType,
  eventDetails,
  selectedPlayers = []
}: WorkflowFormProviderProps) {
  const [imageFiles, setImageFiles] = useState<ImageFile[]>([]);
  
  // Load stored data or use provided data
  const storedData = loadStoredData();
  
  // Merge provided eventDetails with stored data (provided data takes precedence)
  const finalEventDetails = eventDetails ? {
    ...storedData.eventDetails,
    ...eventDetails,
  } : storedData.eventDetails;
  
  // Band performers data (separate from event details)
  const finalBandPerformers = eventDetails?.selectedBand ? {
    ...storedData.bandPerformers,
    selectedBand: eventDetails.selectedBand,
  } : storedData.bandPerformers;
  
  console.log('🎸 FormProvider - finalBandPerformers:', finalBandPerformers);
  console.log('🎸 FormProvider - finalBandPerformers.performers:', finalBandPerformers?.performers?.length);


  // Map uploadType to specific eventType
  const getEventType = (uploadType: UploadType): string => {
    switch (uploadType) {
      case 'music':
        // Default to festival for music uploads, can be changed to concert in UI
        return 'festival';
      case 'soccer':
        return 'match';
      case 'portraits':
        return 'portrait';
      default:
        return 'general';
    }
  };

  const form = useForm<WorkflowFormData>({
    resolver: zodResolver(workflowFormSchema),
    defaultValues: {
      eventType: getEventType(uploadType),
      uploadType, // Keep for backward compatibility
      
      // Workflow pane data (root-level keys)
      wikiPortraits: storedData.wikiPortraits,
      eventDetails: finalEventDetails,
      bandPerformers: finalBandPerformers,
      images: [],
      templates: {
        selectedLanguage: 'en',
        templateCode: '',
        customTemplateName: '',
      },
      categories: {
        selectedCategories: [],
        newCategoryName: '',
        categoryInput: '',
      },
      upload: {
        currentStep: 'template',
        templateCreated: false,
        uploadProgress: 0,
        currentUploadIndex: 0,
        stepStatuses: {
          template: 'pending',
          images: 'pending',
          complete: 'pending'
        }
      },
      pendingWikidataEntities: storedData.pendingWikidataEntities,
      
      // Legacy support 
      selectedPlayers,
    },
    mode: 'onChange'
  });

  // Debug: Log what's actually in the form after initialization
  useEffect(() => {
    console.log('🎸 FormProvider - ACTUAL FORM DATA after init:', form.getValues());
    console.log('🎸 FormProvider - ACTUAL bandPerformers in form:', form.getValues('bandPerformers'));
    console.log('🎸 FormProvider - ACTUAL performers in form:', form.getValues('bandPerformers')?.performers);
  }, []); // Run only once on mount

  // Sync form when uploadType prop changes
  useEffect(() => {
    const currentUploadType = form.getValues('uploadType');
    if (currentUploadType !== uploadType) {
      form.setValue('uploadType', uploadType);
    }
  }, [uploadType, form]);

  // Save form data to localStorage when eventDetails or pendingWikidataEntities change
  useEffect(() => {
    const subscription = form.watch((value, { name }) => {
      console.log('🔄 FORM WATCH - Field changed:', name, 'Value:', value);
      if (name?.startsWith('eventDetails.') || name?.startsWith('bandPerformers.') || name === 'pendingWikidataEntities') {
        const eventDetails = value.eventDetails;
        const bandPerformers = value.bandPerformers;
        
        if (eventDetails) {
          // Save individual fields to localStorage
          setItem(KEYS.FESTIVAL_NAME, eventDetails.name || '');
          setItem(KEYS.FESTIVAL_YEAR, eventDetails.year || '');
          setItem(KEYS.FESTIVAL_LOCATION, eventDetails.location || '');
          setItem(KEYS.FESTIVAL_COUNTRY, eventDetails.country || '');
        }
          
        if (bandPerformers) {
          // Save band info or clear it if band is removed
          if (bandPerformers.selectedBand) {
            const band = bandPerformers.selectedBand;
            setItem(KEYS.FESTIVAL_BAND_ID, band.id || '');
            setItem(KEYS.FESTIVAL_BAND_NAME, band.name || '');
            setItem(KEYS.FESTIVAL_BAND_WIKIPEDIA, band.wikipediaUrl || '');
            setItem(KEYS.FESTIVAL_BAND_WIKIDATA, band.wikidataUrl || '');
            setItem(KEYS.FESTIVAL_BAND_MUSICBRAINZ, band.musicbrainzId || '');
            setItem(KEYS.FESTIVAL_BAND_COUNTRY, band.country || '');
          } else {
            // Clear performer data when band is removed (get current band ID before clearing)
            const currentBandId = getItem(KEYS.FESTIVAL_BAND_ID);
            if (currentBandId) {
              removeItem(`performers-${currentBandId}`);
            }
            
            // Clear all band-related data when band is removed
            setItem(KEYS.FESTIVAL_BAND_ID, '');
            setItem(KEYS.FESTIVAL_BAND_NAME, '');
            setItem(KEYS.FESTIVAL_BAND_WIKIPEDIA, '');
            setItem(KEYS.FESTIVAL_BAND_WIKIDATA, '');
            setItem(KEYS.FESTIVAL_BAND_MUSICBRAINZ, '');
            setItem(KEYS.FESTIVAL_BAND_COUNTRY, '');
          }
          
          // Save performers to localStorage when they change
          if (bandPerformers.selectedBand?.id) {
            const bandId = bandPerformers.selectedBand.id;
            const performers = bandPerformers.performers || [];
            
            // Save performer data directly from form without transformation
            const performerData = performers.filter((performer: any) => 
              performer.data?.bandId === bandId || !performer.data?.bandId
            );
            
            setJsonItem(`performers-${bandId}`, performerData);
            console.log('🎸 FormProvider - Saved performers to localStorage:', performerData.length, 'performers');
          }
        }
      }
    });
    
    return () => subscription.unsubscribe();
  }, [form]);

  // Photographer details are fetched on-demand from Q-ID when needed
  // No need to pre-populate form fields

  const updateImageMetadata = (imageId: string, metadata: Partial<z.infer<typeof imageMetadataSchema>>) => {
    const currentImages = form.getValues('images');
    const imageIndex = imageFiles.findIndex(img => img.id === imageId);
    
    if (imageIndex >= 0 && imageIndex < currentImages.length) {
      const updatedImages = [...currentImages];
      updatedImages[imageIndex] = {
        ...updatedImages[imageIndex],
        ...metadata
      };
      form.setValue('images', updatedImages);
    }
  };

  const addImages = (newImages: ImageFile[]) => {
    const updatedImages = [...imageFiles, ...newImages];
    setImageFiles(updatedImages);
    
    // Also update the form metadata
    const currentMetadata = form.getValues('images');
    const newMetadata = newImages.map(img => ({
      description: img.metadata?.description || '',
      categories: img.metadata?.categories || [],
      date: img.metadata?.date || '',
      author: img.metadata?.author || '',
      source: img.metadata?.source || '',
      license: img.metadata?.license || '',
      permission: img.metadata?.permission || '',
      otherVersions: img.metadata?.otherVersions || '',
      additionalCategories: img.metadata?.additionalCategories || [],
      template: img.metadata?.template,
      templateModified: img.metadata?.templateModified || false,
    }));
    form.setValue('images', [...currentMetadata, ...newMetadata]);
  };

  const updateImage = (imageId: string, updates: Partial<ImageFile>) => {
    setImageFiles(prev => 
      prev.map(img => 
        img.id === imageId ? { ...img, ...updates } : img
      )
    );
  };

  const removeImage = (imageId: string) => {
    const imageIndex = imageFiles.findIndex(img => img.id === imageId);
    if (imageIndex >= 0) {
      // Remove from imageFiles
      setImageFiles(prev => prev.filter(img => img.id !== imageId));
      
      // Remove from form metadata
      const currentMetadata = form.getValues('images');
      const updatedMetadata = currentMetadata.filter((_, index) => index !== imageIndex);
      form.setValue('images', updatedMetadata);
    }
  };

  const initializeImages = (newImages: ImageFile[]) => {
    setImageFiles(newImages);
    const imageMetadata = newImages.map(img => ({
      description: img.metadata?.description || '',
      categories: img.metadata?.categories || [],
      date: img.metadata?.date || '',
      author: img.metadata?.author || '',
      source: img.metadata?.source || '',
      license: img.metadata?.license || '',
      permission: img.metadata?.permission || '',
      otherVersions: img.metadata?.otherVersions || '',
      additionalCategories: img.metadata?.additionalCategories || [],
      template: img.metadata?.template,
      templateModified: img.metadata?.templateModified || false,
    }));
    form.setValue('images', imageMetadata);
  };

  const getImageMetadata = (imageId: string): z.infer<typeof imageMetadataSchema> | undefined => {
    const currentImages = form.getValues('images');
    const imageIndex = imageFiles.findIndex(img => img.id === imageId);
    return imageIndex >= 0 ? currentImages[imageIndex] : undefined;
  };

  // Performer management functions
  const addPerformer = (performer: PendingWikidataEntity) => {
    console.log('📋 FormProvider - Adding performer:', performer.name, 'new:', performer.new);
    const currentBandPerformers = form.getValues('bandPerformers') || { performers: [] };
    const currentPendingEntities = form.getValues('pendingWikidataEntities') || [];
    
    // Add to bandPerformers.performers array (only selected performers)
    if (!currentBandPerformers.performers.find((p: any) => p.id === performer.id)) {
      console.log('📋 FormProvider - Adding to bandPerformers.performers');
      form.setValue('bandPerformers.performers', [...currentBandPerformers.performers, performer]);
    }
    
    // Add to pending entities only if it's a new performer
    if (performer.new && !currentPendingEntities.find((entity: any) => entity.id === performer.id)) {
      console.log('📋 FormProvider - Adding to pendingWikidataEntities (new performer)');
      form.setValue('pendingWikidataEntities', [...currentPendingEntities, performer]);
    }
  };

  const removePerformer = (performerId: string) => {
    const currentBandPerformers = form.getValues('bandPerformers') || { performers: [] };
    const currentPendingEntities = form.getValues('pendingWikidataEntities') || [];
    
    // Remove from bandPerformers.performers
    const updatedPerformers = currentBandPerformers.performers.filter((p: any) => p.id !== performerId);
    form.setValue('bandPerformers.performers', updatedPerformers);
    
    // Remove from pending entities
    const updatedPendingEntities = currentPendingEntities.filter((entity: any) => entity.id !== performerId);
    form.setValue('pendingWikidataEntities', updatedPendingEntities);
  };

  const getAllPerformers = () => {
    const bandPerformers = form.getValues('bandPerformers') || { performers: [] };
    const performers = bandPerformers.performers || [];
    // No transformation needed - return performers as-is from form
    console.log('🎸 FormProvider - getAllPerformers returning:', performers.length, 'performers');
    return performers;
  };

  const getPendingPerformers = () => {
    const pendingEntities = form.getValues('pendingWikidataEntities') || [];
    return pendingEntities.filter((entity: any) => entity.new === true);
  };

  const contextValue: WorkflowFormContextType = {
    form,
    images: imageFiles,
    updateImageMetadata,
    initializeImages,
    getImageMetadata,
    addImages,
    updateImage,
    removeImage,
    // Performer management functions
    addPerformer,
    removePerformer,
    getAllPerformers,
    getPendingPerformers,
  };

  return (
    <WorkflowFormContext.Provider value={contextValue}>
      <FormProvider {...form}>
        {children}
      </FormProvider>
    </WorkflowFormContext.Provider>
  );
}

export function useWorkflowForm() {
  const context = useContext(WorkflowFormContext);
  if (context === undefined) {
    throw new Error('useWorkflowForm must be used within a WorkflowFormProvider');
  }
  return context;
}

// Convenience hook to get the form instance directly
export function useWorkflowFormContext() {
  const { form } = useWorkflowForm();
  return form;
}