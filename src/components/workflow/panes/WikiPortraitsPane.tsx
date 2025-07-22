'use client';

import { Camera, Globe, CheckCircle, ArrowRight } from 'lucide-react';
import { useUniversalForm } from '@/providers/UniversalFormProvider';

interface WikiPortraitsPaneProps {
  onComplete?: () => void;
}

export default function WikiPortraitsPane({
  onComplete
}: WikiPortraitsPaneProps) {
  const { watch, setValue } = useUniversalForm();
  
  const workflowType = watch('workflowType');
  const isWikiPortraitsJob = watch('isWikiPortraitsJob');
  
  const handleWorkflowChoice = (isWikiPortraitsChoice: boolean) => {
    setValue('isWikiPortraitsJob', isWikiPortraitsChoice);
    // Auto-advance to next step immediately
    onComplete?.();
  };

  const canComplete = isWikiPortraitsJob !== undefined;

  // Get the display title based on selection
  const getWorkflowTitle = () => {
    if (isWikiPortraitsJob === true) return 'WikiPortraits Assignment';
    if (isWikiPortraitsJob === false) return 'Wikimedia Commons';
    return 'Upload Workflow';
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-card-foreground mb-2">{getWorkflowTitle()}</h2>
        <p className="text-muted-foreground">
          {isWikiPortraitsJob === undefined 
            ? 'Choose whether this is a WikiPortraits assignment or a general Wikimedia Commons upload'
            : `You selected: ${isWikiPortraitsJob ? 'WikiPortraits Assignment' : 'Wikimedia Commons'}`
          }
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* WikiPortraits Option */}
        <div 
          className={`border-2 rounded-lg p-6 cursor-pointer transition-all duration-200 ${
            isWikiPortraitsJob === true
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
            {isWikiPortraitsJob === true && (
              <CheckCircle className="w-6 h-6 text-blue-600" />
            )}
          </div>
          
          <div className="space-y-3 text-sm text-gray-600">
            <p>✓ Professional photography assignment</p>
            <p>✓ Automatic WikiPortraits categorization</p>
            <p>✓ Enhanced metadata and attribution</p>
            <p>✓ Integration with WikiPortraits workflows</p>
            {workflowType === 'music-event' && (
              <p>✓ Added to "Category:WikiPortraits at music events"</p>
            )}
            {workflowType === 'soccer-match' && (
              <p>✓ Added to "Category:WikiPortraits at sporting events"</p>
            )}
            {workflowType && workflowType !== 'music-event' && workflowType !== 'soccer-match' && (
              <p>✓ Added to relevant WikiPortraits categories</p>
            )}
          </div>
        </div>

        {/* Wikimedia Commons Option */}
        <div 
          className={`border-2 rounded-lg p-6 cursor-pointer transition-all duration-200 ${
            isWikiPortraitsJob === false
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
            {isWikiPortraitsJob === false && (
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
            onClick={onComplete}
            className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium"
          >
            Continue to Next Step
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}