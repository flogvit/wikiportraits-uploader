'use client';

import { useState } from 'react';
import ImageUploader from '@/components/ImageUploader';
import ImageGrid from '@/components/ImageGrid';
import UploadQueue from '@/components/UploadQueue';
import ExportModal from '@/components/ExportModal';
import BulkEditModal from '@/components/BulkEditModal';
import ImageModal from '@/components/ImageModal';
import LoginButton from '@/components/LoginButton';
import UploadTypeSelector, { UploadType } from '@/components/UploadTypeSelector';
import CategoryCreationModal from '@/components/CategoryCreationModal';
import { SoccerMatchMetadata, SoccerPlayer } from '@/components/SoccerMatchWorkflow';
import { getCategoriesToCreate, CategoryCreationInfo } from '@/utils/soccer-categories';
import { MusicEventMetadata } from '@/types/music';
import { getCategoriesToCreate as getMusicCategoriesToCreate } from '@/utils/music-categories';

export interface ImageFile {
  id: string;
  file: File;
  preview: string;
  metadata: {
    description: string;
    author: string;
    date: string;
    source: string;
    license: string;
    categories: string[];
    wikiPortraitsEvent: string;
    // Soccer-specific fields
    soccerMatch?: {
      homeTeam: string;
      awayTeam: string;
      date: string;
      venue: string;
      competition: string;
      result?: string;
    };
    soccerPlayer?: {
      name: string;
      team: string;
      position?: string;
      number?: string;
      wikipediaUrl?: string;
    };
    // Music-specific fields
    musicEvent?: MusicEventMetadata;
  };
}

export default function Home() {
  const [images, setImages] = useState<ImageFile[]>([]);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showBulkEditModal, setShowBulkEditModal] = useState(false);
  const [selectedImage, setSelectedImage] = useState<ImageFile | null>(null);
  const [showImageModal, setShowImageModal] = useState(false);
  const [uploadType, setUploadType] = useState<UploadType>('general');
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [categoriesToCreate, setCategoriesToCreate] = useState<CategoryCreationInfo[]>([]);
  const [soccerMatchData, setSoccerMatchData] = useState<SoccerMatchMetadata | null>(null);
  const [selectedPlayers, setSelectedPlayers] = useState<SoccerPlayer[]>([]);
  const [musicEventData, setMusicEventData] = useState<MusicEventMetadata | null>(null);

  const handleImagesAdded = (newImages: ImageFile[]) => {
    setImages(prev => [...prev, ...newImages]);
    
    // If this is a soccer upload and we have match data, check for categories to create
    if (uploadType === 'soccer' && soccerMatchData && soccerMatchData.homeTeam && soccerMatchData.awayTeam) {
      const categories = getCategoriesToCreate(soccerMatchData, selectedPlayers);
      if (categories.length > 0) {
        setCategoriesToCreate(categories);
        setShowCategoryModal(true);
      }
    }
    
    // If this is a music upload and we have event data, check for categories to create
    if (uploadType === 'music' && musicEventData) {
      const categories = getMusicCategoriesToCreate(musicEventData);
      if (categories.length > 0) {
        setCategoriesToCreate(categories);
        setShowCategoryModal(true);
      }
    }
  };

  const handleSoccerDataUpdate = (matchData: SoccerMatchMetadata, players: SoccerPlayer[]) => {
    setSoccerMatchData(matchData);
    setSelectedPlayers(players);
  };

  const handleMusicEventUpdate = (eventData: MusicEventMetadata) => {
    setMusicEventData(eventData);
  };

  const handleCreateCategories = async (categories: CategoryCreationInfo[]) => {
    // Categories are created by the modal, we just need to close it
    console.log('Categories created:', categories);
  };

  const handleImageUpdate = (id: string, metadata: Partial<ImageFile['metadata']>) => {
    setImages(prev => prev.map(img => 
      img.id === id 
        ? { ...img, metadata: { ...img.metadata, ...metadata } }
        : img
    ));
  };

  const handleImageRemove = (id: string) => {
    setImages(prev => prev.filter(img => img.id !== id));
  };

  const handleExportMetadata = () => {
    setShowExportModal(true);
  };

  const handleBulkEdit = () => {
    setShowBulkEditModal(true);
  };

  const handleBulkUpdate = (updates: Partial<ImageFile['metadata']>) => {
    setImages(prev => prev.map(img => ({
      ...img,
      metadata: { ...img.metadata, ...updates }
    })));
  };

  const handleScrollToImage = (imageId: string) => {
    const element = document.getElementById(`image-card-${imageId}`);
    if (element) {
      element.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'center' 
      });
      // Add a brief highlight effect
      element.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.5)';
      setTimeout(() => {
        element.style.boxShadow = '';
      }, 2000);
    }
  };

  const handleImageClick = (image: ImageFile) => {
    setSelectedImage(image);
    setShowImageModal(true);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <header className="mb-8">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h1 className="text-4xl font-bold text-gray-900 mb-2">
                  WikiPortraits Bulk Uploader
                </h1>
                <p className="text-lg text-gray-600">
                  Upload and tag portrait images for Wikimedia Commons
                </p>
              </div>
              <LoginButton />
            </div>
          </header>

          <div className="space-y-8">
            <UploadTypeSelector 
              onTypeSelect={setUploadType}
              selectedType={uploadType}
            />
            
            <ImageUploader 
              onImagesAdded={handleImagesAdded} 
              existingImages={images}
              uploadType={uploadType}
              onSoccerDataUpdate={handleSoccerDataUpdate}
              onMusicEventUpdate={handleMusicEventUpdate}
            />
            
            {images.length > 0 && (
              <>
                <UploadQueue 
                  images={images}
                  onExportMetadata={handleExportMetadata}
                  onBulkEdit={handleBulkEdit}
                  onScrollToImage={handleScrollToImage}
                />
                
                <ImageGrid 
                  images={images}
                  onImageUpdate={handleImageUpdate}
                  onImageRemove={handleImageRemove}
                  onImageClick={handleImageClick}
                />
              </>
            )}
          </div>
        </div>
      </div>

      <ExportModal
        images={images}
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
      />

      <BulkEditModal
        images={images}
        isOpen={showBulkEditModal}
        onClose={() => setShowBulkEditModal(false)}
        onBulkUpdate={handleBulkUpdate}
      />

      <ImageModal
        image={selectedImage}
        isOpen={showImageModal}
        onClose={() => setShowImageModal(false)}
      />

      <CategoryCreationModal
        isOpen={showCategoryModal}
        onClose={() => setShowCategoryModal(false)}
        categories={categoriesToCreate}
        onCreateCategories={handleCreateCategories}
      />
    </div>
  );
}
