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
    <main className="flex min-h-[100dvh] items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 px-4 py-8">
      <section className="w-full max-w-md rounded-lg border border-white/70 bg-white/85 p-6 text-center shadow-sm">
        <h1 className="text-2xl font-semibold text-gray-950">Listing could not load</h1>
        <p className="mt-3 text-sm text-gray-600">
          {error.message || 'Something went wrong while preparing this listing.'}
        </p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <button
            className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
            onClick={reset}
            type="button"
          >
            Try again
          </button>
          <Link
            className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            href={appPath('/')}
          >
            Back to feed
          </Link>
        </div>
      </section>
    </main>
  );
}
