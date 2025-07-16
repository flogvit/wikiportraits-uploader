import { ImageFile } from '@/types/upload';
import { DuplicateInfo } from '@/types/common';

export type { DuplicateInfo } from '@/types/common';

export function detectDuplicates(
  newFiles: File[], 
  existingImages: ImageFile[]
): { validFiles: File[], duplicates: DuplicateInfo[] } {
  const duplicates: DuplicateInfo[] = [];
  const validFiles: File[] = [];

  for (const newFile of newFiles) {
    let isDuplicate = false;

    // Check against existing images
    for (const existingImage of existingImages) {
      const existing = existingImage.file;

      // Check 1: Identical file (same name, size, type, and last modified)
      if (
        newFile.name === existing.name &&
        newFile.size === existing.size &&
        newFile.type === existing.type &&
        newFile.lastModified === existing.lastModified
      ) {
        duplicates.push({
          file: newFile,
          duplicateOf: existingImage.id,
          reason: 'identical'
        });
        isDuplicate = true;
        break;
      }

      // Check 2: Same filename (likely duplicate)
      if (newFile.name === existing.name) {
        duplicates.push({
          file: newFile,
          duplicateOf: existingImage.id,
          reason: 'sameName'
        });
        isDuplicate = true;
        break;
      }

      // Check 3: Same size and type (possible duplicate)
      if (
        newFile.size === existing.size &&
        newFile.type === existing.type &&
        Math.abs(newFile.lastModified - existing.lastModified) < 1000 // Within 1 second
      ) {
        duplicates.push({
          file: newFile,
          duplicateOf: existingImage.id,
          reason: 'similarSize'
        });
        isDuplicate = true;
        break;
      }
    }

    // Also check for duplicates within the new files batch
    if (!isDuplicate) {
      const duplicateInBatch = validFiles.find(existing => 
        newFile.name === existing.name ||
        (newFile.size === existing.size && 
         newFile.type === existing.type &&
         Math.abs(newFile.lastModified - existing.lastModified) < 1000)
      );

      if (duplicateInBatch) {
        duplicates.push({
          file: newFile,
          duplicateOf: 'batch-duplicate',
          reason: newFile.name === duplicateInBatch.name ? 'sameName' : 'similarSize'
        });
        isDuplicate = true;
      }
    }

    if (!isDuplicate) {
      validFiles.push(newFile);
    }
  }

  return { validFiles, duplicates };
}

export function getDuplicateMessage(duplicate: DuplicateInfo): string {
  switch (duplicate.reason) {
    case 'identical':
      return 'Identical file already exists';
    case 'sameName':
      return 'File with same name already exists';
    case 'similarSize':
      return 'Very similar file detected (same size/type)';
    default:
      return 'Potential duplicate detected';
  }
}