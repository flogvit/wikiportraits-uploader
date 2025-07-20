import { useState, useCallback, useEffect, useMemo } from 'react';
import { WikidataEntity } from '../types/wikidata';
import { PaneConfig, WorkflowConfig, ValidationRule } from '../utils/pane-configuration';
import { universalValidator, ValidationResult, ValidationContext } from '../utils/universal-validation';
import { categoryGenerator, CategoryGenerationResult, CategoryGenerationContext } from '../utils/category-generation';
import { globalEventBus, ScopedEventBus } from '../utils/event-bus';

export interface UseUniversalPaneOptions {
  config: PaneConfig;
  workflowConfig?: WorkflowConfig;
  initialData?: Record<string, any>;
  autoValidate?: boolean;
  autoGenerateCategories?: boolean;
  onDataChange?: (data: Record<string, any>) => void;
  onValidation?: (result: ValidationResult) => void;
  onCategoriesGenerated?: (result: CategoryGenerationResult) => void;
}

export interface UseUniversalPaneReturn {
  // Configuration
  config: PaneConfig;
  isValid: boolean;
  
  // Data management
  data: Record<string, any>;
  updateData: (updates: Record<string, any>) => void;
  updateField: (field: string, value: any) => void;
  resetData: () => void;
  clearData: () => void;
  
  // Validation
  validationResult: ValidationResult | null;
  validateData: (data?: Record<string, any>) => Promise<ValidationResult>;
  validateField: (field: string, value: any) => Promise<ValidationResult>;
  getFieldErrors: (field: string) => string[];
  
  // Category generation
  categories: string[];
  categoryResult: CategoryGenerationResult | null;
  generateCategories: (context?: CategoryGenerationContext) => Promise<CategoryGenerationResult>;
  addCategory: (category: string) => void;
  removeCategory: (category: string) => void;
  
  // Entity management
  entities: Record<string, WikidataEntity>;
  addEntity: (key: string, entity: WikidataEntity) => void;
  removeEntity: (key: string) => void;
  updateEntity: (key: string, entity: WikidataEntity) => void;
  
  // Event bus communication
  eventBus: ScopedEventBus;
  postToPane: <T extends keyof import('../utils/event-bus').PaneEvents>(
    event: T,
    data: Omit<import('../utils/event-bus').PaneEvents[T], 'source'>
  ) => Promise<void>;
  
  // UI helpers
  getDisplayFields: () => import('../utils/pane-configuration').DisplayField[];
  getFieldConfig: (field: string) => import('../utils/pane-configuration').DisplayField | null;
  isFieldRequired: (field: string) => boolean;
  getFieldPlaceholder: (field: string) => string;
  
  // State
  isDirty: boolean;
  isLoading: boolean;
  error: string | null;
}

