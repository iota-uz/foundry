/**
 * Edge-compatible NextAuth.js configuration
 *
 * This config is used by middleware (Edge runtime) and contains
 * only settings that don't require database access.
 */

import type { NextAuthConfig } from 'next-auth';
import Google from 'next-auth/providers/google';

export const authConfig: NextAuthConfig = {
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
  },
  callbacks: {
    authorized({ auth, request }) {
      const pathname = request.nextUrl.pathname;

      // Public pages
      if (pathname.startsWith('/auth/')) {
        return true;
      }

      // Public API routes (these have their own auth mechanisms)
      const publicApiPrefixes = ['/api/auth', '/api/webhooks', '/api/internal'];
      if (
        publicApiPrefixes.some((prefix) => pathname.startsWith(prefix)) ||
        pathname === '/api/health'
      ) {
        return true;
      }

      // All other routes require authentication
      return !!auth;
    },
  },
};
