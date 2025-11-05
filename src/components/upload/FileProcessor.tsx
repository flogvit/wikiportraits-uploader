'use client';

import { ImageFile } from '@/types';
import { extractExifData, formatDateForCommons, formatTimeForCommons } from '@/utils/exif-reader';
import { generateCommonsWikitext } from '@/utils/commons-template';
import { UploadType } from '@/types/upload';
import { MusicEventMetadata } from '@/types/music';
import { generateEventDescription } from '@/utils/music-categories';
import { generateAuthorField, getCurrentPhotographerQid } from '@/utils/photographer';
import { checkImageMetadata } from '@/utils/exif-checker';

interface FileProcessorProps {
  uploadType: UploadType;
  musicEventData?: MusicEventMetadata | null;
}

export class FileProcessor {
  constructor(
    private uploadType: UploadType,
    private musicEventData?: MusicEventMetadata | null
  ) {}

  async createImageFiles(files: File[]): Promise<ImageFile[]> {
    return Promise.all(files.map(async file => {
      // Check for metadata stripping
      const metadataCheck = await checkImageMetadata(file);

      // Extract EXIF data to get actual capture date and time
      const exifData = await extractExifData(file);
      const hasExifDate = Boolean(exifData?.dateTime);
      const captureDate = hasExifDate ? formatDateForCommons(exifData!.dateTime!) : new Date().toISOString().split('T')[0];
      const captureTime = hasExifDate ? formatTimeForCommons(exifData!.dateTime!) : undefined;
      
      // Extract GPS coordinates from EXIF or use event location as fallback
      let gpsData = undefined;
      if (exifData?.gps?.latitude && exifData?.gps?.longitude) {
        gpsData = {
          latitude: exifData.gps.latitude,
          longitude: exifData.gps.longitude
        };
      }

      // Generate preview URL
      const preview = URL.createObjectURL(file);

      // Get author info from authenticated user's Q-ID
      const wikidataQid = getCurrentPhotographerQid();

      // Fetch photographer name from Wikidata
      let photographerName = undefined;
      if (wikidataQid) {
        try {
          const { getWikidataEntity } = await import('@/utils/wikidata');
          const photographerEntity = await getWikidataEntity(wikidataQid, 'en', 'labels');
          photographerName = photographerEntity.labels?.en?.value;
        } catch (error) {
          console.error('Error fetching photographer name:', error);
        }
      }

      const formattedAuthor = generateAuthorField(wikidataQid, photographerName);

      // Initial metadata based on upload type
      let initialMetadata = {
        description: '',
        author: formattedAuthor,
        wikidataQid: wikidataQid,
        date: captureDate,
        time: captureTime,
        dateFromExif: hasExifDate,
        source: 'own work',
        license: 'CC-BY-SA-4.0',
        categories: [] as string[], // Will be populated below
        wikiPortraitsEvent: 'music',
        wikitext: '',
        wikitextModified: false,
        template: '',
        metadataWarnings: metadataCheck.warnings,
        metadataStripped: metadataCheck.isStripped,
        templateModified: false,
        gps: gpsData,
      };

      // Add upload type specific metadata
      if (this.uploadType === 'music' && this.musicEventData) {
        const musicDescription = generateEventDescription(this.musicEventData);
        initialMetadata = {
          ...initialMetadata,
          description: musicDescription,
        };
      }

      const imageFile: ImageFile = {
        id: `${file.name}-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
        file,
        preview,
        metadata: initialMetadata,
      };

      // Generate initial wikitext
      imageFile.metadata.wikitext = generateCommonsWikitext(imageFile);

      return imageFile;
    }));
  }

  static createProcessor(props: FileProcessorProps): FileProcessor {
    return new FileProcessor(
      props.uploadType,
      props.musicEventData
    );
  }
}