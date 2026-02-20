'use client';

import React, { useState } from 'react';
import { CheckCircle, AlertCircle, Clock, FileText } from 'lucide-react';
import { logger } from '@/utils/logger';
import { useUniversalForm, useUniversalFormFiles } from '@/providers/UniversalFormProvider';
import { generateTemplateName, generateTemplate } from '@/utils/template-generator';


interface UploadPaneProps {
  onComplete: () => void;
}

type UploadStep = 'template' | 'images' | 'complete';
type StepStatus = 'pending' | 'in-progress' | 'completed' | 'error';

interface UploadStepInfo {
  id: UploadStep;
  title: string;
  description: string;
  status: StepStatus;
}

export default function UploadPane({
  onComplete
}: UploadPaneProps) {
  const form = useUniversalForm();
  const { queue: images } = useUniversalFormFiles();
  
  // Get data from the universal form structure
  const workflowType = form.watch('workflowType');
  const eventDetails = form.watch('eventDetails');
  const publishingStatus = form.watch('publishing.status');
  const publishingActions = form.watch('publishing.actions');
  
  // Create temporary upload state since it's not in UniversalFormData yet
  const [uploadState, setUploadState] = React.useState({
    currentStep: 'template' as UploadStep,
    stepStatuses: {
      template: 'pending' as StepStatus,
      images: 'pending' as StepStatus,
      complete: 'pending' as StepStatus
    },
    templateCreated: false,
    uploadProgress: 0,
    currentUploadIndex: 0
  });
  
  const { currentStep, stepStatuses, templateCreated, uploadProgress, currentUploadIndex } = uploadState;

  // Convert UniversalFormData to old format for template generation
  const musicEventData = workflowType === 'music-event' ? {
    eventType: 'concert' as const,
    concertData: {
      concert: {
        artist: eventDetails?.mainBand ? {
          name: eventDetails.mainBand.labels?.en?.value || 'Unknown Artist',
          id: eventDetails.mainBand.id
        } : undefined,
        venue: eventDetails?.venue ? {
          name: eventDetails.venue.labels?.en?.value || 'Unknown Venue'
        } : undefined,
        date: eventDetails?.date
      }
    }
  } : undefined;

  // Map workflow types
  const uploadType = workflowType === 'music-event' ? 'music' :
                     workflowType === 'soccer-match' ? 'general' : 'general';

  const templateName = generateTemplateName(uploadType, musicEventData as any);
  const templateCode = generateTemplate(uploadType, musicEventData as any);
  const templateUrl = `https://commons.wikimedia.org/wiki/Template:${encodeURIComponent(templateName)}`;

  const uploadSteps: UploadStepInfo[] = [
    {
      id: 'template',
      title: 'Create Template',
      description: `Create ${templateName} template`,
      status: stepStatuses.template
    },
    {
      id: 'images',
      title: 'Publish Images',
      description: `Publish ${images?.length || 0} image(s)`,
      status: stepStatuses.images
    },
    {
      id: 'complete',
      title: 'Complete',
      description: 'Publishing finished',
      status: stepStatuses.complete
    }
  ];

  const updateStepStatus = (step: UploadStep, status: StepStatus) => {
    setUploadState(prev => ({
      ...prev,
      stepStatuses: { ...prev.stepStatuses, [step]: status }
    }));
  };

  const getStatusIcon = (status: StepStatus) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'in-progress':
        return <Clock className="w-5 h-5 text-blue-500 animate-pulse" />;
      case 'error':
        return <AlertCircle className="w-5 h-5 text-destructive" />;
      default:
        return <Clock className="w-5 h-5 text-muted-foreground" />;
    }
  };

  const createTemplate = async () => {
    if (uploadType === 'general' || templateCreated) {
      // Skip template creation for general uploads or if already created
      updateStepStatus('template', 'completed');
      setUploadState(prev => ({ ...prev, currentStep: 'images' }));
      return;
    }

    updateStepStatus('template', 'in-progress');
    
    try {
      const response = await fetch('/api/commons/create-template', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          templateName,
          templateCode,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create template');
      }

      const result = await response.json();
      logger.info('UploadPane', 'Template creation result', result);
      
      setUploadState(prev => ({
        ...prev,
        templateCreated: true,
        currentStep: 'images'
      }));
      updateStepStatus('template', 'completed');
      
    } catch (error) {
      logger.error('UploadPane', 'Template creation failed', error);
      updateStepStatus('template', 'error');
    }
  };

  const uploadImages = async () => {
    updateStepStatus('images', 'in-progress');
    
    try {
      // See GitHub issue #6
      // For now, simulate upload progress
      for (let i = 0; i < (images?.length || 0); i++) {
        setUploadState(prev => ({
          ...prev,
          currentUploadIndex: i,
          uploadProgress: (i / (images?.length || 1)) * 100
        }));
        
        // Simulate upload delay
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      setUploadState(prev => ({
        ...prev,
        uploadProgress: 100,
        currentStep: 'complete'
      }));
      updateStepStatus('images', 'completed');
      updateStepStatus('complete', 'completed');
      
    } catch (error) {
      logger.error('UploadPane', 'Image upload failed', error);
      updateStepStatus('images', 'error');
    }
  };

  const startUpload = async () => {
    await createTemplate();
    if (stepStatuses.template === 'completed') {
      await uploadImages();
    }
  };

  if ((images?.length || 0) === 0) {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <div className="text-6xl mb-4">⬆️</div>
          <h3 className="text-xl font-semibold text-card-foreground mb-2">Publish</h3>
          <p className="text-muted-foreground">
            Publish your images to Wikimedia Commons
          </p>
        </div>
        
        <div className="bg-warning/10 border border-warning/20 rounded-lg p-4">
          <p className="text-warning font-medium">⚠️ No Images Added</p>
          <p className="text-muted-foreground text-sm mt-1">
            Please add images in the Images step before publishing.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="text-6xl mb-4">⬆️</div>
        <h3 className="text-xl font-semibold text-card-foreground mb-2">Publish to Commons</h3>
        <p className="text-muted-foreground">
          Create templates and publish {images?.length || 0} image(s) to Wikimedia Commons
        </p>
      </div>

      {/* Upload Steps Progress */}
      <div className="bg-card rounded-lg border border-border p-6">
        <h4 className="text-lg font-semibold text-card-foreground mb-4">Publishing Progress</h4>
        <div className="space-y-3">
          {uploadSteps.map((step, index) => (
            <div
              key={step.id}
              className={`flex items-center p-3 rounded-lg ${
                currentStep === step.id
                  ? 'bg-primary/10 border border-primary'
                  : 'bg-muted/50'
              }`}
            >
              <div className="flex-shrink-0 mr-3">
                {getStatusIcon(step.status)}
              </div>
              <div className="flex-1">
                <div className="font-medium text-card-foreground">{step.title}</div>
                <div className="text-sm text-muted-foreground">{step.description}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Template Information */}
      {uploadType !== 'general' && (
        <div className="bg-info/10 border border-info/20 rounded-lg p-4">
          <div className="flex items-center space-x-2 mb-2">
            <FileText className="h-5 w-5 text-info" />
            <h4 className="text-info font-semibold">Template Creation</h4>
          </div>
          <p className="text-sm text-muted-foreground mb-2">
            Will create template: <strong>{templateName}</strong>
          </p>
          <a 
            href={templateUrl} 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-sm text-primary hover:text-primary/80"
          >
            View template page on Commons →
          </a>
        </div>
      )}

      {/* Upload Progress */}
      {stepStatuses.images === 'in-progress' && (
        <div className="bg-card rounded-lg border border-border p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Publishing Images</span>
            <span className="text-sm text-muted-foreground">
              {currentUploadIndex + 1} / {images?.length || 0}
            </span>
          </div>
          <div className="w-full bg-muted rounded-full h-2">
            <div 
              className="bg-primary h-2 rounded-full transition-all duration-300"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            Currently publishing: Image {currentUploadIndex + 1}
          </p>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex justify-center space-x-4">
        {stepStatuses.complete !== 'completed' && (
          <button
            onClick={startUpload}
            disabled={stepStatuses.template === 'in-progress' || stepStatuses.images === 'in-progress'}
            className="px-6 py-2 bg-primary hover:bg-primary/90 disabled:bg-primary/50 text-primary-foreground rounded-lg transition-colors"
          >
            {stepStatuses.template === 'in-progress' || stepStatuses.images === 'in-progress'
              ? 'Publishing...'
              : 'Start Publishing'
            }
          </button>
        )}
        
        {stepStatuses.complete === 'completed' && (
          <button
            onClick={onComplete}
            className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
          >
            Publishing Complete ✅
          </button>
        )}
      </div>
    </div>
  );
}