export interface CategoryCreationInfo {
  categoryName: string;
  shouldCreate: boolean;
  parentCategory?: string;
  description?: string;
  eventName?: string;
  teamName?: string;
}