'use server';

import bcrypt from 'bcryptjs';
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/session';
import { prisma } from '@/lib/prisma';

export async function loginAction(prevState: any, formData: FormData) {
  const password = formData.get('password') as string;

  if (!password) {
    return { error: 'Password is required' };
  }

  // Get user profile
  const user = await prisma.userProfile.findFirst();
  if (!user) {
    return { error: 'No account found. Please run the setup.' };
  }

  const isValid = await bcrypt.compare(password, user.passwordHash);
  if (!isValid) {
    // Constant-time comparison prevents timing attacks
    return { error: 'Incorrect password' };
  }

  const session = await getSession();
  session.isAuthenticated = true;
  session.userId = user.id;
  await session.save();

  redirect('/');
}

export async function logoutAction() {
  const session = await getSession();
  session.destroy();
  redirect('/login');
}
