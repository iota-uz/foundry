/**
 * NextAuth.js middleware
 *
 * Protects routes from unauthorized access and handles authentication redirects.
 */

import { auth } from '@/lib/auth/config';
import { NextResponse } from 'next/server';

export default auth((req) => {
  const isAuthenticated = !!req.auth;
  const pathname = req.nextUrl.pathname;

  // Public routes
  const publicRoutes = ['/auth/signin', '/auth/error'];
  const isPublicRoute = publicRoutes.some((route) => pathname.startsWith(route));

  // Allow public API routes
  if (pathname.startsWith('/api/auth') || pathname === '/api/health') {
    return NextResponse.next();
  }

  // Redirect unauthenticated users
  if (!isAuthenticated && !isPublicRoute) {
    const signInUrl = new URL('/auth/signin', req.url);
    signInUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(signInUrl);
  }

  // Redirect authenticated users from signin
  if (isAuthenticated && pathname === '/auth/signin') {
    return NextResponse.redirect(new URL('/', req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
