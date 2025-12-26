/**
 * NextAuth.js API route handler
 *
 * Handles all authentication-related API requests.
 * Route: /api/auth/*
 */

import { handlers } from '@/lib/auth/config';

export const { GET, POST } = handlers;