export function useUniversalPane(options: UseUniversalPaneOptions): UseUniversalPaneReturn {
  const {
    config,
    workflowConfig,
    initialData = {},
    autoValidate = true,
    autoGenerateCategories = false,
    onDataChange,
    onValidation,
    onCategoriesGenerated
  } = options;

  // State
  const [data, setData] = useState<Record<string, any>>(initialData);
  const [entities, setEntities] = useState<Record<string, WikidataEntity>>({});
  const [categories, setCategories] = useState<string[]>([]);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [categoryResult, setCategoryResult] = useState<CategoryGenerationResult | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Create scoped event bus
  const eventBus = useMemo(() => globalEventBus.createScope(config.id), [config.id]);

  // Computed values
  const isValid = validationResult?.valid ?? true;

  // Data management
  const updateData = useCallback((updates: Record<string, any>) => {
    setData(prev => {
      const newData = { ...prev, ...updates };
      setIsDirty(true);
      onDataChange?.(newData);
      return newData;
    });
  }, [onDataChange]);

  const updateField = useCallback((field: string, value: any) => {
    updateData({ [field]: value });
  }, [updateData]);

  const resetData = useCallback(() => {
    setData(initialData);
    setIsDirty(false);
    setError(null);
  }, [initialData]);

  const clearData = useCallback(() => {
    setData({});
    setEntities({});
    setCategories([]);
    setIsDirty(false);
    setError(null);
  }, []);

  // Validation
  const validateData = useCallback(async (dataToValidate?: Record<string, any>): Promise<ValidationResult> => {
    const targetData = dataToValidate || data;
    const context: ValidationContext = {
      formData: targetData,
      paneConfig: config,
      mode: 'edit'
    };

    try {
      setIsLoading(true);
      setError(null);
      
      const result = await universalValidator.validate(
        targetData,
        config.validationRules,
        context
      );
      
      setValidationResult(result);
      onValidation?.(result);
      
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Validation error';
      setError(errorMessage);
      
      const errorResult: ValidationResult = {
        valid: false,
        errors: [{
          field: 'validation',
          message: errorMessage,
          code: 'VALIDATION_ERROR',
          severity: 'error',
          rule: 'system'
        }],
        warnings: [],
        score: 0
      };
      
      setValidationResult(errorResult);
      return errorResult;
    } finally {
      setIsLoading(false);
    }
  }, [data, config, onValidation]);

  const validateField = useCallback(async (field: string, value: any): Promise<ValidationResult> => {
    const context: ValidationContext = {
      formData: { ...data, [field]: value },
      paneConfig: config,
      mode: 'edit'
    };

    try {
      const result = await universalValidator.validateRealTime(
        field,
        value,
        config.validationRules,
        context
      );
      
      return result;
    } catch (err) {
      return {
        valid: false,
        errors: [{
          field,
          message: `Validation error: ${err}`,
          code: 'FIELD_VALIDATION_ERROR',
          severity: 'error',
          rule: 'system'
        }],
        warnings: [],
        score: 0
      };
    }
  }, [data, config]);

  const getFieldErrors = useCallback((field: string): string[] => {
    if (!validationResult) return [];
    
    return validationResult.errors
      .filter(error => error.field === field)
      .map(error => error.message);
  }, [validationResult]);

  // Category generation
  const generateCategories = useCallback(async (context?: CategoryGenerationContext): Promise<CategoryGenerationResult> => {
    const generationContext: CategoryGenerationContext = {
      formData: data,
      entityData: entities,
      workflowConfig,
      ...context
    };

    try {
      setIsLoading(true);
      setError(null);
      
      const result = await categoryGenerator.generateCategories(
        generationContext,
        config.categoryRules
      );
      
      // Extract category names and add to categories
      const newCategories = result.categories.map(cat => cat.name);
      setCategories(prev => {
        const combined = [...prev, ...newCategories];
        return Array.from(new Set(combined)); // Remove duplicates
      });
      
      setCategoryResult(result);
      onCategoriesGenerated?.(result);
      
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Category generation error';
      setError(errorMessage);
      
      const errorResult: CategoryGenerationResult = {
        categories: [],
        suggestions: [],
        warnings: [errorMessage],
        totalGenerated: 0,
        duplicatesRemoved: 0,
        processingTime: 0
      };
      
      return errorResult;
    } finally {
      setIsLoading(false);
    }
  }, [data, entities, config, workflowConfig, onCategoriesGenerated]);

  const addCategory = useCallback((category: string) => {
    setCategories(prev => {
      if (prev.includes(category)) return prev;
      return [...prev, category];
    });
    setIsDirty(true);
  }, []);

  const removeCategory = useCallback((category: string) => {
    setCategories(prev => prev.filter(cat => cat !== category));
    setIsDirty(true);
  }, []);

  // Entity management
  const addEntity = useCallback((key: string, entity: WikidataEntity) => {
    setEntities(prev => ({ ...prev, [key]: entity }));
    setIsDirty(true);
  }, []);

  const removeEntity = useCallback((key: string) => {
    setEntities(prev => {
      const newEntities = { ...prev };
      delete newEntities[key];
      return newEntities;
    });
    setIsDirty(true);
  }, []);

  const updateEntity = useCallback((key: string, entity: WikidataEntity) => {
    setEntities(prev => ({ ...prev, [key]: entity }));
    setIsDirty(true);
  }, []);

  // Event bus communication
  const postToPane = useCallback(async <T extends keyof import('../utils/event-bus').PaneEvents>(
    event: T,
    data: Omit<import('../utils/event-bus').PaneEvents[T], 'source'>
  ) => {
    await eventBus.post(event, data);
  }, [eventBus]);

  // UI helpers
  const getDisplayFields = useCallback(() => {
    return config.displayFields;
  }, [config]);

  const getFieldConfig = useCallback((field: string) => {
    return config.displayFields.find(f => f.key === field) || null;
  }, [config]);

  const isFieldRequired = useCallback((field: string) => {
    const fieldConfig = getFieldConfig(field);
    if (fieldConfig?.required) return true;
    
    // Check validation rules
    return config.validationRules.some(rule => 
      rule.type === 'required' && 
      (rule.property === field || field === rule.property)
    );
  }, [config, getFieldConfig]);

  const getFieldPlaceholder = useCallback((field: string) => {
    const fieldConfig = getFieldConfig(field);
    return fieldConfig?.placeholder || `Enter ${fieldConfig?.label || field}`;
  }, [getFieldConfig]);

  // Auto-validation when data changes
  useEffect(() => {
    if (autoValidate && isDirty) {
      validateData();
    }
  }, [data, autoValidate, isDirty, validateData]);

  // Auto-generate categories when entities change
  useEffect(() => {
    if (autoGenerateCategories && Object.keys(entities).length > 0) {
      generateCategories();
    }
  }, [entities, autoGenerateCategories, generateCategories]);

  // Subscribe to relevant events
  useEffect(() => {
    const unsubscribers: (() => void)[] = [];

    // Listen for category additions from other panes
    unsubscribers.push(
      eventBus.subscribe('category:add', (payload) => {
        addCategory(payload.name);
      })
    );

    // Listen for entity updates from other panes
    unsubscribers.push(
      eventBus.subscribe('entity:select', (payload) => {
        addEntity(payload.role, payload.entity);
      })
    );

    // Listen for data sync requests
    unsubscribers.push(
      eventBus.subscribe('data:sync', (payload) => {
        if (payload.pane === config.id) {
          updateData(payload.data);
        }
      })
    );

    // Listen for validation requests
    unsubscribers.push(
      eventBus.subscribe('validation:request', (payload) => {
        if (payload.pane === config.id) {
          validateData();
        }
      })
    );

    return () => {
      unsubscribers.forEach(unsubscribe => unsubscribe());
    };
  }, [eventBus, config.id, addCategory, addEntity, updateData, validateData]);

  // Post validation updates to other panes
  useEffect(() => {
    if (validationResult) {
      postToPane('validation:update', {
        pane: config.id,
        valid: validationResult.valid,
        errors: validationResult.errors.map(e => e.message)
      });
    }
  }, [validationResult, postToPane, config.id]);

  // Post data changes to other panes
  useEffect(() => {
    if (isDirty) {
      postToPane('data:change', {
        pane: config.id,
        key: 'data',
        value: data
      });
    }
  }, [data, isDirty, postToPane, config.id]);

  return {
    // Configuration
    config,
    isValid,
    
    // Data management
    data,
    updateData,
    updateField,
    resetData,
    clearData,
    
    // Validation
    validationResult,
    validateData,
    validateField,
    getFieldErrors,
    
    // Category generation
    categories,
    categoryResult,
    generateCategories,
    addCategory,
    removeCategory,
    
    // Entity management
    entities,
    addEntity,
    removeEntity,
    updateEntity,
    
    // Event bus communication
    eventBus,
    postToPane,
    
    // UI helpers
    getDisplayFields,
    getFieldConfig,
    isFieldRequired,
    getFieldPlaceholder,
    
    // State
    isDirty,
    isLoading,
    error
  };
}

export default useUniversalPane;