/**
 * Sign In Page
 *
 * A refined, minimal authentication page with subtle visual sophistication.
 * Features gradient accent, smooth animations, and cohesive dark theme.
 */

import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth/config';
import { SignInButton } from './signin-button';

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string; error?: string }>;
}) {
  const session = await auth();
  const params = await searchParams;

  // Redirect if already authenticated
  if (session?.user) {
    redirect(params.callbackUrl ?? '/');
  }

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-bg-primary">
      {/* Subtle gradient orb - adds depth without distraction */}
      <div
        className="pointer-events-none absolute -top-40 left-1/2 h-[500px] w-[800px] -translate-x-1/2 opacity-[0.15]"
        style={{
          background:
            'radial-gradient(ellipse at center, var(--color-accent-primary) 0%, transparent 70%)',
          filter: 'blur(80px)',
        }}
      />

      {/* Content container */}
      <div className="relative z-10 w-full max-w-[360px] px-6 animate-fade-in">
        {/* Branding */}
        <div className="mb-10 text-center">
          {/* Logo mark */}
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-bg-tertiary border border-border-default">
            <svg
              className="h-6 w-6 text-text-primary"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 2L2 7l10 5 10-5-10-5z" />
              <path d="M2 17l10 5 10-5" />
              <path d="M2 12l10 5 10-5" />
            </svg>
          </div>

          <h1 className="text-[22px] font-semibold tracking-tight text-text-primary">
            Welcome to Foundry
          </h1>
          <p className="mt-2 text-sm text-text-tertiary">
            Visual workflow builder for AI pipelines
          </p>
        </div>

        {/* Sign in card */}
        <div className="rounded-xl border border-border-default bg-bg-secondary/80 backdrop-blur-sm p-6">
          {/* Error message */}
          {params.error && (
            <div className="mb-5 rounded-lg bg-accent-error/10 border border-accent-error/20 px-4 py-3 animate-scale-in">
              <p className="text-sm text-accent-error">
                {params.error === 'OAuthSignin' &&
                  'Unable to initiate sign in. Please try again.'}
                {params.error === 'OAuthCallback' &&
                  'Authentication callback failed. Please try again.'}
                {params.error === 'OAuthCreateAccount' &&
                  'Could not create your account. Please try again.'}
                {params.error === 'Callback' && 'Authentication error occurred.'}
                {params.error === 'Default' && 'An unexpected error occurred.'}
                {!['OAuthSignin', 'OAuthCallback', 'OAuthCreateAccount', 'Callback', 'Default'].includes(
                  params.error
                ) && 'Authentication failed. Please try again.'}
              </p>
            </div>
          )}

          {/* Google Sign In Button */}
          <SignInButton callbackUrl={params.callbackUrl} />

          {/* Divider with text */}
          <div className="relative my-5">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border-subtle" />
            </div>
            <div className="relative flex justify-center">
              <span className="bg-bg-secondary px-3 text-xs text-text-muted">
                Secure authentication
              </span>
            </div>
          </div>

          {/* Security note */}
          <p className="text-center text-xs text-text-muted leading-relaxed">
            Your data is encrypted and protected.
            <br />
            We never share your information.
          </p>
        </div>

        {/* Footer */}
        <p className="mt-8 text-center text-[11px] text-text-muted">
          By signing in, you agree to our{' '}
          <span className="text-text-tertiary hover:text-text-secondary transition-colors cursor-pointer">
            Terms of Service
          </span>{' '}
          and{' '}
          <span className="text-text-tertiary hover:text-text-secondary transition-colors cursor-pointer">
            Privacy Policy
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
