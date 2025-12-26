/**
 * Authentication Error Page
 *
 * Displays authentication errors with a clear path to retry.
 * Maintains the same refined aesthetic as the sign-in page.
 */

import Link from 'next/link';

const errorMessages: Record<string, { title: string; description: string }> = {
  Configuration: {
    title: 'Configuration Error',
    description: 'There is a problem with the server configuration. Please contact support.',
  },
  AccessDenied: {
    title: 'Access Denied',
    description: 'You do not have permission to sign in. Please contact your administrator.',
  },
  Verification: {
    title: 'Verification Failed',
    description: 'The verification link may have expired or already been used.',
  },
  OAuthSignin: {
    title: 'Sign In Error',
    description: 'Could not initiate the sign in process. Please try again.',
  },
  OAuthCallback: {
    title: 'Callback Error',
    description: 'There was a problem processing the authentication callback.',
  },
  OAuthCreateAccount: {
    title: 'Account Creation Failed',
    description: 'Could not create your account. The email may already be in use.',
  },
  Callback: {
    title: 'Callback Error',
    description: 'There was a problem with the authentication callback.',
  },
  Default: {
    title: 'Authentication Error',
    description: 'An unexpected error occurred during authentication.',
  },
};

export default async function AuthErrorPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  const errorKey = params.error ?? 'Default';
  const defaultError = { title: 'Authentication Error', description: 'An unexpected error occurred.' };
  const errorInfo = errorMessages[errorKey] ?? defaultError;

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-bg-primary">
      {/* Subtle red gradient orb for error state */}
      <div
        className="pointer-events-none absolute -top-40 left-1/2 h-[500px] w-[800px] -translate-x-1/2 opacity-[0.12]"
        style={{
          background:
            'radial-gradient(ellipse at center, var(--color-accent-error) 0%, transparent 70%)',
          filter: 'blur(80px)',
        }}
      />

      {/* Content container */}
      <div className="relative z-10 w-full max-w-[360px] px-6 animate-fade-in">
        {/* Error card */}
        <div className="rounded-xl border border-border-default bg-bg-secondary/80 backdrop-blur-sm p-6 text-center">
          {/* Error icon */}
          <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-full bg-accent-error/10 border border-accent-error/20">
            <svg
              className="h-6 w-6 text-accent-error"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>

          {/* Error message */}
          <h1 className="text-lg font-semibold text-text-primary mb-2">
            {errorInfo.title}
          </h1>
          <p className="text-sm text-text-tertiary mb-6 leading-relaxed">
            {errorInfo.description}
          </p>

          {/* Actions */}
          <div className="space-y-3">
            <Link
              href="/auth/signin"
              className={`
                flex w-full items-center justify-center gap-2
                h-10 px-4 rounded-lg
                bg-text-primary text-bg-primary
                font-medium text-[14px]
                transition-all duration-150
                hover:bg-text-secondary
                focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary focus-visible:ring-offset-2 focus-visible:ring-offset-bg-secondary
              `}
            >
              <svg
                className="h-4 w-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M19 12H5" />
                <path d="M12 19l-7-7 7-7" />
              </svg>
              Try Again
            </Link>

            <Link
              href="/"
              className={`
                flex w-full items-center justify-center
                h-10 px-4 rounded-lg
                text-text-secondary text-[14px]
                transition-all duration-150
                hover:text-text-primary hover:bg-bg-hover
                focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary
              `}
            >
              Return Home
            </Link>
          </div>
        </div>

        {/* Help text */}
        <p className="mt-6 text-center text-[11px] text-text-muted">
          If this problem persists, please{' '}
          <span className="text-text-tertiary hover:text-text-secondary transition-colors cursor-pointer">
            contact support
          </span>
        </p>
      </div>

      {/* Subtle grid pattern overlay */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage: `
            linear-gradient(var(--color-text-primary) 1px, transparent 1px),
            linear-gradient(90deg, var(--color-text-primary) 1px, transparent 1px)
          `,
          backgroundSize: '60px 60px',
        }}
      />
    </div>
  );
}
