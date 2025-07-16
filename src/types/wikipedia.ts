// Wikipedia-related interfaces

export interface WikipediaSearchResult {
  title: string;
  description: string;
  url: string;
  wikipedia_url: string;
  isMusicRelated?: boolean;
  extract?: string;
}

export interface WikipediaCategory {
  title: string;
  description?: string;
}

export interface WikipediaPageInfo {
  title: string;
  description?: string;
  url: string;
  categories: WikipediaCategory[];
  extract?: string;
}

export interface WikipediaArtist {
  id: string;
  title: string;
  description: string;
  url: string;
  wikipedia_url: string;
  isMusicRelated?: boolean;
  extract?: string;
}