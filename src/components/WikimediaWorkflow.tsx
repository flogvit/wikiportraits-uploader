'use client';

import { useState, useEffect } from 'react';
import { CheckCircle, Clock, AlertCircle, Play, ChevronRight, Settings, Calendar, ImagePlus, FolderPlus, Database, Globe, Upload, FileText } from 'lucide-react';
import { ImageFile } from '@/app/page';
import { SoccerMatchMetadata, SoccerPlayer } from '@/components/SoccerMatchWorkflow';
import { MusicEventMetadata } from '@/types/music';
import { getItem, KEYS } from '@/utils/localStorage';
import { UploadType } from '@/components/UploadTypeSelector';
import EventTypePane from './workflow/EventTypePane';
import EventDetailsPane from './workflow/EventDetailsPane';
import CategoriesPane from './workflow/CategoriesPane';
import ImagesPane from './workflow/ImagesPane';
import TemplatesPane from './workflow/TemplatesPane';
import UploadPane from './workflow/UploadPane';

interface WikimediaWorkflowProps {
  images: ImageFile[];
  soccerMatchData?: SoccerMatchMetadata | null;
  selectedPlayers?: SoccerPlayer[];
  musicEventData?: MusicEventMetadata | null;
  uploadType: UploadType;
  onImagesAdded: (images: ImageFile[]) => void;
  onImageUpdate: (imageId: string, updates: Partial<ImageFile>) => void;
  onImageRemove: (imageId: string) => void;
  onSoccerDataUpdate?: (matchData: SoccerMatchMetadata, players: SoccerPlayer[]) => void;
  onMusicEventUpdate?: (eventData: MusicEventMetadata) => void;
  onExportMetadata: () => void;
  onBulkEdit: () => void;
  onScrollToImage: (imageId: string) => void;
  onImageClick: (image: ImageFile) => void;
}

type WorkflowStep = 'event-type' | 'event-details' | 'categories' | 'images' | 'templates' | 'wikidata' | 'commons' | 'wikipedia' | 'upload';
type StepStatus = 'pending' | 'ready' | 'in-progress' | 'completed' | 'error';

