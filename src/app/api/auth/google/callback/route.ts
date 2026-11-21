import { NextRequest, NextResponse } from 'next/server';
import { exchangeGoogleCode } from '@/lib/services/youtube';
import { getCurrentUser } from '@/lib/auth';
import { encryptToken } from '@/lib/crypto';
import { db } from '@/lib/db';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get('code');
  const error = searchParams.get('error');

  if (error || !code) {
    return NextResponse.redirect(new URL(`/?error=${encodeURIComponent(error || 'missing_code')}`, req.url));
  }

  try {
    const user = await getCurrentUser();
    const tokenData = await exchangeGoogleCode(code);
    const now = Math.floor(Date.now() / 1000);

    await db.saveConnectedAccount({
      user_id: user.id,
      provider: 'google',
      access_token_enc: encryptToken(tokenData.accessToken),
      refresh_token_enc: encryptToken(tokenData.refreshToken),
      expires_at: now + tokenData.expiresIn,
      updated_at: new Date().toISOString(),
    });

    return NextResponse.redirect(new URL('/?connected=google', req.url));
  } catch (err: any) {
    console.error('[Google Callback Error]', err);
    return NextResponse.redirect(new URL(`/?error=${encodeURIComponent(err.message)}`, req.url));
  }
}
