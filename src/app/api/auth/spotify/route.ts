import { NextResponse } from 'next/server';
import { generateSpotifyState, getSpotifyAuthUrl } from '@/lib/services/spotify';

export async function GET() {
  if (!process.env.SPOTIFY_CLIENT_ID) {
    return NextResponse.json(
      { error: 'SPOTIFY_CLIENT_ID is not configured in .env' },
      { status: 500 }
    );
  }

  const state = generateSpotifyState();
  const url = getSpotifyAuthUrl(state);

  const res = NextResponse.redirect(url);
  res.cookies.set('oauth_state_spotify', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 15 * 60, // 15 minutes
    path: '/',
  });

  return res;
}
