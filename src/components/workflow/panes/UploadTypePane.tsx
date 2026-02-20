'use client';

import {
  Camera,
  Music,
  Users,
  FileImage,
  CheckCircle,
  ArrowRight,
  Award,
  Film,
  Mic2,
  Briefcase,
  Trophy,
  Palette,
  Megaphone
} from 'lucide-react';
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
    disabled: true,
    features: [
      'Basic metadata entry',
      'Standard categorization',
      'Simple upload workflow'
    ]
  },
  {
    id: 'music' as UploadType,
    title: 'Music Event',
    description: 'Festivals, concerts, and music performances',
    icon: Music,
    color: 'hover:border-blue-300 hover:bg-blue-25',
    disabled: false,
    features: [
      'Festival and concert support',
      'Band and performer categorization',
      'Event-specific metadata'
    ]
  },
  {
    id: 'awards' as const,
    title: 'Awards & Ceremonies',
    description: 'Nobel Prize, Oscars, Grammys, and other award events',
    icon: Award,
    color: 'hover:border-yellow-300 hover:bg-yellow-25',
    disabled: true,
    features: [
      'Award ceremony categorization',
      'Winner and nominee tagging',
      'Event-specific metadata'
    ]
  },
  {
    id: 'red-carpet' as const,
    title: 'Red Carpet Events',
    description: 'Movie premieres, fashion shows, and galas',
    icon: Film,
    color: 'hover:border-red-300 hover:bg-red-25',
    disabled: true,
    features: [
      'Celebrity identification',
      'Fashion and style metadata',
      'Event location tracking'
    ]
  },
  {
    id: 'press' as const,
    title: 'Press Conferences',
    description: 'Political, movie, and product press conferences',
    icon: Mic2,
    color: 'hover:border-blue-300 hover:bg-blue-25',
    disabled: true,
    features: [
      'Speaker identification',
      'Topic and subject tagging',
      'Organization categorization'
    ]
  },
  {
    id: 'sports' as const,
    title: 'Sports Events',
    description: 'Soccer, Olympics, tennis, and other sporting events',
    icon: Trophy,
    color: 'hover:border-green-300 hover:bg-green-25',
    disabled: true,
    features: [
      'Team and player tagging',
      'Match-specific categories',
      'League and tournament support'
    ]
  },
  {
    id: 'production' as const,
    title: 'Film & TV Production',
    description: 'Movie shoots, TV filming, and behind-the-scenes',
    icon: Film,
    color: 'hover:border-purple-300 hover:bg-purple-25',
    disabled: true,
    features: [
      'Production crew tagging',
      'Scene and location metadata',
      'Cast and character info'
    ]
  },
  {
    id: 'political' as const,
    title: 'Political Events',
    description: 'Rallies, debates, summits, and campaigns',
    icon: Megaphone,
    color: 'hover:border-indigo-300 hover:bg-indigo-25',
    disabled: true,
    features: [
      'Politician identification',
      'Party and organization tags',
      'Event and topic categorization'
    ]
  },
  {
    id: 'cultural' as const,
    title: 'Cultural Events',
    description: 'Theatre, opera, art exhibitions, and performances',
    icon: Palette,
    color: 'hover:border-pink-300 hover:bg-pink-25',
    disabled: true,
    features: [
      'Artist and performer tagging',
      'Venue and production metadata',
      'Cultural event categorization'
    ]
  },
  {
    id: 'corporate' as const,
    title: 'Corporate Events',
    description: 'Tech conferences, product launches, business meetings',
    icon: Briefcase,
    color: 'hover:border-slate-300 hover:bg-slate-25',
    disabled: true,
    features: [
      'Company and speaker tagging',
      'Product and technology metadata',
      'Industry categorization'
    ]
  },
  {
    id: 'portraits' as const,
    title: 'Portrait Session',
    description: 'Professional portrait photography sessions',
    icon: Camera,
    color: 'hover:border-orange-300 hover:bg-orange-25',
    disabled: true,
    features: [
      'Enhanced portrait metadata',
      'Person identification tools',
      'Professional session support'
    ]
  }
];

export default function UploadTypePane({ onComplete }: UploadTypePaneProps) {
  const { watch, setValue } = useUniversalForm();
  
  const workflowType = watch('workflowType');
  const selectedUploadType = workflowType === 'music-event' ? 'music' :
                            workflowType === 'soccer-match' ? 'sports' :
                            workflowType === 'portraits' ? 'portraits' :
                            workflowType === 'general-upload' ? 'general' : undefined;

  const handleUploadTypeSelect = (uploadType: UploadType) => {
    if (uploadType === 'music') {
      setValue('workflowType', 'music-event');
    } else if (uploadType === 'sports') {
      setValue('workflowType', 'soccer-match' as any);
    } else if (uploadType === 'portraits') {
      setValue('workflowType', 'portraits');
    } else {
      setValue('workflowType', 'general-upload');
    }
    
    // Auto-advance to next step
    onComplete?.();
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-w-7xl mx-auto">
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
              <div className="flex items-center justify-between mb-3">
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
                  <div>
                    <h3 className={`text-xl font-semibold ${
                      isDisabled
                        ? 'text-gray-500'
                        : isSelected
                          ? 'text-primary'
                          : 'text-card-foreground'
                    }`}>
                      {type.title}
                    </h3>
                    {isDisabled && (
                      <div className="text-xs text-gray-500 font-medium mt-0.5">
                        Coming Soon
                      </div>
                    )}
                  </div>
                </div>
                {isSelected && !isDisabled && (
                  <CheckCircle className="w-6 h-6 text-primary" />
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

              {/* Feature list */}
              <ul className={`text-xs space-y-1 ${
                isDisabled
                  ? 'text-gray-400'
                  : isSelected
                    ? 'text-primary/70'
                    : 'text-muted-foreground'
              }`}>
                {type.features.map((feature, idx) => (
                  <li key={idx}>• {feature}</li>
                ))}
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