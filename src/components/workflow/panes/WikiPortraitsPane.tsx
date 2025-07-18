'use client';

import { useFormContext } from 'react-hook-form';
import { Camera, Globe, CheckCircle } from 'lucide-react';
import { WorkflowFormData } from '../providers/WorkflowFormProvider';

interface WikiPortraitsPaneProps {
  onComplete?: () => void;
}

export default function WikiPortraitsPane({
  onComplete
}: WikiPortraitsPaneProps) {
  const { watch, setValue } = useFormContext<WorkflowFormData>();
  
  const wikiPortraits = watch('wikiPortraits');
  const eventType = watch('eventType');
  
  const handleWorkflowChoice = (isWikiPortraitsJob: boolean) => {
    setValue('wikiPortraits.isWikiPortraitsJob', isWikiPortraitsJob);
    
    // If choosing WikiPortraits for music events, also set the concert category flag
    if (isWikiPortraitsJob && (eventType === 'festival' || eventType === 'concert')) {
      setValue('wikiPortraits.addToWikiPortraitsConcerts', true);
    } else {
      setValue('wikiPortraits.addToWikiPortraitsConcerts', false);
    }
  };

  const canComplete = wikiPortraits.isWikiPortraitsJob !== undefined;

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-card-foreground mb-2">Upload Workflow</h2>
        <p className="text-muted-foreground">
          Choose whether this is a WikiPortraits assignment or a general Wikimedia Commons upload
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* WikiPortraits Option */}
        <div 
          className={`border-2 rounded-lg p-6 cursor-pointer transition-all duration-200 ${
            wikiPortraits.isWikiPortraitsJob === true
              ? 'border-blue-500 bg-blue-50 shadow-lg'
              : 'border-gray-200 hover:border-blue-300 hover:bg-blue-25'
          }`}
          onClick={() => handleWorkflowChoice(true)}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Camera className="w-8 h-8 text-blue-600" />
              <h3 className="text-lg font-semibold text-gray-900">WikiPortraits Assignment</h3>
            </div>
            {wikiPortraits.isWikiPortraitsJob === true && (
              <CheckCircle className="w-6 h-6 text-blue-600" />
            )}
          </div>
          
          <div className="space-y-3 text-sm text-gray-600">
            <p>✓ Professional photography assignment</p>
            <p>✓ Automatic WikiPortraits categorization</p>
            <p>✓ Enhanced metadata and attribution</p>
            <p>✓ Integration with WikiPortraits workflows</p>
            {(eventType === 'festival' || eventType === 'concert') && (
              <p>✓ Added to "Category:WikiPortraits at Concerts"</p>
            )}
          </div>
        </div>

        {/* Wikimedia Commons Option */}
        <div 
          className={`border-2 rounded-lg p-6 cursor-pointer transition-all duration-200 ${
            wikiPortraits.isWikiPortraitsJob === false
              ? 'border-green-500 bg-green-50 shadow-lg'
              : 'border-gray-200 hover:border-green-300 hover:bg-green-25'
          }`}
          onClick={() => handleWorkflowChoice(false)}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Globe className="w-8 h-8 text-green-600" />
              <h3 className="text-lg font-semibold text-gray-900">Wikimedia Commons</h3>
            </div>
            {wikiPortraits.isWikiPortraitsJob === false && (
              <CheckCircle className="w-6 h-6 text-green-600" />
            )}
          </div>
          
          <div className="space-y-3 text-sm text-gray-600">
            <p>✓ General community upload</p>
            <p>✓ Standard Commons categorization</p>
            <p>✓ Basic metadata and licensing</p>
            <p>✓ Open contribution workflow</p>
          </div>
        </div>
      </div>

      {canComplete && (
        <div className="text-center">
          <button
            onClick={() => onComplete?.()}
            className="px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
          >
            {wikiPortraits.isWikiPortraitsJob ? 'Continue with WikiPortraits Workflow' : 'Continue with Commons Workflow'}
          </button>
        </div>
      )}
    </div>
  );
}