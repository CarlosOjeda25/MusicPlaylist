import crypto from 'crypto';
import { decryptToken, encryptToken } from '../crypto';
import { db } from '../db';
import { UserTrack } from '../types';

const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const YOUTUBE_API_BASE = 'https://www.googleapis.com/youtube/v3';

const OAUTH_STATE_SECRET = process.env.SESSION_SECRET || 'default_oauth_state_secret_32b_dev!';

export function generateGoogleState(): string {
  const nonce = crypto.randomBytes(16).toString('hex');
  const timestamp = Date.now().toString();
  const payload = `google:${nonce}:${timestamp}`;
  const sig = crypto.createHmac('sha256', OAUTH_STATE_SECRET).update(payload).digest('hex');
  return `${payload}:${sig}`;
}

export function verifyGoogleState(state: string | null): boolean {
  if (!state) return false;
  const parts = state.split(':');
  if (parts.length !== 4) return false;
  const [provider, nonce, timestampStr, sig] = parts;
  if (provider !== 'google') return false;

  const timestamp = parseInt(timestampStr, 10);
  if (isNaN(timestamp)) return false;
  if (Math.abs(Date.now() - timestamp) > 15 * 60 * 1000) return false;

  const payload = `${provider}:${nonce}:${timestampStr}`;
  const expectedSig = crypto.createHmac('sha256', OAUTH_STATE_SECRET).update(payload).digest('hex');
  if (sig.length !== expectedSig.length) return false;
  return crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expectedSig));
}

export function getGoogleAuthUrl(state?: string): string {
  const clientId = process.env.GOOGLE_CLIENT_ID || '';
  const redirectUri = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/api/auth/google/callback';
  const scopes = [
    'https://www.googleapis.com/auth/youtube.readonly',
    'openid',
    'profile',
    'email',
  ].join(' ');

  const oauthState = state || generateGoogleState();

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: scopes,
    access_type: 'offline',
    prompt: 'consent',
    state: oauthState,
  });

  return `${GOOGLE_AUTH_URL}?${params.toString()}`;
}

export async function exchangeGoogleCode(code: string): Promise<{
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}> {
  const clientId = process.env.GOOGLE_CLIENT_ID || '';
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET || '';
  const redirectUri = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/api/auth/google/callback';

  const body = new URLSearchParams({
    code,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: redirectUri,
    grant_type: 'authorization_code',
  });

  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Google token exchange failed (${res.status}): ${errorText}`);
  }

  const data = await res.json();
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token || '',
    expiresIn: data.expires_in,
  };
}

export async function refreshGoogleToken(refreshTokenPlain: string): Promise<{
  accessToken: string;
  expiresIn: number;
  refreshToken?: string;
}> {
  const clientId = process.env.GOOGLE_CLIENT_ID || '';
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET || '';

  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: refreshTokenPlain,
    grant_type: 'refresh_token',
  });

  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Failed to refresh Google token: ${errText}`);
  }

  const data = await res.json();
  return {
    accessToken: data.access_token,
    expiresIn: data.expires_in,
    refreshToken: data.refresh_token,
  };
}

export async function getValidGoogleAccessToken(userId: string): Promise<string> {
  const account = await db.getConnectedAccount(userId, 'google');
  if (!account) {
    throw new Error('Google / YouTube account is not connected for this user');
  }

  const now = Math.floor(Date.now() / 1000);
  if (account.expires_at > now + 60) {
    return decryptToken(account.access_token_enc);
  }

  // Refresh token
  const refreshToken = decryptToken(account.refresh_token_enc);
  if (!refreshToken) {
    throw new Error('No refresh token available for Google. User must reconnect.');
  }

  const refreshed = await refreshGoogleToken(refreshToken);
  const updatedExpiresAt = now + refreshed.expiresIn;

  await db.saveConnectedAccount({
    user_id: userId,
    provider: 'google',
    access_token_enc: encryptToken(refreshed.accessToken),
    refresh_token_enc: refreshed.refreshToken ? encryptToken(refreshed.refreshToken) : account.refresh_token_enc,
    expires_at: updatedExpiresAt,
    updated_at: new Date().toISOString(),
  });

  return refreshed.accessToken;
}

export async function syncYouTubeTracks(userId: string): Promise<{
  playlistsCount: number;
  tracks: Omit<UserTrack, 'id'>[];
}> {
  const accessToken = await getValidGoogleAccessToken(userId);
  const headers = { Authorization: `Bearer ${accessToken}` };

  const collectedTracks: Omit<UserTrack, 'id'>[] = [];
  const MAX_PLAYLISTS = 20;
  let nextPageToken: string | undefined = undefined;
  let playlistsProcessed = 0;

  do {
    const url = new URL(`${YOUTUBE_API_BASE}/playlists`);
    url.searchParams.set('part', 'snippet');
    url.searchParams.set('mine', 'true');
    url.searchParams.set('maxResults', '20');
    if (nextPageToken) url.searchParams.set('pageToken', nextPageToken);

    const res: Response = await fetch(url.toString(), { headers });
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`YouTube API error (${res.status}): ${errText}`);
    }

    const data: { items?: Array<{ id: string; snippet?: { title: string } }>; nextPageToken?: string } = await res.json();
    const playlists = data.items || [];
    if (playlists.length === 0) break;

    for (const pl of playlists) {
      if (playlistsProcessed >= MAX_PLAYLISTS) break;
      playlistsProcessed++;

      const plTitle = pl.snippet?.title || 'YouTube Playlist';
      let itemPageToken: string | undefined = undefined;
      let count = 0;

      do {
        const itemUrl = new URL(`${YOUTUBE_API_BASE}/playlistItems`);
        itemUrl.searchParams.set('part', 'snippet');
        itemUrl.searchParams.set('playlistId', pl.id);
        itemUrl.searchParams.set('maxResults', '50');
        if (itemPageToken) itemUrl.searchParams.set('pageToken', itemPageToken);

        const itemRes: Response = await fetch(itemUrl.toString(), { headers });
        if (!itemRes.ok) break;

        const itemData: { items?: Array<{ snippet?: { title?: string; videoOwnerChannelTitle?: string; resourceId?: { videoId?: string } } }>; nextPageToken?: string } = await itemRes.json();
        for (const item of itemData.items || []) {
          const snippet = item.snippet;
          const videoId = snippet?.resourceId?.videoId;
          const rawTitle = snippet?.title || '';

          if (videoId && rawTitle && rawTitle !== 'Private video' && rawTitle !== 'Deleted video') {
            // Attempt to separate Artist - Title if formatted that way
            let artist = snippet?.videoOwnerChannelTitle || 'YouTube Artist';
            let title = rawTitle;

            if (rawTitle.includes(' - ')) {
              const parts = rawTitle.split(' - ');
              artist = parts[0].trim();
              title = parts.slice(1).join(' - ').trim();
            }

            collectedTracks.push({
              user_id: userId,
              title,
              artist,
              playlist_name: plTitle,
              source: 'yt',
              external_id: videoId,
              synced_at: new Date().toISOString(),
            });
            count++;
          }
        }
        itemPageToken = itemData.nextPageToken;
      } while (itemPageToken && count < 250);
    }

    nextPageToken = data.nextPageToken;
  } while (nextPageToken && playlistsProcessed < MAX_PLAYLISTS);

  return {
    playlistsCount: playlistsProcessed,
    tracks: collectedTracks,
  };
}
