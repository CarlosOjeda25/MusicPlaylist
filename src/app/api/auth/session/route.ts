import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';

export async function GET() {
  try {
    const user = await getCurrentUser();
    const accounts = await db.getConnectedAccounts(user.id);
    const tracks = await db.getUserTracks(user.id);

    return NextResponse.json({
      user,
      connected: {
        spotify: accounts.some((a) => a.provider === 'spotify'),
        google: accounts.some((a) => a.provider === 'google'),
      },
      tracks_count: tracks.length,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
