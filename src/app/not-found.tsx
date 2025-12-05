/**
 * Custom 404 page
 */

import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-bg-primary">
      <h1 className="text-4xl font-bold text-text-primary mb-4">404</h1>
      <p className="text-text-secondary mb-8">Page not found</p>
      <Link
        href="/"
        className="px-4 py-2 bg-accent-primary text-white rounded-lg hover:bg-accent-primary/90 transition-colors"
      >
        Go home
      </Link>
    </div>
  );
}
