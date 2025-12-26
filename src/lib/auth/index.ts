/**
 * Authentication module exports
 *
 * Re-exports NextAuth.js configuration and session utilities.
 */

export { auth, signIn, signOut } from './config';
export { requireAuth, getCurrentUser } from './session';
