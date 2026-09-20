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
  // Authentication disabled per user request - always return authenticated session
  const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
  session.isAuthenticated = true; 
  session.userId = 1;
  return session;
}

export async function requireAuth() {
  // Authentication disabled
  return { isAuthenticated: true, userId: 1 };
}
