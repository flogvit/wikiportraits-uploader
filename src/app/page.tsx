'use client';

import { useState } from 'react';
import LoginButton from '@/components/auth/LoginButton';
import AuthWrapper from '@/components/auth/AuthWrapper';
import CategoryCreationModal from '@/components/modals/CategoryCreationModal';
import { ThemeToggle } from '@/components/layout/ThemeToggle';
import WikimediaWorkflow from '@/components/workflow/workflows/WikimediaWorkflow';
import CacheManager from '@/components/common/CacheManager';
import StartFreshButton from '@/components/common/StartFreshButton';
import { logger } from '@/utils/logger';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
// import { CategoryCreationInfo } from '@/utils/soccer-categories';

type CategoryCreationInfo = any; // See GitHub issue #1

export default function Home() {
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [categoriesToCreate] = useState<CategoryCreationInfo[]>([]);

  const handleCreateCategories = async (categories: CategoryCreationInfo[]) => {
    // Categories are created by the modal, we just need to close it
    logger.debug('home', 'Categories created', categories);
  };

  return (
    <AuthWrapper>
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-6xl mx-auto">
            <header className="mb-8">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
                <div className="flex-1">
                  <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground mb-2">
                    Wiki Bulk Uploader
                  </h1>
                  <p className="text-base sm:text-lg text-muted-foreground">
                    Upload and tag images for Wikimedia Commons
                  </p>
                </div>
                <div className="flex items-center gap-2 sm:gap-4 sm:flex-shrink-0">
                  <StartFreshButton />
                  <CacheManager />
                  <ThemeToggle />
                  <LoginButton />
                </div>
              </div>
            </header>

            <div className="space-y-8">
              <ErrorBoundary name="Workflow">
                <WikimediaWorkflow />
              </ErrorBoundary>
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
