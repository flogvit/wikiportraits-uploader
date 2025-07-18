'use client';

import { useCallback, useEffect } from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ImageFile } from '@/types';
import { SoccerMatchMetadata, SoccerPlayer } from '../../forms/SoccerMatchForm';
import SoccerMatchForm from '../../forms/SoccerMatchForm';
import FileDropzone from '../../upload/FileDropzone';
import { FileProcessor } from '../../upload/FileProcessor';
import { useDuplicateHandler } from '../../upload/DuplicateHandler';
import DuplicateWarningModal from '../../modals/DuplicateWarningModal';

// Schema for the soccer match form
const soccerFormSchema = z.object({
  soccerMatchData: z.object({
    homeTeam: z.object({
      id: z.string(),
      name: z.string(),
      country: z.string().optional(),
      league: z.string().optional(),
      wikipediaUrl: z.string().optional(),
    }).nullable(),
    awayTeam: z.object({
      id: z.string(),
      name: z.string(),
      country: z.string().optional(),
      league: z.string().optional(),
      wikipediaUrl: z.string().optional(),
    }).nullable(),
    date: z.string(),
    venue: z.string(),
    competition: z.string(),
    matchday: z.string().optional(),
    result: z.string().optional(),
  }).nullable(),
  selectedPlayers: z.array(z.object({
    id: z.string(),
    name: z.string(),
    position: z.string().optional(),
    number: z.string().optional(),
    team: z.string(),
    wikipediaUrl: z.string().optional(),
  })),
});

type SoccerFormData = z.infer<typeof soccerFormSchema>;

interface SoccerMatchWorkflowProps {
  onMatchDataUpdate: (matchData: SoccerMatchMetadata, players: SoccerPlayer[]) => void;
  onImagesAdded: (images: ImageFile[]) => void;
  existingImages: ImageFile[];
}

export default function SoccerMatchWorkflow({
  onMatchDataUpdate,
  onImagesAdded,
  existingImages
}: SoccerMatchWorkflowProps) {
  const methods = useForm<SoccerFormData>({
    resolver: zodResolver(soccerFormSchema),
    defaultValues: {
      soccerMatchData: {
        homeTeam: null,
        awayTeam: null,
        date: '',
        venue: '',
        competition: '',
        matchday: '',
        result: ''
      },
      selectedPlayers: []
    }
  });

  const { watch } = methods;
  const soccerMatchData = watch('soccerMatchData');
  const selectedPlayers = watch('selectedPlayers');

  const {
    duplicates,
    showDuplicateModal,
    checkForDuplicates,
    handleDuplicateDecision,
    closeDuplicateModal
  } = useDuplicateHandler(existingImages);

  // Update parent when form data changes
  useEffect(() => {
    if (soccerMatchData && soccerMatchData.homeTeam && soccerMatchData.awayTeam) {
      onMatchDataUpdate(soccerMatchData, selectedPlayers);
    }
  }, [soccerMatchData, selectedPlayers, onMatchDataUpdate]);

  const handleFilesSelected = useCallback(async (files: File[]) => {
    if (files.length === 0) return;

    // Create file processor
    const processor = FileProcessor.createProcessor({
      uploadType: 'soccer',
      soccerMatchData,
      selectedPlayers,
      musicEventData: null
    });

    // Process files to ImageFile objects
    const imageFiles = await processor.createImageFiles(files);

    // Check for duplicates
    const hasDuplicates = checkForDuplicates(imageFiles);
    
    if (!hasDuplicates) {
      onImagesAdded(imageFiles);
    }
  }, [soccerMatchData, selectedPlayers, checkForDuplicates, onImagesAdded]);

  const handleDuplicateConfirm = (addAll: boolean) => {
    const imagesToAdd = handleDuplicateDecision(addAll);
    if (imagesToAdd.length > 0) {
      onImagesAdded(imagesToAdd);
    }
  };

  const isMatchDataComplete = soccerMatchData && 
    soccerMatchData.homeTeam && 
    soccerMatchData.awayTeam && 
    soccerMatchData.date && 
    soccerMatchData.venue && 
    soccerMatchData.competition;

  return (
    <FormProvider {...methods}>
      <div className="space-y-6">
        <div className="bg-card rounded-lg border border-border p-6">
          <h2 className="text-xl font-semibold text-card-foreground mb-4">
            Soccer Match Setup
          </h2>
          <p className="text-muted-foreground mb-6">
            Configure match details and select players before uploading images.
          </p>
          
          <SoccerMatchForm />
        </div>

        {isMatchDataComplete && (
          <div className="space-y-4">
            <div className="bg-success/10 border border-success/20 rounded-lg p-4">
              <div className="flex items-center">
                <div className="w-2 h-2 bg-success rounded-full mr-3"></div>
                <div>
                  <p className="text-success font-medium">Match Setup Complete</p>
                  <p className="text-success/80 text-sm">
                    {soccerMatchData.homeTeam?.name} vs {soccerMatchData.awayTeam?.name} - You can now upload images.
                  </p>
                </div>
              </div>
            </div>
            
            <FileDropzone onFilesSelected={handleFilesSelected} />
            
            <DuplicateWarningModal
              isOpen={showDuplicateModal}
              onClose={closeDuplicateModal}
              duplicates={duplicates}
              onConfirm={handleDuplicateConfirm}
            />
          </div>
        )}
      </div>
    </FormProvider>
  );
}