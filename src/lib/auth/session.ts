/**
 * Session helper functions
 *
 * Utilities for accessing session state and requiring authentication.
 */

import { auth } from './config';
import { redirect } from 'next/navigation';

/**
 * Require authentication and redirect to sign-in if not authenticated
 *
 * @returns Session object (guaranteed to exist)
 */
export async function requireAuth() {
  const session = await auth();
  if (!session?.user) {
    redirect('/auth/signin');
  }
  return session;
}

/**
 * Get the current user or redirect to sign-in
 *
 * @returns User object (guaranteed to exist)
 */
export async function getCurrentUser() {
  const session = await requireAuth();
  return session.user;
}