interface WorkflowStepInfo {
  id: WorkflowStep;
  title: string;
  description: string;
  icon: any;
  status: StepStatus;
  itemCount?: number;
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
    return 'images';
  };

  const [activeTab, setActiveTab] = useState<WorkflowStep>(getInitialTab());
  const [stepStatuses, setStepStatuses] = useState<Record<WorkflowStep, StepStatus>>({
    'event-type': 'ready',
    'event-details': 'pending',
    categories: 'pending',
    images: 'pending',
    templates: 'pending',
    wikidata: 'pending',
    commons: 'pending',
    wikipedia: 'pending',
    upload: 'pending'
  });

  // Update active tab when upload type changes
  useEffect(() => {
    setActiveTab(getInitialTab());
  }, [uploadType]);

  // Load stored music event data when switching to event-details
  useEffect(() => {
    if (activeTab === 'event-details' && uploadType === 'music' && musicEventData?.eventType === 'festival' && onMusicEventUpdate) {
      const storedName = getItem(KEYS.FESTIVAL_NAME);
      const storedYear = getItem(KEYS.FESTIVAL_YEAR);
      const storedLocation = getItem(KEYS.FESTIVAL_LOCATION);
      const storedCountry = getItem(KEYS.FESTIVAL_COUNTRY);
      
      if (storedName || storedYear || storedLocation || storedCountry) {
        onMusicEventUpdate({
          ...musicEventData,
          festivalData: {
            ...musicEventData.festivalData!,
            festival: {
              ...musicEventData.festivalData!.festival,
              name: storedName || musicEventData.festivalData!.festival.name,
              year: storedYear || musicEventData.festivalData!.festival.year,
              location: storedLocation || musicEventData.festivalData!.festival.location,
              country: storedCountry || musicEventData.festivalData!.festival.country
            }
          }
        });
      }
    }
  }, [activeTab, uploadType, musicEventData?.eventType]);

  const updateStepStatus = (step: WorkflowStep, status: StepStatus) => {
    setStepStatuses(prev => ({ ...prev, [step]: status }));
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

  const getWorkflowSteps = (): WorkflowStepInfo[] => {
    const baseSteps: WorkflowStepInfo[] = [];
    
    // Add event type for music only
    if (uploadType === 'music') {
      baseSteps.push({
        id: 'event-type',
        title: 'Event Type',
        description: musicEventData?.eventType ? `Selected: ${musicEventData.eventType}` : 'Choose festival or concert',
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
    
    // Always add images
    baseSteps.push({
      id: 'images',
      title: 'Images',
      description: 'Upload and edit image metadata',
      icon: ImagePlus,
      status: stepStatuses.images,
      itemCount: images.length,
      dependencies: []
    });
    
    // Add remaining steps (simplified for now)
    baseSteps.push(
      {
        id: 'categories',
        title: 'Categories',
        description: 'Create required categories',
        icon: FolderPlus,
        status: stepStatuses.categories,
        dependencies: ['event-details']
      },
      {
        id: 'templates',
        title: 'Templates',
        description: 'Create WikiPortraits templates',
        icon: FileText,
        status: stepStatuses.templates,
        dependencies: ['categories']
      },
      {
        id: 'wikidata',
        title: 'Wikidata',
        description: 'Link to Wikidata entities',
        icon: Database,
        status: stepStatuses.wikidata,
        dependencies: ['templates']
      },
      {
        id: 'wikipedia',
        title: 'Wikipedia',
        description: 'Update Wikipedia articles',
        icon: Globe,
        status: stepStatuses.wikipedia,
        dependencies: ['wikidata']
      },
      {
        id: 'upload',
        title: 'Upload',
        description: 'Upload to Wikimedia Commons',
        icon: Upload,
        status: stepStatuses.upload,
        dependencies: ['wikipedia']
      }
    );
    
    return baseSteps;
  };

  const canAccessStep = (step: WorkflowStepInfo): boolean => {
    // Allow access to all steps, but show helpful info if prerequisites are missing
    return true;
  };

  const handleStepClick = (stepId: WorkflowStep) => {
    const steps = getWorkflowSteps();
    const step = steps.find(s => s.id === stepId);
    if (step && canAccessStep(step)) {
      setActiveTab(stepId);
    }
  };

  const handleEventTypeComplete = () => {
    updateStepStatus('event-type', 'completed');
    updateStepStatus('event-details', 'ready');
    setActiveTab('event-details');
  };

  const handleEventDetailsComplete = () => {
    updateStepStatus('event-details', 'completed');
    updateStepStatus('categories', 'ready');
    setActiveTab('categories');
  };

  const handleCategoriesComplete = () => {
    updateStepStatus('categories', 'completed');
    updateStepStatus('templates', 'ready');
    setActiveTab('templates');
  };

  const handleTemplatesComplete = () => {
    updateStepStatus('templates', 'completed');
    updateStepStatus('wikidata', 'ready');
    setActiveTab('wikidata');
  };

  const handleImagesComplete = () => {
    updateStepStatus('images', 'completed');
    updateStepStatus('categories', 'ready');
    setActiveTab('categories');
  };

  const workflowSteps = getWorkflowSteps();

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-8rem)]">
      {/* Workflow Progress - Left Panel */}
      <div className="lg:col-span-1">
        <div className="bg-card rounded-lg shadow-sm border border-border p-6 sticky top-6 h-fit">
          <h2 className="text-xl font-semibold text-card-foreground mb-4">Workflow Progress</h2>
          <div className="space-y-2">
            {workflowSteps.map((step, index) => {
              const isActive = activeTab === step.id;
              const canAccess = canAccessStep(step);
              
              return (
                <button
                  key={step.id}
                  onClick={() => handleStepClick(step.id)}
                  disabled={!canAccess}
                  className={`w-full flex items-center p-3 rounded-lg transition-all duration-200 ${
                    isActive
                      ? 'bg-primary/10 border-2 border-primary shadow-sm'
                      : canAccess
                      ? 'bg-muted hover:bg-muted/80 border border-border'
                      : 'bg-muted/50 border border-border opacity-60 cursor-not-allowed'
                  }`}
                >
                  <div className="flex items-center min-w-0 flex-1">
                    <div className="flex-shrink-0 mr-3">
                      {getStatusIcon(step.status)}
                    </div>
                    <step.icon className={`w-4 h-4 mr-2 flex-shrink-0 ${
                      isActive ? 'text-primary' : 'text-muted-foreground'
                    }`} />
                    <div className="text-left min-w-0 flex-1">
                      <div className={`font-medium text-sm ${
                        isActive ? 'text-primary' : 'text-card-foreground'
                      }`}>
                        {step.title}
                        {step.itemCount !== undefined && ` (${step.itemCount})`}
                      </div>
                      <div className="text-xs text-muted-foreground truncate">
                        {step.description}
                      </div>
                    </div>
                  </div>
                  <ChevronRight className={`w-4 h-4 flex-shrink-0 ${
                    isActive ? 'text-primary' : 'text-muted-foreground'
                  }`} />
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Content Area - Right Panel */}
      <div className="lg:col-span-2">
        <div className="bg-card rounded-lg shadow-sm border border-border h-full overflow-y-auto">
          <div className="p-6">
          {activeTab === 'event-type' && (
            <EventTypePane
              musicEventData={musicEventData}
              onMusicEventUpdate={onMusicEventUpdate}
              onComplete={handleEventTypeComplete}
            />
          )}

          {activeTab === 'event-details' && (
            <EventDetailsPane
              uploadType={uploadType}
              soccerMatchData={soccerMatchData}
              selectedPlayers={selectedPlayers}
              musicEventData={musicEventData}
              onSoccerDataUpdate={onSoccerDataUpdate}
              onMusicEventUpdate={onMusicEventUpdate}
              onComplete={handleEventDetailsComplete}
            />
          )}

          {activeTab === 'images' && (
            <ImagesPane
              images={images}
              uploadType={uploadType}
              soccerMatchData={soccerMatchData}
              selectedPlayers={selectedPlayers}
              musicEventData={musicEventData}
              onImagesAdded={onImagesAdded}
              onImageUpdate={onImageUpdate}
              onImageRemove={onImageRemove}
              onSoccerDataUpdate={onSoccerDataUpdate}
              onMusicEventUpdate={onMusicEventUpdate}
              onExportMetadata={onExportMetadata}
              onBulkEdit={onBulkEdit}
              onScrollToImage={onScrollToImage}
              onImageClick={onImageClick}
              onComplete={handleImagesComplete}
            />
          )}

          {activeTab === 'categories' && (
            <CategoriesPane
              uploadType={uploadType}
              images={images}
              soccerMatchData={soccerMatchData}
              selectedPlayers={selectedPlayers}
              musicEventData={musicEventData}
              onComplete={handleCategoriesComplete}
            />
          )}

          {activeTab === 'templates' && (
            <TemplatesPane
              uploadType={uploadType}
              images={images}
              soccerMatchData={soccerMatchData}
              selectedPlayers={selectedPlayers}
              musicEventData={musicEventData}
              onComplete={handleTemplatesComplete}
              onImageUpdate={onImageUpdate}
            />
          )}

          {activeTab === 'wikidata' && (
            <div className="space-y-6">
              <div className="text-center">
                <div className="text-6xl mb-4">🗄️</div>
                <h3 className="text-xl font-semibold text-card-foreground mb-2">Wikidata</h3>
                <p className="text-muted-foreground">
                  Link your event and artists to Wikidata entities
                </p>
              </div>
              
              {!musicEventData?.festivalData?.selectedBands?.length && !musicEventData?.concertData?.concert?.artist?.name ? (
                <div className="bg-warning/10 border border-warning/20 rounded-lg p-4">
                  <p className="text-warning font-medium">⚠️ Artist Selection Required</p>
                  <p className="text-muted-foreground text-sm mt-1">
                    Please select artists in the Event Details step to link them to Wikidata.
                  </p>
                </div>
              ) : (
                <div className="bg-info/10 border border-info/20 rounded-lg p-4">
                  <p className="text-info font-medium">🚧 Wikidata - Coming Soon</p>
                  <p className="text-muted-foreground text-sm mt-1">
                    This step will create or link to Wikidata entries for your event and artists.
                  </p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'wikipedia' && (
            <div className="space-y-6">
              <div className="text-center">
                <div className="text-6xl mb-4">📖</div>
                <h3 className="text-xl font-semibold text-card-foreground mb-2">Wikipedia</h3>
                <p className="text-muted-foreground">
                  Update Wikipedia articles with your event information
                </p>
              </div>
              
              {!musicEventData?.eventType ? (
                <div className="bg-warning/10 border border-warning/20 rounded-lg p-4">
                  <p className="text-warning font-medium">⚠️ Event Information Required</p>
                  <p className="text-muted-foreground text-sm mt-1">
                    Please complete the event setup steps to update Wikipedia articles.
                  </p>
                </div>
              ) : (
                <div className="bg-info/10 border border-info/20 rounded-lg p-4">
                  <p className="text-info font-medium">🚧 Wikipedia - Coming Soon</p>
                  <p className="text-muted-foreground text-sm mt-1">
                    This step will help you update relevant Wikipedia articles with event information.
                  </p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'upload' && (
            <UploadPane
              uploadType={uploadType}
              images={images}
              soccerMatchData={soccerMatchData}
              selectedPlayers={selectedPlayers}
              musicEventData={musicEventData}
              onComplete={() => console.log('Upload completed!')}
            />
          )}
          </div>
        </div>
      </div>
    </div>
  );
}