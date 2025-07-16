// Workflow-related interfaces

export interface UploadStepInfo {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'active' | 'completed' | 'error';
  error?: string;
}

export interface ThemeContextType {
  theme: 'light' | 'dark';
  setTheme: (theme: 'light' | 'dark') => void;
}

export interface MetadataTemplate {
  description: string;
  author: string;
  source: string;
  license: string;
  categories: string[];
  wikiPortraitsEvent: string;
  template?: string;
}