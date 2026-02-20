import { WikidataEntity } from '../types/wikidata';
import { ValidationRule, PaneConfig } from './pane-configuration';

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  score: number; // 0-100, overall validation score
}

export interface ValidationError {
  field: string;
  message: string;
  code: string;
  severity: 'error' | 'warning' | 'info';
  rule: string;
  value?: any;
}

export interface ValidationWarning {
  field: string;
  message: string;
  code: string;
  suggestion?: string;
  rule: string;
}

export interface ValidationContext {
  entity?: WikidataEntity;
  formData?: Record<string, any>;
  paneConfig?: PaneConfig;
  crossFieldData?: Record<string, any>; // Data from other panes
  mode?: 'create' | 'edit' | 'publish';
}

export interface CustomValidator {
  name: string;
  validator: (value: any, context: ValidationContext) => ValidationResult | Promise<ValidationResult>;
  description: string;
  applicableTypes?: string[]; // Entity types this validator applies to
}

/**
 * Universal Validation Engine
 */
export class UniversalValidator {
  private customValidators: Map<string, CustomValidator> = new Map();
  private validationHistory: Array<{
    timestamp: Date;
    context: ValidationContext;
    result: ValidationResult;
  }> = [];

  constructor() {
    this.registerBuiltinValidators();
  }

  /**
   * Validate data using pane configuration rules
   */
  async validate(
    data: Record<string, any>,
    rules: ValidationRule[],
    context: ValidationContext = {}
  ): Promise<ValidationResult> {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    let totalScore = 0;
    let maxScore = 0;

    for (const rule of rules) {
      maxScore += this.getRuleWeight(rule);
      
      try {
        const result = await this.validateRule(data, rule, context);
        
        if (result.valid) {
          totalScore += this.getRuleWeight(rule);
        } else {
          errors.push(...result.errors);
          warnings.push(...result.warnings);
        }
      } catch (error) {
        errors.push({
          field: rule.property || 'unknown',
          message: `Validation error: ${error}`,
          code: 'VALIDATION_ERROR',
          severity: 'error',
          rule: rule.type
        });
      }
    }

    const finalScore = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 100;

    const result: ValidationResult = {
      valid: errors.filter(e => e.severity === 'error').length === 0,
      errors,
      warnings,
      score: finalScore
    };

    // Add to history
    this.addToHistory(context, result);

    return result;
  }

  /**
   * Validate a single rule
   */
  private async validateRule(
    data: Record<string, any>,
    rule: ValidationRule,
    context: ValidationContext
  ): Promise<ValidationResult> {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    switch (rule.type) {
      case 'required':
        return this.validateRequired(data, rule, context);
      
      case 'optional':
        return this.validateOptional(data, rule, context);
      
      case 'conditional':
        return this.validateConditional(data, rule, context);
      
      case 'format':
        return this.validateFormat(data, rule, context);
      
      case 'range':
        return this.validateRange(data, rule, context);
      
      case 'custom':
        return this.validateCustom(data, rule, context);
      
      default:
        return { valid: true, errors: [], warnings: [], score: 100 };
    }
  }

  /**
   * Validate required fields
   */
  private validateRequired(
    data: Record<string, any>,
    rule: ValidationRule,
    context: ValidationContext
  ): ValidationResult {
    const errors: ValidationError[] = [];
    const value = rule.property ? data[rule.property] : data;

    if (value === null || value === undefined || value === '' || 
        (Array.isArray(value) && value.length === 0)) {
      errors.push({
        field: rule.property || 'data',
        message: rule.message,
        code: 'REQUIRED_FIELD_MISSING',
        severity: 'error',
        rule: 'required',
        value
      });
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings: [],
      score: errors.length === 0 ? 100 : 0
    };
  }

  /**
   * Validate optional fields (checks format if present)
   */
  private validateOptional(
    data: Record<string, any>,
    rule: ValidationRule,
    context: ValidationContext
  ): ValidationResult {
    const value = rule.property ? data[rule.property] : data;
    
    // If no value, it's valid (optional)
    if (value === null || value === undefined || value === '') {
      return { valid: true, errors: [], warnings: [], score: 100 };
    }

    // If has value, validate format based on property type
    return this.validateBasicFormat(value, rule.property, rule, context);
  }

  /**
   * Validate conditional fields
   */
  private validateConditional(
    data: Record<string, any>,
    rule: ValidationRule,
    context: ValidationContext
  ): ValidationResult {
    // Check condition
    if (rule.condition && context.entity) {
      const conditionMet = rule.condition(context.entity);
      if (!conditionMet) {
        return { valid: true, errors: [], warnings: [], score: 100 };
      }
    }

    // If condition is met, validate as required
    return this.validateRequired(data, rule, context);
  }

  /**
   * Validate format
   */
  private validateFormat(
    data: Record<string, any>,
    rule: ValidationRule,
    context: ValidationContext
  ): ValidationResult {
    const value = rule.property ? data[rule.property] : data;
    
    if (rule.validator) {
      const isValid = rule.validator(value, context.entity!);
      if (!isValid) {
        return {
          valid: false,
          errors: [{
            field: rule.property || 'data',
            message: rule.message,
            code: 'FORMAT_INVALID',
            severity: 'error',
            rule: 'format',
            value
          }],
          warnings: [],
          score: 0
        };
      }
    }

    return { valid: true, errors: [], warnings: [], score: 100 };
  }

