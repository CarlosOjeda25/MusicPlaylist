import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, setUserSession, DEMO_USERS } from '@/lib/auth';
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
      available_users: DEMO_USERS,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { userId } = await req.json();
    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }

    await setUserSession(userId);
    const user = await getCurrentUser();
    return NextResponse.json({ success: true, user });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
