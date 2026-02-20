'use client';

import React, { createContext, useContext, useCallback, useEffect } from 'react';
import { useFormContext } from 'react-hook-form';
import { logger } from '@/utils/logger';

interface Category {
  id: string;
  name: string;
  type: string;
  source: string;
  auto?: boolean;
}

interface CategoriesFormContextType {
  getCategories: () => Category[];
  add: (category: string | Category) => void;
  remove: (categoryId: string) => void;
  getAutoCategories: () => Category[];
  generateAuto: (data: any) => void;
  validate: () => boolean;
  clear: () => void;
}

const CategoriesFormContext = createContext<CategoriesFormContextType | undefined>(undefined);

export function useCategoriesForm(): CategoriesFormContextType {
  const context = useContext(CategoriesFormContext);
  if (!context) {
    throw new Error('useCategoriesForm must be used within a CategoriesFormProvider');
  }
  return context;
}

interface CategoriesFormProviderProps {
  children: React.ReactNode;
  config?: {
    categoryTypes?: string[];
    autoCategories?: Array<{
      template: string;
      source: string;
      type?: string;
    }>;
  };
}

export function CategoriesFormProvider({ children, config }: CategoriesFormProviderProps) {
  const form = useFormContext();
  const FORM_KEY = 'categories';

  // Initialize categories if not present
  useEffect(() => {
    if (!form.getValues(FORM_KEY)) {
      form.setValue(FORM_KEY, []);
    }
  }, [form]);

  const getCategories = useCallback((): Category[] => {
    return form.getValues(FORM_KEY) || [];
  }, [form]);

  const add = useCallback((category: string | Category) => {
    const categories = getCategories();
    
    let newCategory: Category;
    if (typeof category === 'string') {
      newCategory = {
        id: `cat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        name: category,
        type: 'manual',
        source: 'user',
        auto: false
      };
    } else {
      newCategory = {
        ...category,
        id: category.id || `cat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        auto: category.auto || false
      };
    }

    // Check for duplicates
    const exists = categories.some(cat => cat.name === newCategory.name);
    if (!exists) {
      const updatedCategories = [...categories, newCategory];
      form.setValue(FORM_KEY, updatedCategories);
      logger.debug('CategoriesFormProvider', 'Added category', newCategory.name);
    }
  }, [form, getCategories]);

  const remove = useCallback((categoryId: string) => {
    const categories = getCategories();
    const updatedCategories = categories.filter(cat => cat.id !== categoryId);
    form.setValue(FORM_KEY, updatedCategories);
    logger.debug('CategoriesFormProvider', 'Removed category', categoryId);
  }, [form, getCategories]);

  const getAutoCategories = useCallback((): Category[] => {
    return getCategories().filter(cat => cat.auto);
  }, [getCategories]);

  const generateAuto = useCallback((data: any) => {
    if (!config?.autoCategories) return;

    config.autoCategories.forEach(rule => {
      // Extract data from the source path
      const sourceValue = getNestedValue(data, rule.source);
      
      if (sourceValue) {
        // Generate category name from template
        const categoryName = rule.template.replace(/\{(\w+)\}/g, (match, key) => {
          const value = getNestedValue(data, key);
          return value || match;
        });

        // Add the auto-generated category
        add({
          id: `auto_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          name: categoryName,
          type: rule.type || 'auto',
          source: rule.source,
          auto: true
        });
      }
    });
  }, [add, config]);

  const validate = useCallback((): boolean => {
    const categories = getCategories();
    
    // Basic validation - at least one category
    if (categories.length === 0) {
      logger.warn('CategoriesFormProvider', 'No categories defined');
      return false;
    }

    // Validate category names
    const invalidCategories = categories.filter(cat => 
      !cat.name || cat.name.trim().length === 0
    );

    if (invalidCategories.length > 0) {
      logger.warn('CategoriesFormProvider', 'Categories with invalid names', invalidCategories);
      return false;
    }

    return true;
  }, [getCategories]);

  const clear = useCallback(() => {
    form.setValue(FORM_KEY, []);
    logger.debug('CategoriesFormProvider', 'Cleared all categories');
  }, [form]);

  // Watch for changes in other form data to trigger auto-generation
  useEffect(() => {
    const subscription = form.watch((data) => {
      if (data && config?.autoCategories) {
        // Remove existing auto categories
        const manualCategories = getCategories().filter(cat => !cat.auto);
        form.setValue(FORM_KEY, manualCategories);
        
        // Generate new auto categories
        generateAuto(data);
      }
    });

    return () => subscription.unsubscribe();
  }, [form, config, generateAuto, getCategories]);

  const value: CategoriesFormContextType = {
    getCategories,
    add,
    remove,
    getAutoCategories,
    generateAuto,
    validate,
    clear
  };

  return (
    <CategoriesFormContext.Provider value={value}>
      {children}
    </CategoriesFormContext.Provider>
  );
}

// Helper function to get nested values from objects
function getNestedValue(obj: any, path: string): any {
  return path.split('.').reduce((current, key) => {
    return current && current[key] !== undefined ? current[key] : undefined;
  }, obj);
}