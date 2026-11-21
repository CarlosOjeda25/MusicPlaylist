import { cookies } from 'next/headers';
import crypto from 'crypto';
import { User } from './types';
import { db } from './db';

const SESSION_COOKIE = 'radar_session_user';
const SESSION_SECRET = process.env.SESSION_SECRET || 'default_radar_session_secret_32b_dev!';

export function signUserId(userId: string): string {
  const signature = crypto.createHmac('sha256', SESSION_SECRET).update(userId).digest('hex');
  return `${userId}.${signature}`;
}

export function verifySessionCookie(cookieValue: string | undefined): string | null {
  if (!cookieValue) return null;
  const lastDot = cookieValue.lastIndexOf('.');
  if (lastDot === -1) return null;
  const userId = cookieValue.slice(0, lastDot);
  const signature = cookieValue.slice(lastDot + 1);
  if (!userId || !signature) return null;

  const expectedSignature = crypto.createHmac('sha256', SESSION_SECRET).update(userId).digest('hex');
  if (signature.length !== expectedSignature.length) return null;
  const valid = crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature));
  return valid ? userId : null;
}

export const DEFAULT_USER: User = {
  id: 'user_main',
  email: 'user@radar.audio',
  name: 'Usuario Principal',
  created_at: new Date().toISOString(),
};

export async function getCurrentUser(): Promise<User> {
  const cookieStore = await cookies();
  const rawCookie = cookieStore.get(SESSION_COOKIE)?.value;

  let userId: string;
  if (!rawCookie) {
    userId = DEFAULT_USER.id;
  } else {
    const verifiedUserId = verifySessionCookie(rawCookie);
    userId = verifiedUserId || DEFAULT_USER.id;
  }

  let user = await db.getUserById(userId);
  if (!user) {
    await db.upsertUser(DEFAULT_USER);
    user = DEFAULT_USER;
  }
  return user;
}

export async function setUserSession(userId: string) {
  const cookieStore = await cookies();
  const signedValue = signUserId(userId);
  cookieStore.set(SESSION_COOKIE, signedValue, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30, // 30 days
  });
}
