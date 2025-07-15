'use client';

import { useState } from 'react';
import LoginButton from '@/components/auth/LoginButton';
import AuthWrapper from '@/components/auth/AuthWrapper';
import UploadTypeSelector, { UploadType } from '@/components/selectors/UploadTypeSelector';
import CategoryCreationModal from '@/components/modals/CategoryCreationModal';
import { ThemeToggle } from '@/components/layout/ThemeToggle';
import WikimediaWorkflow from '@/components/workflow/workflows/WikimediaWorkflow';
import { CategoryCreationInfo } from '@/utils/soccer-categories';
import { MusicEventMetadata } from '@/types/music';

export interface ImageFile {
  id: string;
  file: File;
  preview: string;
  metadata: {
    description: string;
    author: string; // Generated from Q-ID using {{Creator:Q-ID}} format
    wikidataQid?: string;
    date: string;
    time?: string; // Time portion (HH:MM:SS)
    dateFromExif?: boolean; // Indicates if date came from EXIF data
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
    selectedBand?: string; // Band name selected for this specific image
    selectedBandMembers?: string[]; // Array of band member IDs for this specific image
    // GPS coordinates from EXIF or event location
    gps?: {
      latitude: number;
      longitude: number;
      source: 'exif' | 'event' | 'manual';
    };
    // Generated wikitext (editable by user)
    wikitext?: string;
    wikitextModified?: boolean; // Track if user has manually edited wikitext
    // Template to include in wikitext (editable by user)
    template?: string;
    templateModified?: boolean; // Track if user has manually edited template
  };
}

export default function Home() {
  const [uploadType, setUploadType] = useState<UploadType>('general');
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [categoriesToCreate] = useState<CategoryCreationInfo[]>([]);

  const handleCreateCategories = async (categories: CategoryCreationInfo[]) => {
    // Categories are created by the modal, we just need to close it
    console.log('Categories created:', categories);
  };

  return (
    <AuthWrapper>
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-6xl mx-auto">
            <header className="mb-8">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h1 className="text-4xl font-bold text-foreground mb-2">
                    WikiPortraits Bulk Uploader
                  </h1>
                  <p className="text-lg text-muted-foreground">
                    Upload and tag portrait images for Wikimedia Commons
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <ThemeToggle />
                  <LoginButton />
                </div>
              </div>
            </header>

            <div className="space-y-8">
              <UploadTypeSelector 
                onTypeSelect={setUploadType}
                selectedType={uploadType}
              />
              
              <WikimediaWorkflow
                uploadType={uploadType}
              />
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
    </AuthWrapper>
  );
}
