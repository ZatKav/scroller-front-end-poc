'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { appPath } from '@/lib/base-path';

interface ErrorPageProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function ErrorPage({ error, reset }: ErrorPageProps) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="flex min-h-[100dvh] items-center justify-center bg-zelli-bg px-6 py-8">
      <section className="w-full max-w-[420px] rounded-zelli-card border border-zelli-border bg-zelli-surface p-6 text-center shadow-sm">
        <h1 className="text-2xl font-bold text-zelli-ink">Listing could not load</h1>
        <p className="mt-3 text-sm text-zelli-muted">
          {error.message || 'Something went wrong while preparing this listing.'}
        </p>
        <div className="mt-6 flex flex-col gap-3">
          <button
            type="button"
            onClick={reset}
            className="flex h-[52px] w-full items-center justify-center rounded-zelli-btn bg-zelli-primary text-base font-bold text-white transition-colors hover:bg-zelli-primary-hover"
          >
            Try again
          </button>
          <Link
            href={appPath('/listings')}
            className="flex h-[52px] w-full items-center justify-center rounded-zelli-btn border border-zelli-border bg-zelli-surface text-base font-bold text-zelli-ink transition-colors hover:border-zelli-ink"
          >
            Back to feed
          </Link>
        </div>
      </section>
    </main>
  );
}