  /**
   * Validate range
   */
  private validateRange(
    data: Record<string, any>,
    rule: ValidationRule,
    context: ValidationContext
  ): ValidationResult {
    const value = rule.property ? data[rule.property] : data;
    const errors: ValidationError[] = [];

    if (rule.params) {
      const { min, max } = rule.params;
      
      if (typeof value === 'number') {
        if (min !== undefined && value < min) {
          errors.push({
            field: rule.property || 'data',
            message: `Value must be at least ${min}`,
            code: 'VALUE_TOO_SMALL',
            severity: 'error',
            rule: 'range',
            value
          });
        }
        
        if (max !== undefined && value > max) {
          errors.push({
            field: rule.property || 'data',
            message: `Value must be at most ${max}`,
            code: 'VALUE_TOO_LARGE',
            severity: 'error',
            rule: 'range',
            value
          });
        }
      } else if (typeof value === 'string') {
        if (min !== undefined && value.length < min) {
          errors.push({
            field: rule.property || 'data',
            message: `Text must be at least ${min} characters`,
            code: 'TEXT_TOO_SHORT',
            severity: 'error',
            rule: 'range',
            value
          });
        }
        
        if (max !== undefined && value.length > max) {
          errors.push({
            field: rule.property || 'data',
            message: `Text must be at most ${max} characters`,
            code: 'TEXT_TOO_LONG',
            severity: 'error',
            rule: 'range',
            value
          });
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings: [],
      score: errors.length === 0 ? 100 : 0
    };
  }

  /**
   * Validate using custom validator
   */
  private async validateCustom(
    data: Record<string, any>,
    rule: ValidationRule,
    context: ValidationContext
  ): Promise<ValidationResult> {
    if (!rule.validator) {
      return {
        valid: false,
        errors: [{
          field: rule.property || 'data',
          message: 'Custom validator not provided',
          code: 'CUSTOM_VALIDATOR_MISSING',
          severity: 'error',
          rule: 'custom'
        }],
        warnings: [],
        score: 0
      };
    }

    try {
      const value = rule.property ? data[rule.property] : data;
      const isValid = rule.validator(value, context.entity!);
      
      if (!isValid) {
        return {
          valid: false,
          errors: [{
            field: rule.property || 'data',
            message: rule.message,
            code: 'CUSTOM_VALIDATION_FAILED',
            severity: 'error',
            rule: 'custom',
            value
          }],
          warnings: [],
          score: 0
        };
      }

      return { valid: true, errors: [], warnings: [], score: 100 };
    } catch (error) {
      return {
        valid: false,
        errors: [{
          field: rule.property || 'data',
          message: `Custom validation error: ${error}`,
          code: 'CUSTOM_VALIDATION_ERROR',
          severity: 'error',
          rule: 'custom'
        }],
        warnings: [],
        score: 0
      };
    }
  }

  /**
   * Cross-field validation
   */
  async validateCrossField(
    allData: Record<string, Record<string, any>>,
    context: ValidationContext = {}
  ): Promise<ValidationResult> {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Example cross-field validations
    const musicData = allData.musicDetails;
    const soccerData = allData.soccerDetails;
    const images = allData.images;
    const categories = allData.categories;

    // Validate that event has matching images
    if ((musicData || soccerData) && images) {
      if (!images.files || images.files.length === 0) {
        warnings.push({
          field: 'images',
          message: 'Events typically should have at least one image',
          code: 'NO_IMAGES_WARNING',
          suggestion: 'Add images to make the upload more complete',
          rule: 'cross-field'
        });
      }
    }

    // Validate categories match event type
    if (musicData && categories?.categories) {
      const hasMusicalCategories = categories.categories.some((cat: string) => 
        cat.toLowerCase().includes('music') || 
        cat.toLowerCase().includes('festival') ||
        cat.toLowerCase().includes('concert')
      );
      
      if (!hasMusicalCategories) {
        warnings.push({
          field: 'categories',
          message: 'Consider adding music-related categories for music events',
          code: 'MISSING_MUSIC_CATEGORIES',
          suggestion: 'Add categories like "Music festivals" or "Concerts"',
          rule: 'cross-field'
        });
      }
    }

    // More cross-field validations can be added here

    return {
      valid: errors.filter(e => e.severity === 'error').length === 0,
      errors,
      warnings,
      score: errors.length === 0 ? 100 : 75
    };
  }

  /**
   * Real-time validation (for form fields as user types)
   */
  async validateRealTime(
    field: string,
    value: any,
    rules: ValidationRule[],
    context: ValidationContext = {}
  ): Promise<ValidationResult> {
    const relevantRules = rules.filter(rule => 
      !rule.property || rule.property === field
    );

    const data = { [field]: value };
    return this.validate(data, relevantRules, context);
  }

  /**
   * Register a custom validator
   */
  registerCustomValidator(validator: CustomValidator): void {
    this.customValidators.set(validator.name, validator);
  }

  /**
   * Get validation suggestions
   */
  getValidationSuggestions(
    result: ValidationResult,
    context: ValidationContext = {}
  ): string[] {
    const suggestions: string[] = [];

    result.errors.forEach(error => {
      switch (error.code) {
        case 'REQUIRED_FIELD_MISSING':
          suggestions.push(`Fill in the required field: ${error.field}`);
          break;
        case 'FORMAT_INVALID':
          suggestions.push(`Check the format of: ${error.field}`);
          break;
        case 'VALUE_TOO_SMALL':
        case 'VALUE_TOO_LARGE':
          suggestions.push(`Adjust the value for: ${error.field}`);
          break;
      }
    });

    result.warnings.forEach(warning => {
      if (warning.suggestion) {
        suggestions.push(warning.suggestion);
      }
    });

    return suggestions;
  }

  /**
   * Get validation history
   */
  getValidationHistory(): Array<{
    timestamp: Date;
    context: ValidationContext;
    result: ValidationResult;
  }> {
    return [...this.validationHistory];
  }

  /**
   * Clear validation history
   */
  clearHistory(): void {
    this.validationHistory = [];
  }

  // Private helper methods

  private validateBasicFormat(
    value: any,
    property: string | undefined,
    rule: ValidationRule,
    context: ValidationContext
  ): ValidationResult {
    // Basic format validation based on Wikidata property types
    if (!property) return { valid: true, errors: [], warnings: [], score: 100 };

    const errors: ValidationError[] = [];

    // Date properties (P569, P570, P585, etc.)
    if (['P569', 'P570', 'P585', 'P580', 'P582'].includes(property)) {
      if (typeof value === 'string' && !this.isValidDateString(value)) {
        errors.push({
          field: property,
          message: 'Invalid date format',
          code: 'INVALID_DATE_FORMAT',
          severity: 'error',
          rule: 'format',
          value
        });
      }
    }

    // Entity properties should be objects or Q-IDs
    if (property.startsWith('P') && typeof value === 'string' && !value.startsWith('Q')) {
      // This might be a text value where we expect an entity
      // Could be a warning rather than an error
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings: [],
      score: errors.length === 0 ? 100 : 0
    };
  }

  private isValidDateString(dateString: string): boolean {
    const date = new Date(dateString);
    return !isNaN(date.getTime());
  }

  private getRuleWeight(rule: ValidationRule): number {
    switch (rule.type) {
      case 'required': return 10;
      case 'conditional': return 8;
      case 'format': return 6;
      case 'range': return 4;
      case 'optional': return 2;
      case 'custom': return 5;
      default: return 1;
    }
  }

  private addToHistory(context: ValidationContext, result: ValidationResult): void {
    this.validationHistory.push({
      timestamp: new Date(),
      context,
      result
    });

    // Keep only last 100 validations
    if (this.validationHistory.length > 100) {
      this.validationHistory = this.validationHistory.slice(-100);
    }
  }

  private makeValidationResult(valid: boolean, name: string): ValidationResult {
    return {
      valid,
      errors: valid ? [] : [{ field: name, message: `${name} validation failed`, code: name, severity: 'error', rule: name }],
      warnings: [],
      score: valid ? 100 : 0
    };
  }

  private registerBuiltinValidators(): void {
    // Wikidata entity ID validator
    this.registerCustomValidator({
      name: 'wikidata-entity-id',
      validator: (value) => {
        let valid = false;
        if (typeof value === 'string') {
          valid = /^Q\d+$/.test(value);
        } else if (typeof value === 'object' && value.id) {
          valid = /^Q\d+$/.test(value.id);
        }
        return this.makeValidationResult(valid, 'wikidata-entity-id');
      },
      description: 'Validates Wikidata entity IDs (Q-numbers)',
      applicableTypes: ['Q5', 'Q215627'] // Person, Band
    });

    // Property ID validator
    this.registerCustomValidator({
      name: 'wikidata-property-id',
      validator: (value) => {
        const valid = typeof value === 'string' && /^P\d+$/.test(value);
        return this.makeValidationResult(valid, 'wikidata-property-id');
      },
      description: 'Validates Wikidata property IDs (P-numbers)'
    });

    // Commons category name validator
    this.registerCustomValidator({
      name: 'commons-category',
      validator: (value) => {
        let valid = false;
        if (typeof value === 'string') {
          valid = value.length > 0 &&
                 !value.includes('[') &&
                 !value.includes(']') &&
                 !value.includes('|');
        }
        return this.makeValidationResult(valid, 'commons-category');
      },
      description: 'Validates Commons category names'
    });

    // File type validator
    this.registerCustomValidator({
      name: 'image-file-type',
      validator: (value) => {
        let valid = false;
        if (value && value.type) {
          const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/svg+xml'];
          valid = allowedTypes.includes(value.type);
        }
        return this.makeValidationResult(valid, 'image-file-type');
      },
      description: 'Validates image file types for Commons upload'
    });
  }
}

// Global validator instance
export const universalValidator = new UniversalValidator();

export default universalValidator;