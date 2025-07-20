'use client';

import React, { useEffect } from 'react';
import { Controller } from 'react-hook-form';
import { FileText } from 'lucide-react';
import { useUniversalForm } from '@/providers/UniversalFormProvider';
// import { ImageFile } from '@/types';
import { generateTemplateName, generateTemplate } from '@/utils/template-generator';


interface TemplatesPaneProps {
  onComplete: () => void;
}

export default function TemplatesPane({
  onComplete
}: TemplatesPaneProps) {
  const { watch, setValue, getValues } = useUniversalForm();
  
  const updateImage = (imageId: string, updates: any) => {
    const currentQueue = getValues('files.queue') || [];
    const updatedQueue = currentQueue.map((img: any) => 
      img.id === imageId ? { ...img, ...updates } : img
    );
    setValue('files.queue', updatedQueue, { shouldDirty: true });
  };

  // Get all data from the unified form
  const workflowType = watch('workflowType');
  const uploadType = workflowType === 'music-event' ? 'music' : 'general';
  const images = watch('files.queue') || [];
  const musicEventData = watch('eventDetails.musicEvent');
  
  const templatesData = watch('templates') || {};
  const { selectedLanguage = 'en', customTemplateName } = templatesData;

  const languages = [
    { code: 'en', name: 'English' },
    { code: 'fr', name: 'Français' },
    { code: 'de', name: 'Deutsch' },
    { code: 'es', name: 'Español' },
    { code: 'it', name: 'Italiano' },
    { code: 'pt', name: 'Português' },
    { code: 'nl', name: 'Nederlands' }
  ];

  // Initialize template name and code when dependencies change
  useEffect(() => {
    const generatedName = generateTemplateName(uploadType, musicEventData, undefined);
    if (!customTemplateName) {
      setValue('templates.customTemplateName', generatedName);
    }
    
    const generatedTemplate = generateTemplate(uploadType, musicEventData, undefined, selectedLanguage);
    setValue('templates.templateCode', generatedTemplate);
  }, [uploadType, musicEventData, selectedLanguage, customTemplateName, setValue]);

  const templateName = customTemplateName || generateTemplateName(uploadType, musicEventData, undefined);
  const templateUrl = `https://commons.wikimedia.org/wiki/Template:${encodeURIComponent(templateName)}`;

  const updateAllImagesTemplate = () => {
    if (customTemplateName) {
      // Update all images with the custom template
      images.forEach((imgData) => {
        // imgData is already an ImageFile from the form
        updateImage(imgData.id, {
          ...imgData,
          metadata: {
            ...imgData.metadata,
            template: customTemplateName,
            templateModified: true 
          }
        });
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="text-6xl mb-4">📄</div>
        <h3 className="text-xl font-semibold text-card-foreground mb-2">Templates</h3>
        <p className="text-muted-foreground">
          Create WikiPortraits templates for your event
        </p>
      </div>

      {/* Language Selection */}
      <div className="flex justify-center">
        <div className="flex items-center space-x-2">
          <label className="text-sm font-medium text-card-foreground">Wikipedia Language:</label>
          <Controller
            name="templates.selectedLanguage"
            control={useUniversalForm().control}
            render={({ field }) => (
              <select
                {...field}
                value={field.value}
                onChange={(e) => field.onChange(e.target.value)}
                className="px-3 py-1 bg-background border border-border rounded-lg text-sm"
              >
                {languages.map((lang) => (
                  <option key={lang.code} value={lang.code}>
                    {lang.name}
                  </option>
                ))}
              </select>
            )}
          />
        </div>
      </div>

      {/* Template Name Editor */}
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-2">
          <label className="block text-sm font-medium text-card-foreground">
            Template Name
          </label>
          <button
            onClick={updateAllImagesTemplate}
            disabled={!customTemplateName}
            className="px-3 py-1 bg-primary hover:bg-primary/90 disabled:bg-primary/50 text-primary-foreground text-xs rounded-lg transition-colors"
          >
            Apply to All Images
          </button>
        </div>
        <Controller
          name="templates.customTemplateName"
          control={useUniversalForm().control}
          render={({ field }) => (
            <input
              {...field}
              type="text"
              value={field.value}
              onChange={(e) => field.onChange(e.target.value)}
              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm font-mono"
              placeholder="e.g. WikiPortraits Event Name"
            />
          )}
        />
        <p className="text-xs text-muted-foreground mt-1">
          This will be the template name on Commons: Template:{customTemplateName}
        </p>
      </div>

      <div className="max-w-4xl mx-auto">
        {/* Template to be Created */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-lg font-semibold text-card-foreground">Template to be Created</h4>
            <a
              href={templateUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center space-x-2 px-3 py-1 bg-primary/10 hover:bg-primary/20 rounded-lg transition-colors text-primary hover:text-primary/80"
            >
              <FileText className="h-4 w-4" />
              <span className="text-sm">View on Commons</span>
            </a>
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium text-card-foreground">Template Code (editable):</label>
            <Controller
              name="templates.templateCode"
              control={useUniversalForm().control}
              render={({ field }) => (
                <textarea
                  {...field}
                  value={field.value}
                  onChange={(e) => field.onChange(e.target.value)}
                  className="w-full h-32 px-3 py-2 bg-background border border-border rounded-lg text-sm font-mono resize-y"
                  placeholder="Template code will be generated automatically..."
                />
              )}
            />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-muted-foreground">
            <div>
              <p><strong>Template Name:</strong> {templateName}</p>
              <p><strong>Wikipedia Language:</strong> {selectedLanguage}</p>
            </div>
            <div>
              <p><strong>Will be created at:</strong></p>
              <a 
                href={templateUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-primary hover:text-primary/80 break-all"
              >
                Template:{templateName}
              </a>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-info/10 border border-info/20 rounded-lg p-4">
        <h4 className="text-info font-semibold mb-2">📝 How it works</h4>
        <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
          <li>Review and edit the template code above if needed</li>
          <li>The template will be automatically created on Commons during upload</li>
          <li>All your images will reference this template in their wikitext</li>
          <li>You can click "View on Commons" to see the template once it's created</li>
        </ol>
      </div>

      <div className="flex justify-center pt-4">
        <button
          onClick={onComplete}
          className="px-6 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg transition-colors"
        >
          Template Ready - Continue to Wikidata
        </button>
      </div>
    </div>
  );
}