import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const search = searchParams.get('search');
  const lang = searchParams.get('lang') || 'en';

  if (!search) {
    return NextResponse.json({ error: 'Search term is required' }, { status: 400 });
  }

  const url = `https://${lang}.wikipedia.org/w/api.php?action=query&list=search&srsearch=${search}&format=json`;

  try {
    const response = await fetch(url);
    const data = await response.json();
    return NextResponse.json(data.query.search);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch data from Wikipedia' }, { status: 500 });
  }
}
