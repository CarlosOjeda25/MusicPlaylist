import { NextRequest, NextResponse } from 'next/server';
import { exchangeGoogleCode, verifyGoogleState } from '@/lib/services/youtube';
import { getCurrentUser } from '@/lib/auth';
import { encryptToken } from '@/lib/crypto';
import { db } from '@/lib/db';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');
  const cookieState = req.cookies.get('oauth_state_google')?.value;

  if (error || !code) {
    const res = NextResponse.redirect(new URL(`/?error=${encodeURIComponent(error || 'missing_code')}`, req.url));
    res.cookies.delete('oauth_state_google');
    return res;
  }

  // Cryptographic signature and cookie-matching anti-CSRF check
  if (!state || !cookieState || state !== cookieState || !verifyGoogleState(state)) {
    const res = NextResponse.redirect(new URL('/?error=invalid_state', req.url));
    res.cookies.delete('oauth_state_google');
    return res;
  }

  try {
    const user = await getCurrentUser();
    const tokenData = await exchangeGoogleCode(code);
    const now = Math.floor(Date.now() / 1000);

    const existingAccount = await db.getConnectedAccount(user.id, 'google');
    const refreshTokenEnc = tokenData.refreshToken
      ? encryptToken(tokenData.refreshToken)
      : (existingAccount?.refresh_token_enc || '');

    await db.saveConnectedAccount({
      user_id: user.id,
      provider: 'google',
      access_token_enc: encryptToken(tokenData.accessToken),
      refresh_token_enc: refreshTokenEnc,
      expires_at: now + tokenData.expiresIn,
      updated_at: new Date().toISOString(),
    });

    const res = NextResponse.redirect(new URL('/?connected=google', req.url));
    res.cookies.delete('oauth_state_google');
    return res;
  } catch (err: any) {
    console.error('[Google Callback Error]', err);
    const res = NextResponse.redirect(new URL(`/?error=${encodeURIComponent(err.message)}`, req.url));
    res.cookies.delete('oauth_state_google');
    return res;
  }
}
