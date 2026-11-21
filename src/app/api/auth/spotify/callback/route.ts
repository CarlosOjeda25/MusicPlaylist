import { NextRequest, NextResponse } from 'next/server';
import { exchangeSpotifyCode, verifySpotifyState } from '@/lib/services/spotify';
import { getCurrentUser } from '@/lib/auth';
import { encryptToken } from '@/lib/crypto';
import { db } from '@/lib/db';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');
  const cookieState = req.cookies.get('oauth_state_spotify')?.value;

  if (error || !code) {
    const res = NextResponse.redirect(new URL(`/?error=${encodeURIComponent(error || 'missing_code')}`, req.url));
    res.cookies.delete('oauth_state_spotify');
    return res;
  }

  // Cryptographic signature and cookie-matching anti-CSRF check
  if (!state || !cookieState || state !== cookieState || !verifySpotifyState(state)) {
    const res = NextResponse.redirect(new URL('/?error=invalid_state', req.url));
    res.cookies.delete('oauth_state_spotify');
    return res;
  }

  try {
    const user = await getCurrentUser();
    const tokenData = await exchangeSpotifyCode(code);
    const now = Math.floor(Date.now() / 1000);

    const existingAccount = await db.getConnectedAccount(user.id, 'spotify');
    const refreshTokenEnc = tokenData.refreshToken
      ? encryptToken(tokenData.refreshToken)
      : (existingAccount?.refresh_token_enc || '');

    await db.saveConnectedAccount({
      user_id: user.id,
      provider: 'spotify',
      access_token_enc: encryptToken(tokenData.accessToken),
      refresh_token_enc: refreshTokenEnc,
      expires_at: now + tokenData.expiresIn,
      updated_at: new Date().toISOString(),
    });

    const res = NextResponse.redirect(new URL('/?connected=spotify', req.url));
    res.cookies.delete('oauth_state_spotify');
    return res;
  } catch (err: any) {
    console.error('[Spotify Callback Error]', err);
    const res = NextResponse.redirect(new URL(`/?error=${encodeURIComponent(err.message)}`, req.url));
    res.cookies.delete('oauth_state_spotify');
    return res;
  }
}
