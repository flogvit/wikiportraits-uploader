'use client';

import { useState } from 'react';
import LoginButton from '@/components/auth/LoginButton';
import AuthWrapper from '@/components/auth/AuthWrapper';
import UploadTypeSelector from '@/components/selectors/UploadTypeSelector';
import CategoryCreationModal from '@/components/modals/CategoryCreationModal';
import { ThemeToggle } from '@/components/layout/ThemeToggle';
import WikimediaWorkflow from '@/components/workflow/workflows/WikimediaWorkflow';
import { CategoryCreationInfo } from '@/utils/soccer-categories';
import { UploadType } from '@/types/upload';

export default function Home() {
  const [uploadType, setUploadType] = useState<UploadType>('music');
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
