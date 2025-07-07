'use client';

import { useState, useEffect } from 'react';
import { CheckCircle, Clock, AlertCircle, Play, ExternalLink, Database, Globe, FolderPlus, Upload, ChevronRight, Settings, Edit, ImagePlus, Music, Calendar } from 'lucide-react';
import { ImageFile } from '@/app/page';
import CategoryCreationModal from './CategoryCreationModal';
import { getCategoriesToCreate, CategoryCreationInfo } from '@/utils/soccer-categories';
import { getCategoriesToCreate as getMusicCategoriesToCreate } from '@/utils/music-categories';
import { SoccerMatchMetadata, SoccerPlayer } from '@/components/SoccerMatchWorkflow';
import { MusicEventMetadata } from '@/types/music';
import ImageUploader from './ImageUploader';
import UploadQueue from './UploadQueue';
import ImageGrid from './ImageGrid';
import SoccerMatchWorkflow from './SoccerMatchWorkflow';
import CountrySelector from './CountrySelector';
import ArtistSelector from './ArtistSelector';

interface WikimediaWorkflowProps {
  images: ImageFile[];
  soccerMatchData?: SoccerMatchMetadata | null;
  selectedPlayers?: SoccerPlayer[];
  musicEventData?: MusicEventMetadata | null;
  uploadType: 'general' | 'soccer' | 'music';
  onImagesAdded: (images: ImageFile[]) => void;
  onImageUpdate: (id: string, metadata: Partial<ImageFile['metadata']>) => void;
  onImageRemove: (id: string) => void;
  onSoccerDataUpdate: (matchData: SoccerMatchMetadata, players: SoccerPlayer[]) => void;
  onMusicEventUpdate: (eventData: MusicEventMetadata) => void;
  onExportMetadata: () => void;
  onBulkEdit: () => void;
  onScrollToImage: (imageId: string) => void;
  onImageClick: (image: ImageFile) => void;
}

type WorkflowStep = 'event-type' | 'event-details' | 'categories' | 'images' | 'wikidata' | 'commons' | 'wikipedia' | 'upload';
type StepStatus = 'pending' | 'ready' | 'in-progress' | 'completed' | 'error';

interface WorkflowStepInfo {
  id: WorkflowStep;
  title: string;
  description: string;
  icon: any;
  status: StepStatus;
  itemCount?: number;
  items?: string[];
  dependencies?: WorkflowStep[];
}

