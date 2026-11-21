import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { syncSpotifyTracks } from '@/lib/services/spotify';
import { syncYouTubeTracks } from '@/lib/services/youtube';
import { SyncResponse, UserTrack } from '@/lib/types';

export async function POST() {
  try {
    const user = await getCurrentUser();
    const accounts = await db.getConnectedAccounts(user.id);

    const hasSpotify = accounts.some((a) => a.provider === 'spotify');
    const hasGoogle = accounts.some((a) => a.provider === 'google');

    const response: SyncResponse = {
      success: true,
      user_id: user.id,
      synced_total: 0,
      new_tracks: 0,
      providers: {},
    };

    const allCollectedTracks: Omit<UserTrack, 'id'>[] = [];

    // Sync Spotify
    if (hasSpotify) {
      try {
        const spotifyResult = await syncSpotifyTracks(user.id);
        allCollectedTracks.push(...spotifyResult.tracks);
        response.providers.spotify = {
          playlists: spotifyResult.playlistsCount,
          tracks: spotifyResult.tracks.length,
        };
      } catch (err: any) {
        console.error('[Sync Spotify Error]', err);
        response.providers.spotify = { playlists: 0, tracks: 0, error: err.message };
      }
    }

    // Sync YouTube
    if (hasGoogle) {
      try {
        const ytResult = await syncYouTubeTracks(user.id);
        allCollectedTracks.push(...ytResult.tracks);
        response.providers.google = {
          playlists: ytResult.playlistsCount,
          tracks: ytResult.tracks.length,
        };
      } catch (err: any) {
        console.error('[Sync YouTube Error]', err);
        response.providers.google = { playlists: 0, tracks: 0, error: err.message };
      }
    }

    if (allCollectedTracks.length > 0) {
      const { inserted, total } = await db.upsertUserTracks(allCollectedTracks);
      response.new_tracks = inserted;
      response.synced_total = total;
    } else {
      const currentTracks = await db.getUserTracks(user.id);
      response.synced_total = currentTracks.length;
    }

    return NextResponse.json(response);
  } catch (error: any) {
    console.error('[Sync Route Error]', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
