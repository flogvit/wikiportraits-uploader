export interface CategoryCreationInfo {
  categoryName: string;
  shouldCreate: boolean;
  parentCategory?: string;
  description?: string;
  eventName?: string;
  teamName?: string;
  additionalParents?: string[]; // Additional parent categories to add after creation
}