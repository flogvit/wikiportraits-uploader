'use client';

import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, Image as ImageIcon } from 'lucide-react';
import { ImageFile } from '@/app/page';
import { detectDuplicates, DuplicateInfo } from '@/utils/duplicate-detection';
import DuplicateWarningModal from './DuplicateWarningModal';
import { UploadType } from './UploadTypeSelector';
import SoccerMatchWorkflow, { SoccerMatchMetadata, SoccerPlayer } from './SoccerMatchWorkflow';
import { generateSoccerCategories, generateMatchDescription } from '@/utils/soccer-categories';
import MusicEventWorkflow from './MusicEventWorkflow';
import { MusicEventMetadata } from '@/types/music';
import { generateMusicCategories, generateEventDescription } from '@/utils/music-categories';

interface ImageUploaderProps {
  onImagesAdded: (images: ImageFile[]) => void;
  existingImages: ImageFile[];
  uploadType: UploadType;
  onSoccerDataUpdate?: (matchData: SoccerMatchMetadata, players: SoccerPlayer[]) => void;
  onMusicEventUpdate?: (eventData: MusicEventMetadata) => void;
}

export default function ImageUploader({ onImagesAdded, existingImages, uploadType, onSoccerDataUpdate, onMusicEventUpdate }: ImageUploaderProps) {
  const [duplicates, setDuplicates] = useState<DuplicateInfo[]>([]);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [soccerMatchData, setSoccerMatchData] = useState<SoccerMatchMetadata | null>(null);
  const [selectedPlayers, setSelectedPlayers] = useState<SoccerPlayer[]>([]);
  const [musicEventData, setMusicEventData] = useState<MusicEventMetadata | null>(null);

  const createImageFiles = (files: File[]): ImageFile[] => {
    return files.map(file => {
      const baseMetadata = {
        description: '',
        author: '',
        date: new Date().toISOString().split('T')[0],
        source: 'self-made',
        license: 'CC-BY-SA-4.0',
        categories: [] as string[],
        wikiPortraitsEvent: ''
      };

      // Add soccer-specific metadata and categories if in soccer mode
      if (uploadType === 'soccer' && soccerMatchData) {
        const soccerCategories = generateSoccerCategories({
          matchData: soccerMatchData,
          selectedPlayers: selectedPlayers
        });
        
        const matchDescription = generateMatchDescription(soccerMatchData);
        
        return {
          id: crypto.randomUUID(),
          file,
          preview: URL.createObjectURL(file),
          metadata: {
            ...baseMetadata,
            description: matchDescription,
            categories: soccerCategories,
            wikiPortraitsEvent: `Soccer Match: ${soccerMatchData.homeTeam?.name || 'Unknown'} vs ${soccerMatchData.awayTeam?.name || 'Unknown'}`,
            soccerMatch: soccerMatchData.homeTeam && soccerMatchData.awayTeam ? {
              homeTeam: soccerMatchData.homeTeam.name,
              awayTeam: soccerMatchData.awayTeam.name,
              date: soccerMatchData.date,
              venue: soccerMatchData.venue,
              competition: soccerMatchData.competition,
              result: soccerMatchData.result
            } : undefined
          }
        };
      }

      // Add music-specific metadata and categories if in music mode
      if (uploadType === 'music' && musicEventData) {
        const musicCategories = generateMusicCategories({
          eventData: musicEventData
        });
        
        const eventDescription = generateEventDescription(musicEventData);
        
        let eventName = '';
        if (musicEventData.eventType === 'festival' && musicEventData.festivalData) {
          const festival = musicEventData.festivalData.festival;
          eventName = `Festival: ${festival.name} ${festival.year}`;
        } else if (musicEventData.eventType === 'concert' && musicEventData.concertData) {
          const concert = musicEventData.concertData.concert;
          eventName = `Concert: ${concert.artist.name}`;
        }
        
        return {
          id: crypto.randomUUID(),
          file,
          preview: URL.createObjectURL(file),
          metadata: {
            ...baseMetadata,
            description: eventDescription,
            categories: musicCategories,
            wikiPortraitsEvent: eventName,
            musicEvent: musicEventData
          }
        };
      }

      // Default metadata for other upload types
      return {
        id: crypto.randomUUID(),
        file,
        preview: URL.createObjectURL(file),
        metadata: baseMetadata
      };
    });
  };

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const imageFiles = acceptedFiles.filter(file => 
      file.type.startsWith('image/')
    );

    // Check for duplicates
    const { validFiles, duplicates: foundDuplicates } = detectDuplicates(imageFiles, existingImages);

    if (foundDuplicates.length > 0) {
      setDuplicates(foundDuplicates);
      setPendingFiles(imageFiles); // Store all files (including duplicates) for potential override
      setShowDuplicateModal(true);
    }

    // Add valid files immediately
    if (validFiles.length > 0) {
      const newImages = createImageFiles(validFiles);
      onImagesAdded(newImages);
    }
  }, [onImagesAdded, existingImages]);

  const handleAddAnyway = () => {
    // Add all pending files, including duplicates
    const newImages = createImageFiles(pendingFiles);
    onImagesAdded(newImages);
    setShowDuplicateModal(false);
    setDuplicates([]);
    setPendingFiles([]);
  };

  const handleCloseDuplicateModal = () => {
    setShowDuplicateModal(false);
    setDuplicates([]);
    setPendingFiles([]);
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.gif', '.webp']
    },
    multiple: true
  });

  return (
    <>
      {uploadType === 'soccer' && (
        <SoccerMatchWorkflow
          onMatchDataUpdate={(matchData) => {
            setSoccerMatchData(matchData);
            if (onSoccerDataUpdate) {
              onSoccerDataUpdate(matchData, selectedPlayers);
            }
          }}
          onPlayersUpdate={(players) => {
            setSelectedPlayers(players);
            if (onSoccerDataUpdate && soccerMatchData) {
              onSoccerDataUpdate(soccerMatchData, players);
            }
          }}
        />
      )}

      {uploadType === 'music' && (
        <MusicEventWorkflow
          onMusicEventUpdate={(eventData) => {
            setMusicEventData(eventData);
            if (onMusicEventUpdate) {
              onMusicEventUpdate(eventData);
            }
          }}
        />
      )}
      
      <div
        {...getRootProps()}
        className={`
          border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-all
          ${isDragActive 
            ? 'border-blue-500 bg-blue-50' 
            : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
          }
        `}
      >
        <input {...getInputProps()} />
        
        <div className="flex flex-col items-center space-y-4">
          {isDragActive ? (
            <Upload className="w-16 h-16 text-blue-500" />
          ) : (
            <ImageIcon className="w-16 h-16 text-gray-400" />
          )}
          
          <div>
            <p className="text-xl font-semibold text-gray-700 mb-2">
              {isDragActive 
                ? 'Drop the images here...' 
                : 'Drag & drop portrait images here'
              }
            </p>
            <p className="text-gray-500">
              or click to select files
            </p>
            <p className="text-sm text-gray-400 mt-2">
              Supports JPEG, PNG, GIF, WebP formats
            </p>
          </div>
        </div>
      </div>

      <DuplicateWarningModal
        duplicates={duplicates}
        isOpen={showDuplicateModal}
        onClose={handleCloseDuplicateModal}
        onAddAnyway={handleAddAnyway}
      />
    </>
  );
}