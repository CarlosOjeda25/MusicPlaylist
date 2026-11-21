import { decryptToken, encryptToken } from '../crypto';
import { db } from '../db';
import { UserTrack } from '../types';

const SPOTIFY_AUTH_URL = 'https://accounts.spotify.com/authorize';
const SPOTIFY_TOKEN_URL = 'https://accounts.spotify.com/api/token';
const SPOTIFY_API_BASE = 'https://api.spotify.com/v1';

export function getSpotifyAuthUrl(): string {
  const clientId = process.env.SPOTIFY_CLIENT_ID || '';
  const redirectUri = process.env.SPOTIFY_REDIRECT_URI || 'http://localhost:3000/api/auth/spotify/callback';
  const scopes = [
    'playlist-read-private',
    'playlist-read-collaborative',
    'user-library-read',
  ].join(' ');

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    scope: scopes,
    redirect_uri: redirectUri,
    show_dialog: 'true',
  });

  return `${SPOTIFY_AUTH_URL}?${params.toString()}`;
}

export async function exchangeSpotifyCode(code: string): Promise<{
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}> {
  const clientId = process.env.SPOTIFY_CLIENT_ID || '';
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET || '';
  const redirectUri = process.env.SPOTIFY_REDIRECT_URI || 'http://localhost:3000/api/auth/spotify/callback';

  const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: redirectUri,
  });

  const res = await fetch(SPOTIFY_TOKEN_URL, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${basicAuth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: body.toString(),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Spotify token exchange failed (${res.status}): ${errorText}`);
  }

  const data = await res.json();
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresIn: data.expires_in,
  };
}

export async function refreshSpotifyToken(refreshTokenPlain: string): Promise<{
  accessToken: string;
  expiresIn: number;
}> {
  const clientId = process.env.SPOTIFY_CLIENT_ID || '';
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET || '';

  const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: refreshTokenPlain,
  });

  const res = await fetch(SPOTIFY_TOKEN_URL, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${basicAuth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: body.toString(),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Failed to refresh Spotify token: ${errText}`);
  }

  const data = await res.json();
  return {
    accessToken: data.access_token,
    expiresIn: data.expires_in,
  };
}

export async function getValidSpotifyAccessToken(userId: string): Promise<string> {
  const account = await db.getConnectedAccount(userId, 'spotify');
  if (!account) {
    throw new Error('Spotify account is not connected for this user');
  }

  const now = Math.floor(Date.now() / 1000);
  if (account.expires_at > now + 60) {
    return decryptToken(account.access_token_enc);
  }

  // Refresh token
  const refreshToken = decryptToken(account.refresh_token_enc);
  const refreshed = await refreshSpotifyToken(refreshToken);

  const updatedExpiresAt = now + refreshed.expiresIn;
  await db.saveConnectedAccount({
    user_id: userId,
    provider: 'spotify',
    access_token_enc: encryptToken(refreshed.accessToken),
    refresh_token_enc: account.refresh_token_enc,
    expires_at: updatedExpiresAt,
    updated_at: new Date().toISOString(),
  });

  return refreshed.accessToken;
}

export async function syncSpotifyTracks(userId: string): Promise<{
  playlistsCount: number;
  tracks: Omit<UserTrack, 'id'>[];
}> {
  const accessToken = await getValidSpotifyAccessToken(userId);
  const headers = { Authorization: `Bearer ${accessToken}` };

  const collectedTracks: Omit<UserTrack, 'id'>[] = [];
  let playlistUrl: string | null = `${SPOTIFY_API_BASE}/me/playlists?limit=50`;
  let playlistsProcessed = 0;

  while (playlistUrl && playlistsProcessed < 20) {
    const res: Response = await fetch(playlistUrl, { headers });
    if (!res.ok) {
      console.error(`[Spotify Sync] Error fetching playlists (${res.status})`);
      break;
    }

    const data: { items?: Array<{ id: string; name: string }>; next?: string | null } = await res.json();
    const playlists = data.items || [];
    playlistsProcessed += playlists.length;

    for (const pl of playlists) {
      let tracksUrl: string | null = `${SPOTIFY_API_BASE}/playlists/${pl.id}/tracks?limit=100`;
      let count = 0;

      while (tracksUrl && count < 300) {
        const tRes: Response = await fetch(tracksUrl, { headers });
        if (!tRes.ok) break;

        const tData: { items?: Array<{ track?: { id?: string; name?: string; artists?: Array<{ name: string }> } }>; next?: string | null } = await tRes.json();
        for (const item of tData.items || []) {
          const track = item.track;
          if (track && track.id && track.name) {
            collectedTracks.push({
              user_id: userId,
              title: track.name,
              artist: track.artists?.map((a) => a.name).join(', ') || 'Unknown Artist',
              playlist_name: pl.name,
              source: 'spotify',
              external_id: track.id,
              synced_at: new Date().toISOString(),
            });
            count++;
          }
        }
        tracksUrl = tData.next || null;
      }
    }
    playlistUrl = data.next || null;
  }

  return {
    playlistsCount: playlistsProcessed,
    tracks: collectedTracks,
  };
}
