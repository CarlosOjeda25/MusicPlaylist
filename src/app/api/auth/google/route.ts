import { NextResponse } from 'next/server';
import { getGoogleAuthUrl } from '@/lib/services/youtube';

export async function GET() {
  if (!process.env.GOOGLE_CLIENT_ID) {
    return NextResponse.json(
      { error: 'GOOGLE_CLIENT_ID is not configured in .env' },
      { status: 500 }
    );
  }
  const url = getGoogleAuthUrl();
  return NextResponse.redirect(url);
}
