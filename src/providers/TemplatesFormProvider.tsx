'use client';

import React, { createContext, useContext, useCallback, useEffect } from 'react';
import { useFormContext } from 'react-hook-form';

interface Template {
  id: string;
  type: 'information' | 'category' | 'infobox' | 'custom';
  language: string;
  title: string;
  content: string;
  variables?: Record<string, any>;
  metadata?: {
    generator?: string;
    timestamp?: string;
    version?: string;
  };
}

interface TemplateGenerator {
  type: string;
  generate: (data: any) => Template;
}

interface TemplatesFormContextType {
  getTemplates: () => Template[];
  add: (template: Template | { type: string; data: any }) => void;
  remove: (templateId: string) => void;
  generate: (type: string, data: any) => Template | null;
  validate: () => boolean;
  getLanguages: () => string[];
  setLanguage: (language: string) => void;
  clear: () => void;
}

const TemplatesFormContext = createContext<TemplatesFormContextType | undefined>(undefined);

export function useTemplatesForm(): TemplatesFormContextType {
  const context = useContext(TemplatesFormContext);
  if (!context) {
    throw new Error('useTemplatesForm must be used within a TemplatesFormProvider');
  }
  return context;
}

interface TemplatesFormProviderProps {
  children: React.ReactNode;
  config?: {
    generators?: TemplateGenerator[];
    defaultLanguage?: string;
    supportedLanguages?: string[];
  };
}

export function TemplatesFormProvider({ children, config }: TemplatesFormProviderProps) {
  const form = useFormContext();
  const FORM_KEY = 'templates';
  const LANGUAGE_KEY = 'templateLanguage';

  // Initialize templates if not present
  useEffect(() => {
    if (!form.getValues(FORM_KEY)) {
      form.setValue(FORM_KEY, []);
    }
    if (!form.getValues(LANGUAGE_KEY)) {
      form.setValue(LANGUAGE_KEY, config?.defaultLanguage || 'en');
    }
  }, [form, config]);

  const getTemplates = useCallback((): Template[] => {
    return form.getValues(FORM_KEY) || [];
  }, [form]);

  const add = useCallback((template: Template | { type: string; data: any }) => {
    const templates = getTemplates();
    
    let newTemplate: Template;
    if ('content' in template) {
      // It's a complete template
      newTemplate = {
        id: `tpl_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        ...template
      };
    } else {
      // It's a generation request
      const generated = generate(template.type, template.data);
      if (!generated) {
        console.warn('⚠️ Failed to generate template for type:', template.type);
        return;
      }
      newTemplate = generated;
    }

    const updatedTemplates = [...templates, newTemplate];
    form.setValue(FORM_KEY, updatedTemplates);
  }, [form, getTemplates]);

  const remove = useCallback((templateId: string) => {
    const templates = getTemplates();
    const updatedTemplates = templates.filter(tpl => tpl.id !== templateId);
    form.setValue(FORM_KEY, updatedTemplates);
  }, [form, getTemplates]);

  const generate = useCallback((type: string, data: any): Template | null => {
    const generator = config?.generators?.find(g => g.type === type);
    if (!generator) {
      console.warn('⚠️ No generator found for template type:', type);
      return null;
    }

    try {
      const template = generator.generate(data);
      template.id = `tpl_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      template.metadata = {
        ...template.metadata,
        generator: type,
        timestamp: new Date().toISOString(),
        version: '1.0'
      };
      
      return template;
    } catch (error) {
      console.error('❌ Error generating template:', error);
      return null;
    }
  }, [config]);

  const validate = useCallback((): boolean => {
    const templates = getTemplates();
    
    // Check if templates are present
    if (templates.length === 0) {
      console.warn('⚠️ No templates generated');
      return false;
    }

    // Validate template content
    const invalidTemplates = templates.filter(tpl => 
      !tpl.content || tpl.content.trim().length === 0
    );

    if (invalidTemplates.length > 0) {
      console.warn('⚠️ Templates with invalid content:', invalidTemplates);
      return false;
    }

    return true;
  }, [getTemplates]);

  const getLanguages = useCallback((): string[] => {
    return config?.supportedLanguages || ['en', 'de', 'fr', 'es', 'it', 'pt', 'ru', 'zh'];
  }, [config]);

  const setLanguage = useCallback((language: string) => {
    form.setValue(LANGUAGE_KEY, language);
  }, [form]);

  const clear = useCallback(() => {
    form.setValue(FORM_KEY, []);
  }, [form]);

  const value: TemplatesFormContextType = {
    getTemplates,
    add,
    remove,
    generate,
    validate,
    getLanguages,
    setLanguage,
    clear
  };

  return (
    <TemplatesFormContext.Provider value={value}>
      {children}
    </TemplatesFormContext.Provider>
  );
}

// Default template generators
export const defaultTemplateGenerators: TemplateGenerator[] = [
  {
    type: 'information',
    generate: (data) => ({
      id: '',
      type: 'information',
      language: 'en',
      title: 'Information Template',
      content: generateInformationTemplate(data),
      variables: data
    })
  },
  {
    type: 'music-festival',
    generate: (data) => ({
      id: '',
      type: 'custom',
      language: 'en',
      title: 'Music Festival Template',
      content: generateMusicFestivalTemplate(data),
      variables: data
    })
  },
  {
    type: 'soccer-match',
    generate: (data) => ({
      id: '',
      type: 'custom',
      language: 'en',
      title: 'Soccer Match Template',
      content: generateSoccerMatchTemplate(data),
      variables: data
    })
  }
];

// Template generation functions
function generateInformationTemplate(data: any): string {
  return `{{Information
|description=${data.description || ''}
|date=${data.date || ''}
|source=${data.source || ''}
|author=${data.author || ''}
|permission=${data.permission || ''}
|other_versions=${data.otherVersions || ''}
}}`;
}

function generateMusicFestivalTemplate(data: any): string {
  const festival = data.festival || {};
  const bands = data.bands || [];
  
  return `{{Music festival
|name=${festival.name || ''}
|date=${festival.date || ''}
|location=${festival.location || ''}
|performers=${bands.map((band: any) => band.name).join(', ')}
|genre=${festival.genre || ''}
}}`;
}

function generateSoccerMatchTemplate(data: any): string {
  const match = data.match || {};
  const homeTeam = data.homeTeam || {};
  const awayTeam = data.awayTeam || {};
  
  return `{{Football match
|date=${match.date || ''}
|team1=${homeTeam.name || ''}
|team2=${awayTeam.name || ''}
|score=${match.score || ''}
|venue=${match.venue || ''}
|referee=${match.referee || ''}
}}`;
}