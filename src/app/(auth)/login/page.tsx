'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { OAuthButtons } from '@/components/features/auth';

function LoginContent() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') || '/home';
  const error = searchParams.get('error');

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-sm rounded-lg border border-border bg-card p-8 shadow-lg">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-foreground">Welcome</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Sign in to continue to your reading journey
          </p>
        </div>

        {error && (
          <div className="mb-6 rounded-md bg-destructive/10 p-3 text-center text-sm text-destructive">
            {error === 'OAuthCallbackError'
              ? 'Authentication was cancelled or failed. Please try again.'
              : 'An error occurred during sign in. Please try again.'}
          </div>
        )}

        <OAuthButtons callbackUrl={callbackUrl} />

        <p className="mt-6 text-center text-xs text-muted-foreground">
          By signing in, you agree to our Terms of Service and Privacy Policy.
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <span className="h-8 w-8 animate-spin rounded-full border-4 border-current border-t-transparent" />
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  );
}
