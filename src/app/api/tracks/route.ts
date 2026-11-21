import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';

export async function GET() {
  try {
    const user = await getCurrentUser();
    // Multi-tenant guarantee: always query strictly by user.id
    const tracks = await db.getUserTracks(user.id);

    return NextResponse.json({
      user_id: user.id,
      tracks,
      total: tracks.length,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
