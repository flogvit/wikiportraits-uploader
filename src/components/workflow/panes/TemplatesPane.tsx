'use client';

import React, { useEffect, useState } from 'react';
import { FileText, CheckCircle, AlertCircle, ExternalLink, RefreshCw } from 'lucide-react';
import { logger } from '@/utils/logger';
import { useUniversalForm } from '@/providers/UniversalFormProvider';
import {
  generateStandardWikiPortraitsTemplate,
  checkStandardTemplateExists,
  generateTemplateParameters,
  getYearFromDate,
  getStandardTemplateName
} from '@/utils/wikiportraits-templates';
import { generateTemplateName, generateTemplate } from '@/utils/template-generator';


interface TemplatesPaneProps {
  onCompleteAction: () => void;
}

export default function TemplatesPane({
  onCompleteAction
}: TemplatesPaneProps) {
  const { watch, setValue, getValues } = useUniversalForm();
  const [templateExists, setTemplateExists] = useState(false);
  const [checkingTemplate, setCheckingTemplate] = useState(false);
  const [templateConfig, setTemplateConfig] = useState<any>(null);
  
  const updateImage = (imageId: string, updates: any) => {
    const currentQueue = getValues('files.queue') || [];
    const updatedQueue = currentQueue.map((img: any) => 
      img.id === imageId ? { ...img, ...updates } : img
    );
    setValue('files.queue', updatedQueue, { shouldDirty: true });
  };

  // Get all data from the unified form
  const uploadType: 'music' = 'music';
  const images = watch('files.queue') || [];
  const eventDetails = watch('eventDetails');
  const isWikiPortraitsJob = watch('isWikiPortraitsJob');

  const templatesData = watch('computed.templates') || {};
  const selectedLanguage = 'en';
  const customTemplateName = (templatesData as any)?.information || '';

  // Check if standard WikiPortraits template exists
  useEffect(() => {
    const checkTemplate = async () => {
      if (!eventDetails?.title || !isWikiPortraitsJob) {
        return;
      }

      setCheckingTemplate(true);
      try {
        const templateName = getStandardTemplateName();
        const exists = await checkStandardTemplateExists();
        setTemplateExists(exists);

        // Store basic config for display
        setTemplateConfig({
          templateName,
          eventName: eventDetails.title
        });

        // Store template info in form
        setValue('computed.wikiportraitsTemplate' as any, {
          templateName,
          exists,
          isStandard: true
        });

        logger.debug('TemplatesPane', 'WikiPortraits standard template check', { templateName, exists });
      } catch (error) {
        logger.error('TemplatesPane', 'Error checking template', error);
      } finally {
        setCheckingTemplate(false);
      }
    };

    checkTemplate();
  }, [eventDetails?.title, isWikiPortraitsJob, setValue]);

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
    const generatedName = generateTemplateName(uploadType, null);
    if (!customTemplateName) {
      setValue('computed.templates' as any, { ...templatesData, information: generatedName });
    }
    
    const generatedTemplate = generateTemplate(uploadType, null, selectedLanguage);
    setValue('computed.templates' as any, { ...templatesData, description: generatedTemplate });
  }, [uploadType, selectedLanguage, customTemplateName, setValue]);

  const templateName = customTemplateName || generateTemplateName(uploadType, null);
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

  // Generate template preview (standard template)
  const templatePreview = generateStandardWikiPortraitsTemplate();

  const year = eventDetails?.date ? getYearFromDate(eventDetails.date) : new Date().getFullYear().toString();

  // Generate usage example
  const templateUsageExample = eventDetails?.title
    ? generateTemplateParameters(eventDetails, year)
    : `{{WikiPortraits_uploader|event=EventName|year=2025|lang=en|page=EventName}}`;

  return (
    <div className="space-y-6">
      <div className="text-center">
        <FileText className="w-12 h-12 mx-auto mb-4 text-primary" />
        <h2 className="text-2xl font-bold text-card-foreground mb-2">WikiPortraits Template</h2>
        <p className="text-muted-foreground">
          Manage WikiPortraits event template for {eventDetails?.title || 'your event'}
        </p>
      </div>

      {/* WikiPortraits Template Status */}
      {isWikiPortraitsJob && (
        <div className="bg-card rounded-lg border border-border p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-card-foreground">
              Template: WikiPortraits_uploader
            </h3>
            <button
              onClick={() => {
                setCheckingTemplate(true);
                checkStandardTemplateExists().then(exists => {
                  setTemplateExists(exists);
                  setCheckingTemplate(false);
                });
              }}
              disabled={checkingTemplate}
              className="flex items-center gap-2 px-3 py-2 text-sm bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${checkingTemplate ? 'animate-spin' : ''}`} />
              Check Status
            </button>
          </div>

          {/* Status indicator */}
          {checkingTemplate ? (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-800">Checking if template exists on Commons...</p>
            </div>
          ) : templateExists ? (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-start gap-2">
                <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-green-800">Standard template exists on Commons</p>
                  <p className="text-xs text-green-700 mt-1">
                    The WikiPortraits template is ready to use for all events
                  </p>
                  <a
                    href="https://commons.wikimedia.org/wiki/Template:WikiPortraits_uploader"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-green-600 hover:text-green-800 mt-2"
                  >
                    View on Commons
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <div className="flex items-start gap-2 mb-3">
                <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-amber-800">Template needs to be created</p>
                  <p className="text-xs text-amber-700 mt-1">
                    This template will be created in the Publish pane
                  </p>
                </div>
              </div>

              {/* Template preview */}
              <div className="mt-3">
                <p className="text-xs font-semibold text-gray-700 mb-2">Template content:</p>
                <pre className="bg-white border border-amber-300 rounded p-3 text-xs overflow-x-auto">
                  {templatePreview}
                </pre>
              </div>

              {/* Usage example */}
              <div className="mt-3 bg-blue-50 border border-blue-200 rounded p-3">
                <p className="text-xs font-semibold text-blue-800 mb-1">Usage in images for {eventDetails?.title || 'this event'}:</p>
                <code className="text-xs text-blue-900 block">
                  {templateUsageExample}
                </code>
                <p className="text-xs text-blue-700 mt-2">
                  This will be automatically added to all your images
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {!isWikiPortraitsJob && (
        <div className="bg-muted/30 border border-border rounded-lg p-6 text-center">
          <p className="text-muted-foreground">
            WikiPortraits templates are only used for WikiPortraits assignments.
          </p>
        </div>
      )}

      {/* Language Selection */}
      <div className="flex justify-center">
        <div className="flex items-center space-x-2">
          <label className="text-sm font-medium text-card-foreground">Wikipedia Language:</label>
          <select
            value={selectedLanguage}
            onChange={(e) => {}}
            className="px-3 py-1 bg-background border border-border rounded-lg text-sm"
          >
            {languages.map((lang) => (
              <option key={lang.code} value={lang.code}>
                {lang.name}
              </option>
            ))}
          </select>
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
        <input
          type="text"
          value={customTemplateName}
          onChange={(e) => {}}
          className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm font-mono"
          placeholder="e.g. WikiPortraits Event Name"
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
            <textarea
              value={(templatesData as any)?.description || ''}
              onChange={(e) => {}}
              className="w-full h-32 px-3 py-2 bg-background border border-border rounded-lg text-sm font-mono resize-y"
              placeholder="Template code will be generated automatically..."
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
          onClick={onCompleteAction}
          className="px-6 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg transition-colors"
        >
          Template Ready - Continue to Wikidata
        </button>
      </div>
    </div>
  );
}