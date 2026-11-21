import { NextResponse } from 'next/server';
import { getSpotifyAuthUrl } from '@/lib/services/spotify';

export async function GET() {
  if (!process.env.SPOTIFY_CLIENT_ID) {
    return NextResponse.json(
      { error: 'SPOTIFY_CLIENT_ID is not configured in .env' },
      { status: 500 }
    );
  }
  const url = getSpotifyAuthUrl();
  return NextResponse.redirect(url);
}
