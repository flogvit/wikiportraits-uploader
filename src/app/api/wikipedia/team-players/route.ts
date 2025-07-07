import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const teamTitle = searchParams.get('team');
  const limit = parseInt(searchParams.get('limit') || '30');

  if (!teamTitle) {
    return NextResponse.json({ error: 'Team parameter is required' }, { status: 400 });
  }

  try {
    // First, get the team's Wikipedia page to find player categories
    const pageUrl = new URL('https://en.wikipedia.org/w/api.php');
    pageUrl.searchParams.set('action', 'query');
    pageUrl.searchParams.set('titles', teamTitle);
    pageUrl.searchParams.set('prop', 'categories');
    pageUrl.searchParams.set('cllimit', '500');
    pageUrl.searchParams.set('format', 'json');
    pageUrl.searchParams.set('origin', '*');

    const pageResponse = await fetch(pageUrl.toString());
    const pageData = await pageResponse.json();

    if (!pageData.query || !pageData.query.pages) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 });
    }

    const page = Object.values(pageData.query.pages)[0] as any;
    const categories = page.categories || [];

    // Look for player categories with more comprehensive patterns
    const playerCategories = categories
      .map((cat: any) => cat.title)
      .filter((title: string) => {
        const lowerTitle = title.toLowerCase();
        return lowerTitle.includes('players') || 
               lowerTitle.includes('footballers') ||
               lowerTitle.includes('squad') ||
               lowerTitle.includes('current players') ||
               lowerTitle.includes('former players') ||
               lowerTitle.includes('association football people');
      });

    // Also try to construct likely category names if none found
    if (playerCategories.length === 0) {
      const teamName = teamTitle;
      const possibleCategories = [
        `Category:${teamName} players`,
        `Category:${teamName} footballers`,
        `Category:${teamName} F.C. players`,
        `Category:${teamName} FC players`,
        `Category:${teamName} current squad`,
        `Category:${teamName} current players`
      ];
      playerCategories.push(...possibleCategories);
    }

    let allPlayers: any[] = [];

    // Get players from each relevant category
    for (const categoryTitle of playerCategories.slice(0, 3)) { // Limit to first 3 categories
      try {
        const membersUrl = new URL('https://en.wikipedia.org/w/api.php');
        membersUrl.searchParams.set('action', 'query');
        membersUrl.searchParams.set('list', 'categorymembers');
        membersUrl.searchParams.set('cmtitle', categoryTitle);
        membersUrl.searchParams.set('cmlimit', Math.min(limit, 100).toString());
        membersUrl.searchParams.set('cmnamespace', '0'); // Main namespace only
        membersUrl.searchParams.set('format', 'json');
        membersUrl.searchParams.set('origin', '*');

        const membersResponse = await fetch(membersUrl.toString());
        const membersData = await membersResponse.json();

        if (membersData.query && membersData.query.categorymembers) {
          const players = membersData.query.categorymembers.map((member: any) => ({
            id: member.title.replace(/\s+/g, '_'),
            name: member.title,
            wikipedia_title: member.title,
            wikipedia_url: `https://en.wikipedia.org/wiki/${encodeURIComponent(member.title)}`,
            team: teamTitle,
            category: categoryTitle
          }));

          allPlayers.push(...players);
        }
      } catch (error) {
        console.error(`Error fetching players from category ${categoryTitle}:`, error);
      }
    }

    // Remove duplicates and limit results
    const uniquePlayers = allPlayers
      .filter((player, index, self) => 
        index === self.findIndex(p => p.name === player.name)
      )
      .slice(0, limit);

    // If no players found in categories, try multiple search strategies
    if (uniquePlayers.length === 0) {
      // Strategy 1: Search for squad/roster pages
      const squadSearches = [
        `${teamTitle} current squad`,
        `${teamTitle} players 2024`,
        `${teamTitle} roster`,
        `${teamTitle} first team`,
        `List of ${teamTitle} players`
      ];

      for (const searchTerm of squadSearches) {
        try {
          const squadSearchUrl = new URL('https://en.wikipedia.org/w/api.php');
          squadSearchUrl.searchParams.set('action', 'opensearch');
          squadSearchUrl.searchParams.set('search', searchTerm);
          squadSearchUrl.searchParams.set('limit', '10');
          squadSearchUrl.searchParams.set('namespace', '0');
          squadSearchUrl.searchParams.set('format', 'json');
          squadSearchUrl.searchParams.set('origin', '*');

          const squadResponse = await fetch(squadSearchUrl.toString());
          const squadData = await squadResponse.json();

          if (squadData && squadData[1] && squadData[1].length > 0) {
            const searchResults = squadData[1].slice(0, 5).map((title: string) => ({
              id: title.replace(/\s+/g, '_'),
              name: title,
              wikipedia_title: title,
              wikipedia_url: `https://en.wikipedia.org/wiki/${encodeURIComponent(title)}`,
              team: teamTitle,
              source: 'squad_search'
            }));

            uniquePlayers.push(...searchResults);
            break; // Stop after finding results
          }
        } catch (error) {
          console.error(`Error in squad search for ${searchTerm}:`, error);
        }
      }

      // Strategy 2: Search for individual notable players
      if (uniquePlayers.length === 0) {
        const playerSearchUrl = new URL('https://en.wikipedia.org/w/api.php');
        playerSearchUrl.searchParams.set('action', 'opensearch');
        playerSearchUrl.searchParams.set('search', `${teamTitle} footballer player`);
        playerSearchUrl.searchParams.set('limit', '15');
        playerSearchUrl.searchParams.set('namespace', '0');
        playerSearchUrl.searchParams.set('format', 'json');
        playerSearchUrl.searchParams.set('origin', '*');

        const playerResponse = await fetch(playerSearchUrl.toString());
        const playerData = await playerResponse.json();

        if (playerData && playerData[1]) {
          const searchResults = playerData[1]
            .filter((title: string) => {
              // Filter for likely player pages (avoid team pages, stadiums, etc.)
              const lowerTitle = title.toLowerCase();
              return !lowerTitle.includes('stadium') && 
                     !lowerTitle.includes('season') && 
                     !lowerTitle.includes('f.c.') &&
                     !lowerTitle.includes('fc ') &&
                     !lowerTitle.includes('club');
            })
            .slice(0, 10)
            .map((title: string) => ({
              id: title.replace(/\s+/g, '_'),
              name: title,
              wikipedia_title: title,
              wikipedia_url: `https://en.wikipedia.org/wiki/${encodeURIComponent(title)}`,
              team: teamTitle,
              source: 'player_search'
            }));

          uniquePlayers.push(...searchResults);
        }
      }
    }

    return NextResponse.json({
      team: teamTitle,
      players: uniquePlayers,
      total: uniquePlayers.length,
      categories_found: playerCategories
    });

  } catch (error) {
    console.error('Team players search error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch team players' }, 
      { status: 500 }
    );
  }
}