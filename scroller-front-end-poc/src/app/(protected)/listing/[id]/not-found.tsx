import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="flex min-h-[100dvh] items-center justify-center bg-zelli-bg px-6 py-8">
      <section className="w-full max-w-[420px] rounded-zelli-card border border-zelli-border bg-zelli-surface p-6 text-center shadow-sm">
        <h1 className="text-2xl font-bold text-zelli-ink">Listing not found</h1>
        <p className="mt-3 text-sm text-zelli-muted">
          Check the listing id and return to the feed when you are ready.
        </p>
        <Link
          href="/listings"
          className="mt-6 inline-flex h-[52px] items-center justify-center rounded-zelli-btn bg-zelli-primary px-6 text-base font-bold text-white transition-colors hover:bg-zelli-primary-hover"
        >
          Back to feed
        </Link>
      </section>
    </main>
  );
}
