import crypto from 'crypto';
import { decryptToken, encryptToken } from '../crypto';
import { db } from '../db';
import { UserTrack } from '../types';

const SPOTIFY_AUTH_URL = 'https://accounts.spotify.com/authorize';
const SPOTIFY_TOKEN_URL = 'https://accounts.spotify.com/api/token';
const SPOTIFY_API_BASE = 'https://api.spotify.com/v1';

const OAUTH_STATE_SECRET = process.env.SESSION_SECRET || 'default_oauth_state_secret_32b_dev!';

export function generateSpotifyState(): string {
  const nonce = crypto.randomBytes(16).toString('hex');
  const timestamp = Date.now().toString();
  const payload = `spotify:${nonce}:${timestamp}`;
  const sig = crypto.createHmac('sha256', OAUTH_STATE_SECRET).update(payload).digest('hex');
  return `${payload}:${sig}`;
}

export function verifySpotifyState(state: string | null): boolean {
  if (!state) return false;
  const parts = state.split(':');
  if (parts.length !== 4) return false;
  const [provider, nonce, timestampStr, sig] = parts;
  if (provider !== 'spotify') return false;

  const timestamp = parseInt(timestampStr, 10);
  if (isNaN(timestamp)) return false;
  if (Math.abs(Date.now() - timestamp) > 15 * 60 * 1000) return false;

  const payload = `${provider}:${nonce}:${timestampStr}`;
  const expectedSig = crypto.createHmac('sha256', OAUTH_STATE_SECRET).update(payload).digest('hex');
  if (sig.length !== expectedSig.length) return false;
  return crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expectedSig));
}

export function getSpotifyAuthUrl(state?: string): string {
  const clientId = process.env.SPOTIFY_CLIENT_ID || '';
  const redirectUri = process.env.SPOTIFY_REDIRECT_URI || 'http://localhost:3000/api/auth/spotify/callback';
  const scopes = [
    'playlist-read-private',
    'playlist-read-collaborative',
    'user-library-read',
  ].join(' ');

  const oauthState = state || generateSpotifyState();

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    scope: scopes,
    redirect_uri: redirectUri,
    state: oauthState,
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
    const errText = await res.text();
    throw new Error(`Failed to exchange Spotify code: ${errText}`);
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
  refreshToken?: string;
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
    refreshToken: data.refresh_token,
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
  if (!refreshToken) {
    throw new Error('Spotify refresh token is missing. Please reconnect your account.');
  }
  const refreshed = await refreshSpotifyToken(refreshToken);

  const updatedExpiresAt = now + refreshed.expiresIn;
  const refreshTokenEnc = refreshed.refreshToken
    ? encryptToken(refreshed.refreshToken)
    : account.refresh_token_enc;

  await db.saveConnectedAccount({
    user_id: userId,
    provider: 'spotify',
    access_token_enc: encryptToken(refreshed.accessToken),
    refresh_token_enc: refreshTokenEnc,
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
  const MAX_PLAYLISTS = 20;
  let playlistUrl: string | null = `${SPOTIFY_API_BASE}/me/playlists?limit=20`;
  let playlistsProcessed = 0;

  while (playlistUrl && playlistsProcessed < MAX_PLAYLISTS) {
    const res: Response = await fetch(playlistUrl, { headers });
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Spotify API error (${res.status}): ${errText}`);
    }

    const data: { items?: Array<{ id: string; name: string }>; next?: string | null } = await res.json();
    const playlists = data.items || [];
    if (playlists.length === 0) break;

    for (const pl of playlists) {
      if (playlistsProcessed >= MAX_PLAYLISTS) break;
      playlistsProcessed++;

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
    playlistUrl = playlistsProcessed < MAX_PLAYLISTS ? (data.next || null) : null;
  }

  return {
    playlistsCount: playlistsProcessed,
    tracks: collectedTracks,
  };
}