export default function WikimediaWorkflow({ 
  images, 
  soccerMatchData, 
  selectedPlayers = [], 
  musicEventData, 
  uploadType,
  onImagesAdded,
  onImageUpdate,
  onImageRemove,
  onSoccerDataUpdate,
  onMusicEventUpdate,
  onExportMetadata,
  onBulkEdit,
  onScrollToImage,
  onImageClick
}: WikimediaWorkflowProps) {
  const getInitialTab = (): WorkflowStep => {
    if (uploadType === 'music') return 'event-type';
    if (uploadType === 'soccer') return 'event-details';
    return 'images'; // general - start with images since that's the main task
  };

  const [activeTab, setActiveTab] = useState<WorkflowStep>(getInitialTab());
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [categoriesToCreate, setCategoriesToCreate] = useState<CategoryCreationInfo[]>([]);
  const [stepStatuses, setStepStatuses] = useState<Record<WorkflowStep, StepStatus>>({
    'event-type': 'ready',
    'event-details': 'pending',
    categories: 'pending',
    images: 'pending',
    wikidata: 'pending',
    commons: 'pending',
    wikipedia: 'pending',
    upload: 'pending'
  });

  // Update active tab when upload type changes
  useEffect(() => {
    setActiveTab(getInitialTab());
  }, [uploadType]);

  // Calculate what needs to be created
  useEffect(() => {
    const categories = calculateRequiredCategories();
    setCategoriesToCreate(categories);
    
    // Update step statuses based on current state
    updateStepStatuses(categories);
  }, [images, soccerMatchData, selectedPlayers, musicEventData, uploadType]);

  const calculateRequiredCategories = (): CategoryCreationInfo[] => {
    if (uploadType === 'soccer' && soccerMatchData && soccerMatchData.homeTeam && soccerMatchData.awayTeam) {
      return getCategoriesToCreate(soccerMatchData, selectedPlayers);
    }
    
    if (uploadType === 'music' && musicEventData) {
      return getMusicCategoriesToCreate(musicEventData);
    }
    
    return [];
  };

  const updateStepStatuses = (categories: CategoryCreationInfo[]) => {
    const newStatuses = { ...stepStatuses };
    
    // Event Type step - for music only
    if (uploadType === 'music') {
      if (musicEventData?.eventType) {
        newStatuses['event-type'] = 'completed';
      } else {
        newStatuses['event-type'] = 'ready';
      }
    }
    
    // Event Details step - for soccer and music
    if (uploadType === 'soccer') {
      if (soccerMatchData?.homeTeam && soccerMatchData?.awayTeam) {
        newStatuses['event-details'] = 'completed';
      } else {
        newStatuses['event-details'] = 'ready';
      }
    } else if (uploadType === 'music') {
      if (musicEventData?.eventType) {
        if ((musicEventData.eventType === 'festival' && musicEventData.festivalData?.festival.name) ||
            (musicEventData.eventType === 'concert' && musicEventData.concertData?.concert.venue)) {
          newStatuses['event-details'] = 'completed';
        } else {
          newStatuses['event-details'] = 'ready';
        }
      } else {
        newStatuses['event-details'] = 'pending'; // Need event type first
      }
    }
    
    // Images step - always available
    newStatuses.images = images.length > 0 ? 'completed' : 'ready';
    
    // Categories step - available after we have images and event details (if needed)
    if (uploadType === 'soccer' || uploadType === 'music') {
      if (categories.length === 0) {
        newStatuses.categories = 'completed'; // No categories needed
      } else if (images.length > 0) {
        newStatuses.categories = 'ready'; // Can create categories based on uploaded images
      } else {
        newStatuses.categories = 'pending'; // Need images first to know what categories to create
      }
    }
    
    // Upload step - ready when images are present
    if (images.length > 0) {
      // Check if all required setup is complete
      const eventDetailsComplete = uploadType === 'general' || 
        (uploadType === 'soccer' && newStatuses['event-details'] === 'completed') ||
        (uploadType === 'music' && newStatuses['event-details'] === 'completed');
      
      const categoriesComplete = uploadType === 'general' || newStatuses.categories === 'completed';
      
      if (eventDetailsComplete && categoriesComplete) {
        newStatuses.upload = 'ready';
      } else {
        newStatuses.upload = 'pending'; // Images uploaded but setup incomplete
      }
    } else {
      newStatuses.upload = 'pending';
    }
    
    setStepStatuses(newStatuses);
  };

  const updateStepStatus = (step: WorkflowStep, status: StepStatus) => {
    setStepStatuses(prev => {
      const newStatuses = { ...prev, [step]: status };
      
      // Update dependent steps
      if (step === 'event-type' && status === 'completed') {
        newStatuses['event-details'] = uploadType === 'general' ? 'completed' : 'ready';
      }
      if (step === 'event-details' && status === 'completed') {
        newStatuses.categories = categoriesToCreate.length > 0 ? 'ready' : 'completed';
      }
      if (step === 'categories' && status === 'completed') {
        newStatuses.images = 'ready';
      }
      if (step === 'images' && status === 'completed') {
        newStatuses.wikidata = 'ready';
      }
      if (step === 'wikidata' && status === 'completed') {
        newStatuses.commons = 'ready';
      }
      if (step === 'commons' && status === 'completed') {
        newStatuses.wikipedia = 'ready';
      }
      if (step === 'wikipedia' && status === 'completed') {
        newStatuses.upload = 'ready';
      }
      
      return newStatuses;
    });
  };

  const handleCreateCategories = async (categories: CategoryCreationInfo[]) => {
    updateStepStatus('categories', 'in-progress');
    try {
      // Categories creation logic would go here
      console.log('Creating categories:', categories);
      updateStepStatus('categories', 'completed');
    } catch (error) {
      updateStepStatus('categories', 'error');
    }
  };

  const getStatusIcon = (status: StepStatus) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'in-progress':
        return <Clock className="w-5 h-5 text-blue-500 animate-pulse" />;
      case 'ready':
        return <Play className="w-5 h-5 text-primary" />;
      case 'error':
        return <AlertCircle className="w-5 h-5 text-destructive" />;
      default:
        return <Clock className="w-5 h-5 text-muted-foreground" />;
    }
  };

  const getStatusColor = (status: StepStatus) => {
    switch (status) {
      case 'completed':
        return 'border-green-500 bg-green-50 dark:bg-green-950';
      case 'in-progress':
        return 'border-blue-500 bg-blue-50 dark:bg-blue-950';
      case 'ready':
        return 'border-primary bg-primary/5';
      case 'error':
        return 'border-destructive bg-destructive/5';
      default:
        return 'border-border bg-muted/30';
    }
  };

  const getWorkflowSteps = (): WorkflowStepInfo[] => {
    const baseSteps: WorkflowStepInfo[] = [];
    
    // Add event type for music only (general and soccer are auto-selected)
    if (uploadType === 'music') {
      const eventTypeDescription = musicEventData?.eventType 
        ? `Selected: ${musicEventData.eventType}` 
        : 'Choose festival or concert';
        
      baseSteps.push({
        id: 'event-type',
        title: 'Event Type',
        description: eventTypeDescription,
        icon: Settings,
        status: stepStatuses['event-type'],
        itemCount: 1
      });
    }
    
    // Add event details for soccer and music only
    if (uploadType === 'soccer' || uploadType === 'music') {
      baseSteps.push({
        id: 'event-details',
        title: 'Event Details',
        description: `Configure ${uploadType} event`,
        icon: Calendar,
        status: stepStatuses['event-details'],
        itemCount: 1,
        dependencies: uploadType === 'music' ? ['event-type'] : []
      });
    }
    
    // Always add images (no dependencies - can be done anytime)
    baseSteps.push({
      id: 'images',
      title: 'Images',
      description: 'Upload and edit image metadata',
      icon: ImagePlus,
      status: stepStatuses.images,
      itemCount: images.length,
      dependencies: []
    });
    
    // Add categories if needed (no dependencies - can be done after images)
    if (uploadType === 'soccer' || uploadType === 'music') {
      baseSteps.push({
        id: 'categories',
        title: 'Categories',
        description: 'Create required Wikimedia Commons categories',
        icon: FolderPlus,
        status: stepStatuses.categories,
        itemCount: categoriesToCreate.length,
        items: categoriesToCreate.map(cat => cat.name),
        dependencies: []
      });
    }
    
    // Add Commons upload (only needs images to be present)
    baseSteps.push({
      id: 'upload',
      title: 'Commons Upload',
      description: 'Final upload to Wikimedia Commons',
      icon: Upload,
      status: stepStatuses.upload,
      itemCount: images.length,
      dependencies: ['images']
    });
    
    return baseSteps;
  };
  
  const workflowSteps = getWorkflowSteps();

  const getTabIcon = (step: WorkflowStep) => {
    const status = stepStatuses[step];
    if (status === 'completed') return <CheckCircle className="w-4 h-4" />;
    if (status === 'in-progress') return <Clock className="w-4 h-4 animate-pulse" />;
    if (status === 'error') return <AlertCircle className="w-4 h-4" />;
    return null;
  };

  const getTabColor = (step: WorkflowStep) => {
    const status = stepStatuses[step];
    const isActive = activeTab === step;
    const isDisabled = workflowSteps.find(s => s.id === step)?.dependencies?.some(dep => stepStatuses[dep] !== 'completed');
    
    if (isDisabled) return 'text-muted-foreground/50 cursor-not-allowed';
    if (isActive) return 'text-primary border-primary';
    if (status === 'completed') return 'text-green-600 hover:text-green-700';
    if (status === 'ready') return 'text-primary/80 hover:text-primary';
    return 'text-muted-foreground hover:text-foreground';
  };

  const isTabDisabled = (step: WorkflowStep) => {
    return workflowSteps.find(s => s.id === step)?.dependencies?.some(dep => stepStatuses[dep] !== 'completed') || false;
  };

  const renderTabContent = () => {
    const currentStep = workflowSteps.find(step => step.id === activeTab);
    if (!currentStep) return null;

    const Icon = currentStep.icon;
    const status = stepStatuses[activeTab];
    const isDisabled = isTabDisabled(activeTab);

    return (
      <div className="p-4 md:p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 space-y-3 md:space-y-0">
          <div className="flex items-center space-x-3">
            <Icon className="w-6 h-6 text-primary flex-shrink-0" />
            <div>
              <h3 className="text-lg md:text-xl font-semibold text-card-foreground">{currentStep.title}</h3>
              <p className="text-sm md:text-base text-muted-foreground">{currentStep.description}</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {getStatusIcon(status)}
            <span className="text-sm font-medium text-card-foreground capitalize">{status}</span>
          </div>
        </div>

        {/* Step Content */}
        {activeTab === 'event-type' && (
          <div className="space-y-4">
            {uploadType === 'general' ? (
              <div className="text-center py-8 bg-muted/30 rounded-lg">
                <Settings className="w-12 h-12 text-primary mx-auto mb-3" />
                <h4 className="text-lg font-medium text-card-foreground mb-2">General Upload</h4>
                <p className="text-muted-foreground mb-4">
                  No specific event type configuration needed.
                </p>
                <button
                  onClick={() => {
                    updateStepStatus('event-type', 'completed');
                    setActiveTab('event-details');
                  }}
                  className="px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                >
                  Continue to Event Details
                </button>
              </div>
            ) : uploadType === 'soccer' ? (
              <div className="text-center py-8 bg-muted/30 rounded-lg">
                <Settings className="w-12 h-12 text-primary mx-auto mb-3" />
                <h4 className="text-lg font-medium text-card-foreground mb-2">Soccer Upload</h4>
                <p className="text-muted-foreground mb-4">
                  Upload images from a soccer match or event.
                </p>
                <button
                  onClick={() => {
                    updateStepStatus('event-type', 'completed');
                    setActiveTab('event-details');
                  }}
                  className="px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                >
                  Continue to Match Details
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="text-center">
                  <Music className="w-12 h-12 text-primary mx-auto mb-3" />
                  <h4 className="text-lg font-medium text-card-foreground mb-2">Music Event Type</h4>
                  <p className="text-muted-foreground">Choose the type of music event for your upload.</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <button
                    onClick={() => onMusicEventUpdate({ eventType: 'festival', festivalData: { festival: { id: '', name: '', year: '', location: '', country: '' }, selectedBands: [], addToWikiPortraitsConcerts: false, authorUsername: '', authorFullName: '' } })}
                    className={`p-6 border-2 rounded-lg text-left transition-colors ${
                      musicEventData?.eventType === 'festival'
                        ? 'border-primary bg-primary/10'
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <div className="flex items-center mb-3">
                      <Music className="w-8 h-8 text-primary mr-3" />
                      <h5 className="text-lg font-medium text-card-foreground">Festival</h5>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Multi-band event with festival category and band subcategories
                    </p>
                  </button>
                  
                  <button
                    onClick={() => onMusicEventUpdate({ eventType: 'concert', concertData: { concert: { id: '', artist: { name: '', id: '' }, date: '', venue: '', location: '', country: '' }, addToWikiPortraitsConcerts: false, authorUsername: '', authorFullName: '' } })}
                    className={`p-6 border-2 rounded-lg text-left transition-colors ${
                      musicEventData?.eventType === 'concert'
                        ? 'border-primary bg-primary/10'
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <div className="flex items-center mb-3">
                      <Music className="w-8 h-8 text-primary mr-3" />
                      <h5 className="text-lg font-medium text-card-foreground">Concert</h5>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Single artist/band performance with direct categorization
                    </p>
                  </button>
                </div>

                {musicEventData?.eventType && (
                  <div className="text-center">
                    <button
                      onClick={() => {
                        updateStepStatus('event-type', 'completed');
                        setActiveTab('event-details');
                      }}
                      className="px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                    >
                      Continue to Event Details
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {activeTab === 'event-details' && (
          <div className="space-y-4">
            {uploadType === 'general' ? (
              <div className="text-center py-8 bg-muted/30 rounded-lg">
                <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
                <h4 className="text-lg font-medium text-card-foreground mb-2">No Event Setup Required</h4>
                <p className="text-muted-foreground mb-4">General uploads don't need event configuration.</p>
                <button
                  onClick={() => {
                    updateStepStatus('event-details', 'completed');
                    setActiveTab('categories');
                  }}
                  className="px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                >
                  Continue to Categories
                </button>
              </div>
            ) : uploadType === 'soccer' ? (
              <div className="space-y-6">
                <h4 className="text-lg font-medium text-card-foreground">Soccer Match Configuration</h4>
                
                <SoccerMatchWorkflow 
                  onSoccerDataUpdate={onSoccerDataUpdate}
                />
                
                {soccerMatchData?.homeTeam && soccerMatchData?.awayTeam && (
                  <div className="text-center">
                    <button
                      onClick={() => {
                        updateStepStatus('event-details', 'completed');
                        setActiveTab('categories');
                      }}
                      className="px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                    >
                      Match Details Complete - Continue to Categories
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-6">
                <h4 className="text-lg font-medium text-card-foreground">
                  {musicEventData?.eventType === 'festival' ? 'Festival' : 'Concert'} Configuration
                </h4>
                
                {!musicEventData?.eventType ? (
                  <div className="bg-muted/30 rounded-lg p-4">
                    <p className="text-muted-foreground">Please select an event type in the previous tab first.</p>
                  </div>
                ) : musicEventData.eventType === 'festival' ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-card-foreground mb-1">Festival Name</label>
                        <input
                          type="text"
                          value={musicEventData.festivalData?.festival.name || ''}
                          onChange={(e) => onMusicEventUpdate({
                            ...musicEventData,
                            festivalData: {
                              ...musicEventData.festivalData!,
                              festival: { ...musicEventData.festivalData!.festival, name: e.target.value }
                            }
                          })}
                          placeholder="e.g., Coachella"
                          className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary text-card-foreground bg-card"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-card-foreground mb-1">Year</label>
                        <input
                          type="text"
                          value={musicEventData.festivalData?.festival.year || ''}
                          onChange={(e) => onMusicEventUpdate({
                            ...musicEventData,
                            festivalData: {
                              ...musicEventData.festivalData!,
                              festival: { ...musicEventData.festivalData!.festival, year: e.target.value }
                            }
                          })}
                          placeholder="2025"
                          className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary text-card-foreground bg-card"
                        />
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-card-foreground mb-1">Location</label>
                      <input
                        type="text"
                        value={musicEventData.festivalData?.festival.location || ''}
                        onChange={(e) => onMusicEventUpdate({
                          ...musicEventData,
                          festivalData: {
                            ...musicEventData.festivalData!,
                            festival: { ...musicEventData.festivalData!.festival, location: e.target.value }
                          }
                        })}
                        placeholder="City, State/Province"
                        className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary text-card-foreground bg-card"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-card-foreground mb-1">Country</label>
                      <CountrySelector
                        value={musicEventData.festivalData?.festival.country || ''}
                        onChange={(country) => onMusicEventUpdate({
                          ...musicEventData,
                          festivalData: {
                            ...musicEventData.festivalData!,
                            festival: { ...musicEventData.festivalData!.festival, country }
                          }
                        })}
                        placeholder="Select country"
                      />
                    </div>

                    {/* Artist Selection for Festival */}
                    <div>
                      <label className="block text-sm font-medium text-card-foreground mb-2">
                        Band/Artist for this upload session *
                      </label>
                      <ArtistSelector
                        onArtistSelect={(artist) => {
                          const newBand = {
                            id: `band-${Date.now()}`,
                            name: artist.name,
                            wikipediaUrl: artist.wikipediaUrl || ''
                          };
                          onMusicEventUpdate({
                            ...musicEventData,
                            festivalData: {
                              ...musicEventData.festivalData!,
                              selectedBands: [newBand] // Only one band at a time
                            }
                          });
                        }}
                        selectedArtist={musicEventData.festivalData?.selectedBands?.[0] || { id: '', name: '' }}
                        placeholder="Search for band/artist..."
                        label=""
                        type="band"
                        defaultLanguage={musicEventData.festivalData?.festival.country ? 'auto' : 'en'}
                        currentLanguage={musicEventData.festivalData?.festival.country ? 'auto' : 'en'}
                      />
                      {musicEventData.festivalData?.selectedBands?.[0] && (
                        <p className="text-sm text-muted-foreground mt-1">
                          Selected: <strong>{musicEventData.festivalData.selectedBands[0].name}</strong>
                        </p>
                      )}
                    </div>

                    {/* Author fields for Festival */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-card-foreground mb-1">
                          Username (optional)
                        </label>
                        <input
                          type="text"
                          value={musicEventData.festivalData?.authorUsername || ''}
                          onChange={(e) => onMusicEventUpdate({
                            ...musicEventData,
                            festivalData: {
                              ...musicEventData.festivalData!,
                              authorUsername: e.target.value
                            }
                          })}
                          placeholder="YourUsername"
                          className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary text-card-foreground bg-card"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-card-foreground mb-1">
                          Full Name (optional)
                        </label>
                        <input
                          type="text"
                          value={musicEventData.festivalData?.authorFullName || ''}
                          onChange={(e) => onMusicEventUpdate({
                            ...musicEventData,
                            festivalData: {
                              ...musicEventData.festivalData!,
                              authorFullName: e.target.value
                            }
                          })}
                          placeholder="Your Full Name"
                          className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary text-card-foreground bg-card"
                        />
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Will be formatted as [[User:Username|Full Name]] in Commons
                    </p>

                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="wikiPortraitsFestival"
                        checked={musicEventData.festivalData?.addToWikiPortraitsConcerts || false}
                        onChange={(e) => onMusicEventUpdate({
                          ...musicEventData,
                          festivalData: {
                            ...musicEventData.festivalData!,
                            addToWikiPortraitsConcerts: e.target.checked
                          }
                        })}
                        className="rounded border-border text-primary focus:ring-primary"
                      />
                      <label htmlFor="wikiPortraitsFestival" className="text-sm text-muted-foreground">
                        Add to "Category:WikiPortraits at Concerts" as subcategory
                      </label>
                    </div>

                    {musicEventData.festivalData?.festival.name && musicEventData.festivalData.festival.year && musicEventData.festivalData.selectedBands?.length > 0 && (
                      <div className="text-center">
                        <button
                          onClick={() => {
                            updateStepStatus('event-details', 'completed');
                            setActiveTab('categories');
                          }}
                          className="px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                        >
                          Festival Details Complete - Continue to Categories
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-card-foreground mb-1">Artist/Band Name</label>
                        <input
                          type="text"
                          value={musicEventData.concertData?.concert.artist.name || ''}
                          onChange={(e) => onMusicEventUpdate({
                            ...musicEventData,
                            concertData: {
                              ...musicEventData.concertData!,
                              concert: { ...musicEventData.concertData!.concert, artist: { ...musicEventData.concertData!.concert.artist, name: e.target.value } }
                            }
                          })}
                          placeholder="e.g., Taylor Swift"
                          className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary text-card-foreground bg-card"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-card-foreground mb-1">Date</label>
                        <input
                          type="date"
                          value={musicEventData.concertData?.concert.date || ''}
                          onChange={(e) => onMusicEventUpdate({
                            ...musicEventData,
                            concertData: {
                              ...musicEventData.concertData!,
                              concert: { ...musicEventData.concertData!.concert, date: e.target.value }
                            }
                          })}
                          className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary text-card-foreground bg-card"
                        />
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-card-foreground mb-1">Venue</label>
                        <input
                          type="text"
                          value={musicEventData.concertData?.concert.venue || ''}
                          onChange={(e) => onMusicEventUpdate({
                            ...musicEventData,
                            concertData: {
                              ...musicEventData.concertData!,
                              concert: { ...musicEventData.concertData!.concert, venue: e.target.value }
                            }
                          })}
                          placeholder="e.g., Madison Square Garden"
                          className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary text-card-foreground bg-card"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-card-foreground mb-1">Country</label>
                        <CountrySelector
                          value={musicEventData.concertData?.concert.country || ''}
                          onChange={(country) => onMusicEventUpdate({
                            ...musicEventData,
                            concertData: {
                              ...musicEventData.concertData!,
                              concert: { ...musicEventData.concertData!.concert, country }
                            }
                          })}
                          placeholder="Select country"
                        />
                      </div>
                    </div>

                    {/* Artist Selection for Concert */}
                    <div>
                      <label className="block text-sm font-medium text-card-foreground mb-2">
                        Artist/Band *
                      </label>
                      <ArtistSelector
                        onArtistSelect={(artist) => {
                          onMusicEventUpdate({
                            ...musicEventData,
                            concertData: {
                              ...musicEventData.concertData!,
                              concert: { 
                                ...musicEventData.concertData!.concert, 
                                artist: { id: artist.id || '', name: artist.name, wikipediaUrl: artist.wikipediaUrl }
                              }
                            }
                          });
                        }}
                        selectedArtist={musicEventData.concertData?.concert.artist || { id: '', name: '' }}
                        placeholder="Search for artist or band..."
                        label=""
                        type="artist"
                        defaultLanguage={musicEventData.concertData?.concert.country ? 'auto' : 'en'}
                        currentLanguage={musicEventData.concertData?.concert.country ? 'auto' : 'en'}
                      />
                    </div>

                    {/* Author fields for Concert */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-card-foreground mb-1">
                          Username (optional)
                        </label>
                        <input
                          type="text"
                          value={musicEventData.concertData?.authorUsername || ''}
                          onChange={(e) => onMusicEventUpdate({
                            ...musicEventData,
                            concertData: {
                              ...musicEventData.concertData!,
                              authorUsername: e.target.value
                            }
                          })}
                          placeholder="YourUsername"
                          className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary text-card-foreground bg-card"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-card-foreground mb-1">
                          Full Name (optional)
                        </label>
                        <input
                          type="text"
                          value={musicEventData.concertData?.authorFullName || ''}
                          onChange={(e) => onMusicEventUpdate({
                            ...musicEventData,
                            concertData: {
                              ...musicEventData.concertData!,
                              authorFullName: e.target.value
                            }
                          })}
                          placeholder="Your Full Name"
                          className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary text-card-foreground bg-card"
                        />
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Will be formatted as [[User:Username|Full Name]] in Commons
                    </p>

                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="wikiPortraitsConcert"
                        checked={musicEventData.concertData?.addToWikiPortraitsConcerts || false}
                        onChange={(e) => onMusicEventUpdate({
                          ...musicEventData,
                          concertData: {
                            ...musicEventData.concertData!,
                            addToWikiPortraitsConcerts: e.target.checked
                          }
                        })}
                        className="rounded border-border text-primary focus:ring-primary"
                      />
                      <label htmlFor="wikiPortraitsConcert" className="text-sm text-muted-foreground">
                        Add to "Category:WikiPortraits at Concerts" as subcategory
                      </label>
                    </div>

                    {musicEventData.concertData?.concert.artist.name && musicEventData.concertData.concert.venue && (
                      <div className="text-center">
                        <button
                          onClick={() => {
                            updateStepStatus('event-details', 'completed');
                            setActiveTab('categories');
                          }}
                          className="px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                        >
                          Concert Details Complete - Continue to Categories
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {activeTab === 'images' && (
          <div className="space-y-6">
            <ImageUploader 
              onImagesAdded={onImagesAdded} 
              existingImages={images}
              uploadType={uploadType}
              soccerMatchData={soccerMatchData}
              selectedPlayers={selectedPlayers}
              musicEventData={musicEventData}
              onSoccerDataUpdate={onSoccerDataUpdate}
              onMusicEventUpdate={onMusicEventUpdate}
            />
            
            {images.length > 0 && (
              <>
                <UploadQueue 
                  images={images}
                  onExportMetadata={onExportMetadata}
                  onBulkEdit={onBulkEdit}
                  onScrollToImage={onScrollToImage}
                />
                
                <ImageGrid 
                  images={images}
                  onImageUpdate={onImageUpdate}
                  onImageRemove={onImageRemove}
                  onImageClick={onImageClick}
                  musicEventData={musicEventData}
                />
                
                {status === 'ready' && (
                  <div className="text-center pt-4">
                    <button
                      onClick={() => {
                        updateStepStatus('images', 'completed');
                        setActiveTab('wikidata');
                      }}
                      className="px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                    >
                      Images Complete - Continue to Wikidata
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {activeTab === 'commons' && (
          <div className="space-y-4">
            <div className="bg-muted/30 rounded-lg p-4">
              <h4 className="font-medium text-card-foreground mb-2">WikiCommons Tasks</h4>
              <ul className="space-y-2 text-muted-foreground">
                <li>• Prepare Commons upload templates</li>
                <li>• Generate category links for {images.length} images</li>
                <li>• Validate file names and descriptions</li>
                <li>• Create upload batches</li>
              </ul>
            </div>
            {status === 'ready' && (
              <button
                onClick={() => updateStepStatus('commons', 'completed')}
                className="w-full px-4 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
              >
                Prepare Commons Upload
              </button>
            )}
          </div>
        )}

        {activeTab === 'categories' && (
          <div className="space-y-4">
            {categoriesToCreate.length === 0 ? (
              <div className="text-center py-8 bg-muted/30 rounded-lg">
                <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
                <h4 className="text-lg font-medium text-card-foreground mb-2">Categories Ready</h4>
                <p className="text-muted-foreground">All required categories exist or no special categories needed.</p>
              </div>
            ) : (
              <>
                <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
                  <h4 className="font-medium text-card-foreground mb-2">Categories to Create ({categoriesToCreate.length})</h4>
                  <div className="space-y-2">
                    {categoriesToCreate.map((cat, i) => (
                      <div key={i} className="flex items-center justify-between p-2 bg-background rounded border">
                        <span className="font-mono text-sm">{cat.name}</span>
                        <span className="text-xs text-muted-foreground">{cat.description}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <button
                  onClick={() => setShowCategoryModal(true)}
                  className="w-full px-4 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                >
                  Create Categories
                </button>
              </>
            )}
          </div>
        )}

        {activeTab === 'wikidata' && (
          <div className="space-y-4">
            <div className="bg-muted/30 rounded-lg p-4">
              <h4 className="font-medium text-card-foreground mb-2">Wikidata Tasks</h4>
              <ul className="space-y-2 text-muted-foreground">
                <li>• Create person entries for new subjects ({images.length} images)</li>
                <li>• Add occupation and other relevant claims</li>
                <li>• Link to Commons categories</li>
              </ul>
            </div>
            {status === 'ready' && (
              <button
                onClick={() => updateStepStatus('wikidata', 'in-progress')}
                disabled={isDisabled}
                className="w-full px-4 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Start Wikidata Updates
              </button>
            )}
          </div>
        )}

        {activeTab === 'wikipedia' && (
          <div className="space-y-4">
            <div className="bg-muted/30 rounded-lg p-4">
              <h4 className="font-medium text-card-foreground mb-2">Wikipedia Tasks</h4>
              <ul className="space-y-2 text-muted-foreground">
                <li>• Update person infoboxes with new images</li>
                <li>• Add event/location information</li>
                <li>• Update relevant articles</li>
              </ul>
            </div>
            {status === 'ready' && (
              <button
                onClick={() => updateStepStatus('wikipedia', 'in-progress')}
                disabled={isDisabled}
                className="w-full px-4 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Start Wikipedia Updates
              </button>
            )}
          </div>
        )}

        {activeTab === 'upload' && (
          <div className="space-y-4">
            <div className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg p-4">
              <h4 className="font-medium text-card-foreground mb-2">Ready to Upload</h4>
              <p className="text-muted-foreground mb-3">
                All prerequisites completed. {images.length} images ready for Commons upload.
              </p>
              <ul className="space-y-1 text-sm text-muted-foreground">
                <li>✓ Categories created</li>
                <li>✓ Wikidata entries updated</li>
                <li>✓ Wikipedia articles updated</li>
              </ul>
            </div>
            {status === 'ready' && (
              <button
                onClick={() => updateStepStatus('upload', 'in-progress')}
                disabled={isDisabled}
                className="w-full px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Upload to Commons
              </button>
            )}
          </div>
        )}

        {/* Navigation - Enhanced for mobile */}
        <div className="mt-8 pt-6 border-t border-border">
          {/* Mobile: Prominent back/next buttons */}
          <div className="lg:hidden flex justify-between space-x-4">
            <button
              onClick={() => {
                const currentIndex = workflowSteps.findIndex(s => s.id === activeTab);
                if (currentIndex > 0) {
                  setActiveTab(workflowSteps[currentIndex - 1].id);
                }
              }}
              disabled={workflowSteps.findIndex(s => s.id === activeTab) === 0}
              className="flex-1 flex items-center justify-center px-6 py-3 bg-muted hover:bg-muted/80 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg font-medium transition-colors"
            >
              <ChevronRight className="w-5 h-5 mr-2 rotate-180" />
              Previous
            </button>
            <button
              onClick={() => {
                const currentIndex = workflowSteps.findIndex(s => s.id === activeTab);
                if (currentIndex < workflowSteps.length - 1) {
                  setActiveTab(workflowSteps[currentIndex + 1].id);
                }
              }}
              disabled={workflowSteps.findIndex(s => s.id === activeTab) === workflowSteps.length - 1}
              className="flex-1 flex items-center justify-center px-6 py-3 bg-primary hover:bg-primary/90 text-primary-foreground disabled:opacity-50 disabled:cursor-not-allowed rounded-lg font-medium transition-colors"
            >
              Next
              <ChevronRight className="w-5 h-5 ml-2" />
            </button>
          </div>
          
          {/* Desktop: Subtle navigation */}
          <div className="hidden lg:flex justify-between">
            <button
              onClick={() => {
                const currentIndex = workflowSteps.findIndex(s => s.id === activeTab);
                if (currentIndex > 0) {
                  setActiveTab(workflowSteps[currentIndex - 1].id);
                }
              }}
              disabled={workflowSteps.findIndex(s => s.id === activeTab) === 0}
              className="flex items-center px-4 py-2 text-muted-foreground hover:text-foreground disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="w-4 h-4 mr-1 rotate-180" />
              Previous
            </button>
            <button
              onClick={() => {
                const currentIndex = workflowSteps.findIndex(s => s.id === activeTab);
                if (currentIndex < workflowSteps.length - 1) {
                  setActiveTab(workflowSteps[currentIndex + 1].id);
                }
              }}
              disabled={workflowSteps.findIndex(s => s.id === activeTab) === workflowSteps.length - 1}
              className="flex items-center px-4 py-2 text-muted-foreground hover:text-foreground disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Next
              <ChevronRight className="w-4 h-4 ml-1" />
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Always show the workflow once an upload type is selected

  return (
    <div className="bg-card rounded-lg shadow-sm border border-border">
      {/* Mobile Header with Progress */}
      <div className="lg:hidden p-4 border-b border-border">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xl font-semibold text-card-foreground">
            Workflow
          </h2>
          <div className="text-sm text-muted-foreground">
            {workflowSteps.filter(step => stepStatuses[step.id] === 'completed').length} / {workflowSteps.length} steps
          </div>
        </div>
        
        {/* Progress Bar */}
        <div className="mb-3">
          <div className="w-full bg-muted rounded-full h-2">
            <div
              className="bg-primary h-2 rounded-full transition-all duration-500"
              style={{
                width: `${(workflowSteps.filter(step => stepStatuses[step.id] === 'completed').length / workflowSteps.length) * 100}%`
              }}
            />
          </div>
        </div>
        
        {/* Current Step Indicator */}
        <div className="flex items-center space-x-2">
          {(() => {
            const currentStep = workflowSteps.find(step => step.id === activeTab);
            const Icon = currentStep?.icon || Settings;
            return (
              <>
                <Icon className="w-5 h-5 text-primary" />
                <span className="font-medium text-card-foreground">{currentStep?.title}</span>
                {getTabIcon(activeTab)}
              </>
            );
          })()}
        </div>
      </div>

      <div className="lg:flex lg:h-[calc(100vh-12rem)]">
        {/* Desktop Sidebar */}
        <div className="hidden lg:flex lg:flex-col w-80 border-r border-border">
          <div className="flex-shrink-0 p-6 border-b border-border">
            <h2 className="text-2xl font-semibold text-card-foreground mb-4">
              Wikimedia Workflow
            </h2>
            <div className="text-sm text-muted-foreground mb-4">
              {workflowSteps.filter(step => stepStatuses[step.id] === 'completed').length} / {workflowSteps.length} steps completed
            </div>
            
            {/* Progress Bar */}
            <div className="w-full bg-muted rounded-full h-2">
              <div
                className="bg-primary h-2 rounded-full transition-all duration-500"
                style={{
                  width: `${(workflowSteps.filter(step => stepStatuses[step.id] === 'completed').length / workflowSteps.length) * 100}%`
                }}
              />
            </div>
          </div>
          
          {/* Sidebar Navigation */}
          <nav className="flex-1 overflow-y-auto p-4 space-y-2">
            {workflowSteps.map((step, index) => {
              const Icon = step.icon;
              const isActive = activeTab === step.id;
              const isDisabled = isTabDisabled(step.id);
              const status = stepStatuses[step.id];
              
              return (
                <button
                  key={step.id}
                  onClick={() => !isDisabled && setActiveTab(step.id)}
                  disabled={isDisabled}
                  className={`
                    w-full flex items-center space-x-3 p-3 rounded-lg text-left transition-colors
                    ${isActive 
                      ? 'bg-primary/10 border border-primary/20' 
                      : 'hover:bg-muted/50'
                    }
                    ${isDisabled 
                      ? 'opacity-50 cursor-not-allowed' 
                      : 'cursor-pointer'
                    }
                  `}
                >
                  <div className="flex-shrink-0">
                    {status === 'completed' ? (
                      <CheckCircle className="w-5 h-5 text-green-500" />
                    ) : status === 'in-progress' ? (
                      <Clock className="w-5 h-5 text-blue-500 animate-pulse" />
                    ) : status === 'ready' ? (
                      <Icon className="w-5 h-5 text-primary" />
                    ) : (
                      <Icon className="w-5 h-5 text-muted-foreground" />
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className={`font-medium truncate ${
                        isActive ? 'text-primary' : 
                        status === 'completed' ? 'text-green-600' :
                        status === 'ready' ? 'text-foreground' :
                        'text-muted-foreground'
                      }`}>
                        {step.title}
                      </span>
                      {step.itemCount !== undefined && step.itemCount > 0 && (
                        <span className="bg-muted text-muted-foreground text-xs px-2 py-1 rounded-full ml-2">
                          {step.itemCount}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground truncate mt-1">
                      {step.description}
                    </p>
                  </div>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Main Content */}
        <div className="flex-1 lg:flex lg:flex-col lg:min-h-0">
          {/* Mobile Tabs - Only visible on mobile */}
          <div className="lg:hidden border-b border-border">
            <nav className="flex overflow-x-auto px-4 scrollbar-hide">
              {workflowSteps.map((step, index) => {
                const Icon = step.icon;
                return (
                  <button
                    key={step.id}
                    onClick={() => !isTabDisabled(step.id) && setActiveTab(step.id)}
                    disabled={isTabDisabled(step.id)}
                    className={`flex items-center space-x-1 py-4 px-3 border-b-2 border-transparent transition-colors whitespace-nowrap ${getTabColor(step.id)}`}
                  >
                    <Icon className="w-4 h-4 flex-shrink-0" />
                    <span className="font-medium text-sm">{step.title}</span>
                    {getTabIcon(step.id)}
                    {step.itemCount !== undefined && step.itemCount > 0 && (
                      <span className="bg-muted text-muted-foreground text-xs px-2 py-1 rounded-full flex-shrink-0">
                        {step.itemCount}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Tab Content - Scrollable */}
          <div className="flex-1 overflow-y-auto">
            {renderTabContent()}
          </div>
        </div>
      </div>

      <CategoryCreationModal
        isOpen={showCategoryModal}
        onClose={() => setShowCategoryModal(false)}
        categories={categoriesToCreate}
        onCreateCategories={handleCreateCategories}
      />
    </div>
  );
}