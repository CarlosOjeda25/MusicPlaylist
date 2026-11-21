import { cookies } from 'next/headers';
import { User } from './types';
import { db } from './db';

const SESSION_COOKIE = 'radar_session_user';

// Pre-seeded mock users for instant development and testing
export const DEMO_USERS: User[] = [
  {
    id: 'user_alex',
    email: 'alex@radar.music',
    name: 'Alex Rivera',
    created_at: new Date().toISOString(),
  },
  {
    id: 'user_beatriz',
    email: 'beatriz@radar.music',
    name: 'Beatriz Gomez',
    created_at: new Date().toISOString(),
  },
];

/**
 * Retrieves the currently active user from the session cookie.
 * Defaults to the first demo user if no cookie is set, ensuring frictionless local preview.
 */
export async function getCurrentUser(): Promise<User> {
  const cookieStore = await cookies();
  const userId = cookieStore.get(SESSION_COOKIE)?.value || DEMO_USERS[0].id;

  let user = await db.getUserById(userId);
  if (!user) {
    const defaultUser = DEMO_USERS.find((u) => u.id === userId) || DEMO_USERS[0];
    await db.upsertUser(defaultUser);
    user = defaultUser;
  }
  return user;
}

/**
 * Sets the active session cookie for a given user ID.
 */
export async function setUserSession(userId: string) {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, userId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30, // 30 days
  });
}
