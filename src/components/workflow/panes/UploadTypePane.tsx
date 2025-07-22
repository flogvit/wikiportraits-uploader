'use client';

import { Camera, Music, Users, FileImage, CheckCircle, ArrowRight } from 'lucide-react';
import { useUniversalForm } from '@/providers/UniversalFormProvider';
import { UploadType } from '@/types/upload';

interface UploadTypePaneProps {
  onComplete?: () => void;
}

const uploadTypes = [
  {
    id: 'general' as const,
    title: 'General Upload',
    description: 'Standard WikiPortraits upload with basic metadata',
    icon: FileImage,
    color: 'hover:border-gray-300 hover:bg-gray-25',
    disabled: true
  },
  {
    id: 'soccer' as const,
    title: 'Soccer Match',
    description: 'Upload players from a soccer match with team tagging',
    icon: Users,
    color: 'hover:border-emerald-300 hover:bg-emerald-25',
    disabled: true
  },
  {
    id: 'music' as UploadType,
    title: 'Music Event',
    description: 'Upload musicians and performers from an event',
    icon: Music,
    color: 'hover:border-blue-300 hover:bg-blue-25',
    disabled: false
  },
  {
    id: 'portraits' as const,
    title: 'Portrait Session',
    description: 'Upload portrait photos with enhanced metadata',
    icon: Camera,
    color: 'hover:border-purple-300 hover:bg-purple-25',
    disabled: true
  }
];

export default function UploadTypePane({ onComplete }: UploadTypePaneProps) {
  const { watch, setValue } = useUniversalForm();
  
  const workflowType = watch('workflowType');
  const selectedUploadType = workflowType === 'music-event' ? 'music' : 
                            workflowType === 'soccer-match' ? 'soccer' : 
                            workflowType === 'portrait-session' ? 'portraits' : 
                            workflowType === 'general-upload' ? 'general' : undefined;

  const handleUploadTypeSelect = (uploadType: UploadType) => {
    if (uploadType === 'music') {
      setValue('workflowType', 'music-event');
    } else if (uploadType === 'soccer') {
      setValue('workflowType', 'soccer-match');
    } else if (uploadType === 'portraits') {
      setValue('workflowType', 'portrait-session');
    } else {
      setValue('workflowType', 'general-upload');
    }
    
    // Auto-advance to next step
    onComplete?.();
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <FileImage className="w-12 h-12 text-primary mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-card-foreground mb-2">Choose Upload Type</h2>
        <p className="text-muted-foreground">
          Select the type of content you want to upload to Wikimedia Commons
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
        {uploadTypes.map((type) => {
          const Icon = type.icon;
          const isSelected = selectedUploadType === type.id;
          const isDisabled = type.disabled;
          
          return (
            <button
              key={type.id}
              onClick={() => !isDisabled && handleUploadTypeSelect(type.id as UploadType)}
              disabled={isDisabled}
              className={`p-6 border-2 rounded-lg text-left transition-all duration-200 ${
                isDisabled 
                  ? 'opacity-50 cursor-not-allowed border-gray-200 bg-gray-50' 
                  : isSelected 
                    ? 'border-primary bg-primary/10 shadow-md' 
                    : `border-border ${type.color}`
              }`}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <Icon 
                    className={`w-12 h-12 ${
                      isDisabled 
                        ? 'text-gray-400' 
                        : isSelected 
                          ? 'text-primary' 
                          : 'text-muted-foreground'
                    }`} 
                  />
                  <h3 className={`text-xl font-semibold ${
                    isDisabled 
                      ? 'text-gray-500' 
                      : isSelected 
                        ? 'text-primary' 
                        : 'text-card-foreground'
                  }`}>
                    {type.title}
                  </h3>
                </div>
                {isSelected && !isDisabled && (
                  <CheckCircle className="w-6 h-6 text-primary" />
                )}
                {isDisabled && (
                  <div className="text-xs text-gray-500 font-medium">
                    Coming Soon
                  </div>
                )}
              </div>
              
              <p className={`text-sm mb-3 ${
                isDisabled 
                  ? 'text-gray-400' 
                  : isSelected 
                    ? 'text-primary/80' 
                    : 'text-muted-foreground'
              }`}>
                {type.description}
              </p>

              {/* Add feature list based on type */}
              <ul className={`text-xs space-y-1 ${
                isDisabled 
                  ? 'text-gray-400' 
                  : isSelected 
                    ? 'text-primary/70' 
                    : 'text-muted-foreground'
              }`}>
                {type.id === 'music' && (
                  <>
                    <li>• Festival and concert support</li>
                    <li>• Band and performer categorization</li>
                    <li>• Event-specific metadata</li>
                  </>
                )}
                {type.id === 'soccer' && (
                  <>
                    <li>• Team and player tagging</li>
                    <li>• Match-specific categories</li>
                    <li>• League and tournament support</li>
                  </>
                )}
                {type.id === 'portraits' && (
                  <>
                    <li>• Enhanced portrait metadata</li>
                    <li>• Person identification tools</li>
                    <li>• Professional session support</li>
                  </>
                )}
                {type.id === 'general' && (
                  <>
                    <li>• Basic metadata entry</li>
                    <li>• Standard categorization</li>
                    <li>• Simple upload workflow</li>
                  </>
                )}
              </ul>
            </button>
          );
        })}
      </div>

      {selectedUploadType && (
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