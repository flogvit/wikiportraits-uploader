// Soccer-related interfaces

export interface SoccerTeam {
  id: string;
  name: string;
  country?: string;
  league?: string;
  wikipediaUrl?: string;
}

export interface SoccerPlayer {
  id: string;
  name: string;
  position?: string;
  number?: string;
  team: string;
  wikipediaUrl?: string;
}

export interface SoccerMatchMetadata {
  homeTeam: SoccerTeam | null;
  awayTeam: SoccerTeam | null;
  date: string;
  venue: string;
  competition: string;
  matchday?: string;
  result?: string;
}

export interface SoccerCategoryOptions {
  matchData: SoccerMatchMetadata;
  selectedPlayers: SoccerPlayer[];
  includePlayerCategories?: boolean;
  includeTeamCategories?: boolean;
  includeMatchCategories?: boolean;
}

export interface WikipediaPlayer {
  id: string;
  name: string;
  position?: string;
  number?: string;
  team: string;
  wikipediaUrl?: string;
}

export interface TeamPlayersResponse {
  players: WikipediaPlayer[];
}

export interface WikipediaSearchResult {
  title: string;
  description: string;
  url: string;
}