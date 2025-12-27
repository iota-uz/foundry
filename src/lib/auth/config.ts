/**
 * NextAuth.js v5 configuration
 *
 * Full configuration with database adapter.
 * Uses JWT session strategy for Edge middleware compatibility.
 */

import NextAuth from 'next-auth';
import { DrizzleAdapter } from '@auth/drizzle-adapter';
import { getDatabase } from '@/lib/db/client';
import * as schema from '@/lib/db/schema/users';
import { authConfig } from './auth.config';

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: DrizzleAdapter(getDatabase(), {
    usersTable: schema.users,
    accountsTable: schema.accounts,
    sessionsTable: schema.sessions,
    verificationTokensTable: schema.verificationTokens,
  }),
  callbacks: {
    ...authConfig.callbacks,
    async jwt({ token, user }) {
      // Add user ID to JWT token on sign in
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      // Add user ID from JWT token to session
      if (session.user && token.id) {
        session.user.id = token.id as string;
      }
      return session;
    },
  },
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
});
