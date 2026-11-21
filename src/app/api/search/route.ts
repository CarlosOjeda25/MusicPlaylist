import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { searchWithAI } from '@/lib/services/ai';
import { SearchResponse, UserTrack } from '@/lib/types';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const query = (body.query || '').trim();
    const mode = body.mode === 'ai' ? 'ai' : 'text';

    if (!query) {
      return NextResponse.json(
        { error: 'Search query is required' },
        { status: 400 }
      );
    }

    const user = await getCurrentUser();

    // Acceptance Criterion 1 & 2:
    // Only search songs belonging strictly to the authenticated user's catalog
    if (mode === 'text') {
      const matchedTracks = await db.searchUserTracks(user.id, query);

      const response: SearchResponse = {
        query,
        mode: 'text',
        tracks: matchedTracks,
        total: matchedTracks.length,
        message:
          matchedTracks.length > 0
            ? `Found ${matchedTracks.length} song(s) matching "${query}".`
            : `No matching songs found in your library for "${query}".`,
      };

      return NextResponse.json(response);
    }

    // AI Mode:
    // Fetch all tracks belonging strictly to user.id
    const userTracks = await db.getUserTracks(user.id);

    if (userTracks.length === 0) {
      const response: SearchResponse = {
        query,
        mode: 'ai',
        tracks: [],
        total: 0,
        message: 'Your personal catalog is empty. Connect Spotify or YouTube and sync playlists first!',
      };
      return NextResponse.json(response);
    }

    // Call AI curator passing EXCLUSIVELY this user's tracks
    const aiResult = await searchWithAI(query, userTracks);

    // Guaranteed Zero-Hallucination:
    // Look up the matched IDs strictly within this user's tracks
    const finalTracks = await db.getUserTracksByIds(user.id, aiResult.matchedIds);

    const response: SearchResponse = {
      query,
      mode: 'ai',
      tracks: finalTracks,
      total: finalTracks.length,
      reason: aiResult.reason,
      message:
        finalTracks.length > 0
          ? `Radar AI matched ${finalTracks.length} track(s) from your radar.`
          : `Radar AI found no tracks in your radar matching "${query}".`,
    };

    return NextResponse.json(response);
  } catch (error: any) {
    console.error('[Search API Error]', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
