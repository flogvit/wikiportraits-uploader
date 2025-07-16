import { NextRequest, NextResponse } from 'next/server';

interface WikipediaSearchResult {
  title: string;
  snippet: string;
  pageid: number;
  description?: string;
}

interface WikipediaCategory {
  title: string;
}

interface WikipediaPageInfo {
  categories?: WikipediaCategory[];
  extract?: string;
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get('q');
  const language = searchParams.get('lang') || 'en';
  const limit = parseInt(searchParams.get('limit') || '10');

  if (!query) {
    return NextResponse.json({ error: 'Query parameter is required' }, { status: 400 });
  }

  // Validate language code (basic validation)
  const validLanguages = ['en', 'no', 'nb', 'nn', 'da', 'sv', 'de', 'fr', 'es', 'it', 'nl', 'pl', 'ru'];
  const lang = validLanguages.includes(language) ? language : 'en';

  try {
    // Search for musical artists/bands on Wikipedia in specified language
    const searchUrl = new URL(`https://${lang}.wikipedia.org/w/api.php`);
    searchUrl.searchParams.set('action', 'opensearch');
    searchUrl.searchParams.set('search', query);
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

    // Get additional info to identify music artists/bands
    if (results.length > 0) {
      const pageInfoPromises = results.slice(0, 8).map(async (result: WikipediaSearchResult) => {
        try {
          const pageTitle = result.title;
          const pageInfoUrl = new URL(`https://${lang}.wikipedia.org/w/api.php`);
          pageInfoUrl.searchParams.set('action', 'query');
          pageInfoUrl.searchParams.set('titles', pageTitle);
          pageInfoUrl.searchParams.set('prop', 'categories|extracts');
          pageInfoUrl.searchParams.set('exintro', '1');
          pageInfoUrl.searchParams.set('explaintext', '1');
          pageInfoUrl.searchParams.set('exsectionformat', 'plain');
          pageInfoUrl.searchParams.set('format', 'json');
          pageInfoUrl.searchParams.set('origin', '*');

          const pageResponse = await fetch(pageInfoUrl.toString());
          const pageData = await pageResponse.json();
          
          if (pageData.query && pageData.query.pages) {
            const page = Object.values(pageData.query.pages)[0] as WikipediaPageInfo;
            
            // Check if this is a music-related page
            const isMusicRelated = page.categories && 
              page.categories.some((cat: WikipediaCategory) => {
                const categoryTitle = cat.title.toLowerCase();
                return categoryTitle.includes('musical') || 
                       categoryTitle.includes('music') ||
                       categoryTitle.includes('band') ||
                       categoryTitle.includes('singer') ||
                       categoryTitle.includes('musician') ||
                       categoryTitle.includes('artist') ||
                       categoryTitle.includes('rock') ||
                       categoryTitle.includes('pop') ||
                       categoryTitle.includes('jazz') ||
                       categoryTitle.includes('classical') ||
                       categoryTitle.includes('electronic') ||
                       categoryTitle.includes('folk') ||
                       categoryTitle.includes('country') ||
                       categoryTitle.includes('hip hop') ||
                       categoryTitle.includes('metal') ||
                       categoryTitle.includes('alternative') ||
                       categoryTitle.includes('indie') ||
                       categoryTitle.includes('norwegian') && (categoryTitle.includes('band') || categoryTitle.includes('music'));
              });

            // Also check extract for music-related keywords
            const extract = page.extract || '';
            const extractIsMusicRelated = /\b(band|singer|musician|artist|album|song|music|guitar|vocalist|drummer|bassist|keyboard)\b/i.test(extract);
            
            return {
              ...result,
              isMusicRelated: isMusicRelated || extractIsMusicRelated,
              extract: extract ? extract.substring(0, 200) + '...' : result.description,
              categories: page.categories || []
            };
          }
        } catch (error) {
          console.error('Error fetching page info:', error);
        }
        return {
          ...result,
          isMusicRelated: false
        };
      });

      const enhancedResults = await Promise.all(pageInfoPromises);
      
      // Prioritize music-related results but include all for flexibility
      const musicResults = enhancedResults.filter(result => result.isMusicRelated !== false);
      const finalResults = musicResults.length > 0 ? musicResults : enhancedResults;
      
      return NextResponse.json({
        query: searchQuery,
        language: lang,
        results: finalResults
      });
    }

    return NextResponse.json({
      query: searchQuery,
      language: lang,
      results
    });

  } catch (error) {
    console.error('Wikipedia music search error:', error);
    return NextResponse.json(
      { error: 'Failed to search Wikipedia for music artists' }, 
      { status: 500 }
    );
  }
}