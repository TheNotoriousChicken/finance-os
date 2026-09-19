import { getIronSession } from 'iron-session';
import { cookies } from 'next/headers';

export interface SessionData {
  isAuthenticated: boolean;
  userId?: number;
}

const sessionOptions = {
  password: process.env.SESSION_SECRET ?? 'complex-password-at-least-32-chars-dev',
  cookieName: 'finance_os_session',
  cookieOptions: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'lax' as const,
    maxAge: 60 * 60 * 24 * 30, // 30 days
  },
};

export async function getSession() {
  return getIronSession<SessionData>(await cookies(), sessionOptions);
}

export async function requireAuth() {
  const session = await getSession();
  if (!session.isAuthenticated) {
    throw new Error('Unauthorized');
  }
  return session;
}
