/**
 * CategoryGenerationProvider
 * Wraps the category generation hook and provides it globally
 * Ensures categories are calculated in one place and available everywhere
 */

'use client';

import { createContext, useContext, ReactNode } from 'react';
import { useCategoryGeneration } from '@/hooks/useCategoryGeneration';
import type { CategoryCreationInfo } from '@/hooks/useCategoryGeneration';

interface CategoryGenerationContextType {
  categories: string[];
  categoriesToCreate: CategoryCreationInfo[];
  isGenerating: boolean;
  addCategory: (categoryName: string) => boolean;
  removeCategory: (categoryName: string) => boolean;
  refreshCategories: () => void;
}

const CategoryGenerationContext = createContext<CategoryGenerationContextType | undefined>(undefined);

export function CategoryGenerationProvider({ children }: { children: ReactNode }) {
  const categoryGeneration = useCategoryGeneration();

  return (
    <CategoryGenerationContext.Provider value={categoryGeneration}>
      {children}
    </CategoryGenerationContext.Provider>
  );
}

export function useCategoryGenerationContext() {
  const context = useContext(CategoryGenerationContext);
  if (context === undefined) {
    throw new Error('useCategoryGenerationContext must be used within CategoryGenerationProvider');
  }
  return context;
}
