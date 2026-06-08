import { notFound } from 'next/navigation';

interface ListingPageProps {
  params: Promise<{
    id: string;
  }>;
}

function parseListingId(value: string): number | null {
  if (!/^[1-9]\d*$/.test(value)) {
    return null;
  }

  const listingId = Number(value);
  return Number.isSafeInteger(listingId) ? listingId : null;
}

export default async function ListingPage({ params }: ListingPageProps) {
  const { id } = await params;
  const listingId = parseListingId(id);

  if (listingId === null) {
    notFound();
  }

  return (
    <main className="min-h-[100dvh] bg-gradient-to-br from-blue-50 to-indigo-100 pt-[max(1rem,env(safe-area-inset-top))] pr-[max(0.75rem,env(safe-area-inset-right))] pb-[max(1rem,env(safe-area-inset-bottom))] pl-[max(0.75rem,env(safe-area-inset-left))]">
      <section className="mx-auto flex min-h-[calc(100dvh-2rem)] w-full max-w-5xl flex-col gap-6 py-4">
        <header>
          <p className="text-sm font-medium text-indigo-700">Listing detail</p>
          <h1 className="mt-2 text-3xl font-semibold text-gray-950">
            Listing #{listingId}
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-gray-600">
            Detail content will be loaded from the listings API in the next frontend
            integration step.
          </p>
        </header>

        <div
          aria-label={`Listing ${listingId} image gallery placeholder`}
          className="h-[min(58vh,34rem)] min-h-80 rounded-lg border border-white/70 bg-white/70 p-4 shadow-sm"
        >
          <div className="flex h-full flex-col justify-end overflow-hidden rounded-md bg-gray-200 p-4">
            <div className="mb-auto h-10 w-10 rounded-full bg-gray-300" />
            <div className="h-4 w-40 rounded bg-gray-300" />
            <div className="mt-3 h-3 w-64 max-w-full rounded bg-gray-300" />
          </div>
        </div>

        <section
          aria-label="Listing facts placeholder"
          className="grid gap-3 sm:grid-cols-3"
        >
          {['Price', 'Bedrooms', 'Location'].map((label) => (
            <div
              className="rounded-lg border border-white/70 bg-white/75 p-4 shadow-sm"
              key={label}
            >
              <p className="text-xs font-medium uppercase text-gray-500">
                {label}
              </p>
              <div className="mt-3 h-4 w-24 rounded bg-gray-200" />
            </div>
          ))}
        </section>

        {/* FE-2 will replace this scaffold with server-loaded listing data. */}
      </section>
    </main>
  );
}
