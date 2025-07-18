import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get('q');
  const category = searchParams.get('category') || 'football';
  const limit = parseInt(searchParams.get('limit') || '10');

  if (!query) {
    return NextResponse.json({ error: 'Query parameter is required' }, { status: 400 });
  }

  try {
    // Search for football teams/clubs on Wikipedia
    const searchUrl = new URL('https://en.wikipedia.org/w/api.php');
    searchUrl.searchParams.set('action', 'opensearch');
    searchUrl.searchParams.set('search', query); // Just search for the query without adding "football club"
    searchUrl.searchParams.set('limit', limit.toString());
    searchUrl.searchParams.set('namespace', '0');
    searchUrl.searchParams.set('format', 'json');
    searchUrl.searchParams.set('origin', '*');

    const response = await fetch(searchUrl.toString());
    if (!response.ok) {
      throw new Error('Wikipedia API request failed');
    }

    const data = await response.json();
    
    // OpenSearch returns [query, titles, descriptions, urls]
    const [searchQuery, titles, descriptions, urls] = data;
    
    const results = titles.map((title: string, index: number) => ({
      id: title.replace(/\s+/g, '_'),
      title,
      description: descriptions[index] || '',
      url: urls[index] || '',
      wikipedia_url: urls[index] || ''
    }));

    // For teams, try to get additional info
    if (category === 'teams' && results.length > 0) {
      // Get page info for the first few results to identify actual football teams
      const pageInfoPromises = results.slice(0, 5).map(async (result: any) => {
        try {
          const pageTitle = result.title;
          const pageInfoUrl = new URL('https://en.wikipedia.org/w/api.php');
          pageInfoUrl.searchParams.set('action', 'query');
          pageInfoUrl.searchParams.set('titles', pageTitle);
          pageInfoUrl.searchParams.set('prop', 'categories|extracts');
          pageInfoUrl.searchParams.set('clcategories', 'Category:Football clubs|Category:Soccer clubs');
          pageInfoUrl.searchParams.set('exintro', '1');
          pageInfoUrl.searchParams.set('explaintext', '1');
          pageInfoUrl.searchParams.set('exsectionformat', 'plain');
          pageInfoUrl.searchParams.set('format', 'json');
          pageInfoUrl.searchParams.set('origin', '*');

          const pageResponse = await fetch(pageInfoUrl.toString());
          const pageData = await pageResponse.json();
          
          if (pageData.query && pageData.query.pages) {
            const page = Object.values(pageData.query.pages)[0] as Record<string, unknown>;
            const isFootballTeam = page.categories && 
              (page.categories as any[]).some((cat: any) => 
                cat.title.includes('football') || 
                cat.title.includes('soccer') ||
                cat.title.includes('Football')
              );
            
            return {
              ...result,
              isFootballTeam,
              extract: page.extract ? (page.extract as string).substring(0, 200) + '...' : (result as any).description
            };
          }
        } catch (error) {
          console.error('Error fetching page info:', error);
        }
        return result;
      });

      const enhancedResults = await Promise.all(pageInfoPromises);
      
      // Filter and prioritize actual football teams
      const footballTeams = enhancedResults.filter(result => result.isFootballTeam !== false);
      
      return NextResponse.json({
        query: searchQuery,
        results: footballTeams.length > 0 ? footballTeams : results
      });
    }

    return NextResponse.json({
      query: searchQuery,
      results
    });

  } catch (error) {
    console.error('Wikipedia search error:', error);
    return NextResponse.json(
      { error: 'Failed to search Wikipedia' }, 
      { status: 500 }
    );
  }
}