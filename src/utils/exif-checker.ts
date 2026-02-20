/**
 * Check for important EXIF metadata that should be preserved for Commons uploads
 */
import { logger } from '@/utils/logger';

export interface ExifCheckResult {
  hasDate: boolean;
  hasCamera: boolean;
  hasLocation: boolean;
  hasAuthor: boolean;
  warnings: string[];
  isStripped: boolean; // True if important metadata is missing
}

/**
 * Check if image has important EXIF metadata
 */
export async function checkImageMetadata(file: File): Promise<ExifCheckResult> {
  // Use the existing exif-reader to get actual EXIF data
  const { extractExifData } = await import('./exif-reader');
  const exifData = await extractExifData(file);

  return new Promise((resolve) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const arrayBuffer = e.target?.result as ArrayBuffer;
        const warnings: string[] = [];

        // Check what important metadata we have from EXIF
        const hasDate = Boolean(exifData?.dateTime);
        const hasCamera = Boolean(exifData?.make || exifData?.model);
        const hasLocation = Boolean(exifData?.gps?.latitude && exifData?.gps?.longitude);
        const hasAuthor = Boolean((exifData as any)?.artist || (exifData as any)?.copyright);

        logger.debug('exif-checker', 'EXIF data check', {
          filename: file.name,
          hasDate,
          hasCamera,
          hasLocation,
          hasAuthor,
          dateTime: exifData?.dateTime,
          make: exifData?.make,
          model: exifData?.model
        });

        // Try to detect if EXIF data exists by checking for EXIF markers in JPEG
        if (file.type === 'image/jpeg' || file.type === 'image/jpg') {
          const uint8Array = new Uint8Array(arrayBuffer);

          // Check for EXIF marker (0xFFE1 followed by "Exif")
          let hasExifMarker = false;
          let exifSegmentSize = 0;

          for (let i = 0; i < Math.min(uint8Array.length - 10, 10000); i++) {
            if (uint8Array[i] === 0xFF && uint8Array[i + 1] === 0xE1) {
              // Check for "Exif" string
              if (uint8Array[i + 4] === 0x45 && uint8Array[i + 5] === 0x78 &&
                  uint8Array[i + 6] === 0x69 && uint8Array[i + 7] === 0x66) {
                hasExifMarker = true;
                // Get EXIF segment size (2 bytes after marker, big-endian)
                exifSegmentSize = (uint8Array[i + 2] << 8) | uint8Array[i + 3];
                logger.debug('exif-checker', `EXIF segment found, size: ${exifSegmentSize} bytes`);
                break;
              }
            }
          }

          // Check for missing important metadata
          if (!hasExifMarker) {
            warnings.push('No EXIF data found - image metadata has been completely stripped');
          } else {
            // Has some EXIF, but check what's missing
            if (!hasDate) {
              warnings.push('Missing capture date/time - this is important for documentation');
            }
            if (!hasCamera) {
              warnings.push('Missing camera information (make/model)');
            }

            if (exifSegmentSize < 200) {
              warnings.push('EXIF data is very minimal - many fields may have been removed');
            }
          }
        }

        const isStripped = warnings.length > 0;

        logger.debug('exif-checker', 'Final check result', {
          filename: file.name,
          isStripped,
          warningCount: warnings.length,
          warnings
        });

        resolve({
          hasDate,
          hasCamera,
          hasLocation,
          hasAuthor,
          warnings,
          isStripped
        });
      } catch (error) {
        logger.error('exif-checker', 'Error checking image metadata', error);
        resolve({
          hasDate: false,
          hasCamera: false,
          hasLocation: false,
          hasAuthor: false,
          warnings: [],
          isStripped: false
        });
      }
    };

    reader.onerror = () => {
      resolve({
        hasDate: false,
        hasCamera: false,
        hasLocation: false,
        hasAuthor: false,
        warnings: [],
        isStripped: false
      });
    };

    // Read first 100KB of file to check for EXIF markers
    const slice = file.slice(0, 100000);
    reader.readAsArrayBuffer(slice);
  });
}

/**
 * Batch check multiple images
 */
export async function checkImagesMetadata(files: File[]): Promise<Map<string, ExifCheckResult>> {
  const results = new Map<string, ExifCheckResult>();

  const checks = files.map(async (file) => {
    const result = await checkImageMetadata(file);
    results.set(file.name, result);
  });

  await Promise.all(checks);
  return results;
}
