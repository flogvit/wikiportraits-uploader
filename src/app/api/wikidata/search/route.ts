import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const search = searchParams.get('search');
  const lang = searchParams.get('lang') || 'en';

  if (!search) {
    return NextResponse.json({ error: 'Search term is required' }, { status: 400 });
  }

  const url = `https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&search=${search}&language=${lang}`;

  try {
    const response = await fetch(url);
    const data = await response.json();
    return NextResponse.json(data.search);
  } catch (_error) {
    return NextResponse.json({ error: 'Failed to fetch data from Wikidata' }, { status: 500 });
  }
}
