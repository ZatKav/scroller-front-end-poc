import Link from 'next/link';
import { appPath } from '@/lib/base-path';

export default function NotFound() {
  return (
    <main className="flex min-h-[100dvh] items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 px-4 py-8">
      <section className="w-full max-w-md rounded-lg border border-white/70 bg-white/85 p-6 text-center shadow-sm">
        <h1 className="text-2xl font-semibold text-gray-950">Listing not found</h1>
        <p className="mt-3 text-sm text-gray-600">
          Check the listing id and return to the feed when you are ready.
        </p>
        <Link
          className="mt-6 inline-flex rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
          href={appPath('/')}
        >
          Back to feed
        </Link>
      </section>
    </main>
  );
}
