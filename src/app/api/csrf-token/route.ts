import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { fetchCSRFToken } from '@/utils/commons-api';

export async function GET() {
  try {
    const session = await getServerSession();
    
    if (!session?.accessToken) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const csrfToken = await fetchCSRFToken(session.accessToken as string);

    return NextResponse.json({
      csrfToken,
    });

  } catch (error) {
    console.error('CSRF token fetch error:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch CSRF token', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}

export async function POST() {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 }
  );
}