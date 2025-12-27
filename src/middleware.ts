/**
 * NextAuth.js middleware
 *
 * Uses edge-compatible config (no database adapter) for route protection.
 * The `authorized` callback in auth.config.ts handles authentication checks.
 */

import NextAuth from 'next-auth';
import { authConfig } from '@/lib/auth/auth.config';

export const { auth: middleware } = NextAuth(authConfig);

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
