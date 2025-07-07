import { SoccerMatchMetadata, SoccerPlayer } from '@/components/SoccerMatchWorkflow';

export interface SoccerCategoryOptions {
  matchData: SoccerMatchMetadata;
  selectedPlayers: SoccerPlayer[];
  includePlayerCategories?: boolean;
  includeTeamCategories?: boolean;
  includeMatchCategories?: boolean;
}

export type { CategoryCreationInfo } from '@/types/categories';

export function generateSoccerCategories({
  matchData,
  selectedPlayers,
  includePlayerCategories = true,
  includeTeamCategories = true,
  includeMatchCategories = true
}: SoccerCategoryOptions): string[] {
  const categories: Set<string> = new Set();

  // Base WikiPortraits category
  categories.add('WikiPortraits');

  // Match-specific categories
  if (includeMatchCategories && matchData.homeTeam && matchData.awayTeam) {
    const homeTeamName = matchData.homeTeam.name;
    const awayTeamName = matchData.awayTeam.name;
    const matchDate = matchData.date ? new Date(matchData.date).getFullYear().toString() : '';
    
    // Main match category
    const matchCategory = `${homeTeamName} vs ${awayTeamName}`;
    if (matchDate) {
      categories.add(`${matchCategory} ${matchDate}`);
      categories.add(`${matchCategory}`);
    } else {
      categories.add(matchCategory);
    }

    // Competition category
    if (matchData.competition) {
      categories.add(`${matchData.competition} matches`);
      if (matchDate) {
        categories.add(`${matchData.competition} ${matchDate}`);
      }
    }

    // Venue category
    if (matchData.venue) {
      categories.add(`Matches at ${matchData.venue}`);
    }
  }

  // Team categories - use standardized format
  if (includeTeamCategories) {
    if (matchData.homeTeam) {
      categories.add(`${matchData.homeTeam.name} matches`);
      categories.add(`Players of ${matchData.homeTeam.name}`); // Standardized format
    }
    if (matchData.awayTeam) {
      categories.add(`${matchData.awayTeam.name} matches`);
      categories.add(`Players of ${matchData.awayTeam.name}`); // Standardized format
    }
  }

  // Player-specific categories
  if (includePlayerCategories && selectedPlayers.length > 0) {
    selectedPlayers.forEach(player => {
      // Individual player category
      categories.add(`${player.name}`);
      
      // Team-specific player category - use standardized format
      categories.add(`Players of ${player.team}`);
      
      // Position-based category if available
      if (player.position) {
        categories.add(`${player.position}s`);
        categories.add(`${player.team} ${player.position}s`);
      }
    });
  }

  // Convert Set to Array and sort
  return Array.from(categories).sort();
}

export function getCategoriesToCreate(
  matchData: SoccerMatchMetadata,
  selectedPlayers: SoccerPlayer[]
): CategoryCreationInfo[] {
  const categoriesToCreate: CategoryCreationInfo[] = [];
  const teamsProcessed = new Set<string>();

  // Create player categories for each team
  const allTeams = [matchData.homeTeam, matchData.awayTeam].filter(Boolean) as any[];
  
  allTeams.forEach(team => {
    if (!teamsProcessed.has(team.name)) {
      teamsProcessed.add(team.name);
      
      const playerCategoryName = `Players of ${team.name}`;
      categoriesToCreate.push({
        categoryName: playerCategoryName,
        shouldCreate: true,
        parentCategory: team.name,
        description: `Players of [[${team.name}]].`,
        teamName: team.name
      });
    }
  });

  // Create individual player categories if needed
  selectedPlayers.forEach(player => {
    categoriesToCreate.push({
      categoryName: player.name,
      shouldCreate: true,
      parentCategory: `Players of ${player.team}`,
      description: `[[${player.name}]]${player.position ? `, ${player.position}` : ''} of [[${player.team}]].`,
      teamName: player.team
    });
  });

  // Create match-specific categories
  if (matchData.homeTeam && matchData.awayTeam) {
    const matchCategory = `${matchData.homeTeam.name} vs ${matchData.awayTeam.name}`;
    const matchDate = matchData.date ? new Date(matchData.date).getFullYear().toString() : '';
    
    if (matchDate) {
      categoriesToCreate.push({
        categoryName: `${matchCategory} ${matchDate}`,
        shouldCreate: true,
        parentCategory: matchCategory,
        description: `Match between [[${matchData.homeTeam.name}]] and [[${matchData.awayTeam.name}]] in ${matchDate}${matchData.venue ? ` at ${matchData.venue}` : ''}.`
      });
    }
  }

  return categoriesToCreate;
}

export function generateMatchPageCategory(matchData: SoccerMatchMetadata): string {
  if (!matchData.homeTeam || !matchData.awayTeam) {
    return 'Unnamed Match';
  }

  const homeTeam = matchData.homeTeam.name;
  const awayTeam = matchData.awayTeam.name;
  const date = matchData.date ? new Date(matchData.date).toLocaleDateString() : '';
  const competition = matchData.competition;

  let categoryName = `${homeTeam} vs ${awayTeam}`;
  
  if (date) {
    categoryName += ` (${date})`;
  }
  
  if (competition) {
    categoryName += ` - ${competition}`;
  }

  return categoryName;
}

export function generateMatchDescription(matchData: SoccerMatchMetadata): string {
  if (!matchData.homeTeam || !matchData.awayTeam) {
    return 'Soccer match photos';
  }

  let description = `Photos from the soccer match between ${matchData.homeTeam.name} and ${matchData.awayTeam.name}`;
  
  if (matchData.date) {
    const formattedDate = new Date(matchData.date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    description += ` on ${formattedDate}`;
  }
  
  if (matchData.venue) {
    description += ` at ${matchData.venue}`;
  }
  
  if (matchData.competition) {
    description += ` (${matchData.competition})`;
  }
  
  if (matchData.result) {
    description += `. Final score: ${matchData.result}`;
  }
  
  description += '.';
  
  return description;
}

export function generatePlayerDescription(player: SoccerPlayer, matchData?: SoccerMatchMetadata): string {
  let description = `${player.name}`;
  
  if (player.position) {
    description += `, ${player.position}`;
  }
  
  description += ` of ${player.team}`;
  
  if (matchData && matchData.homeTeam && matchData.awayTeam) {
    description += ` during the match against ${
      player.team === matchData.homeTeam.name ? matchData.awayTeam.name : matchData.homeTeam.name
    }`;
    
    if (matchData.date) {
      const formattedDate = new Date(matchData.date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
      description += ` on ${formattedDate}`;
    }
  }
  
  description += '.';
  
  return description;
}