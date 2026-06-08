import ListingImageCarousel from '@/components/ListingImageCarousel';
import type { ListingDetailView } from '@/lib/listing-detail-view';

interface ListingDetailContentProps {
  view: ListingDetailView;
}

interface StatProps {
  label: string;
  value: number;
}

function Stat({ label, value }: StatProps) {
  return (
    <div className="flex flex-col">
      <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">
        {label}
      </dt>
      <dd className="mt-1 text-lg font-semibold text-gray-900">{value}</dd>
    </div>
  );
}

/**
 * Presentational detail page body. Every field is rendered from the pre-derived
 * view-model and any section whose value is null/empty is omitted entirely, so a
 * sparse listing never leaves empty chrome (PRO-255). Layout shift from images
 * is handled inside ListingImageCarousel (fixed aspect ratio).
 */
export default function ListingDetailContent({ view }: ListingDetailContentProps) {
  const hasStats = view.bedrooms !== null || view.bathrooms !== null;

  return (
    <main className="min-h-[100dvh] bg-gradient-to-br from-blue-50 to-indigo-100 pt-[max(1rem,env(safe-area-inset-top))] pr-[max(0.75rem,env(safe-area-inset-right))] pb-[max(1rem,env(safe-area-inset-bottom))] pl-[max(0.75rem,env(safe-area-inset-left))]">
      <section className="mx-auto flex w-full max-w-3xl flex-col gap-5 py-4">
        <ListingImageCarousel images={view.images} />

        {(view.title || view.price) && (
          <header className="flex flex-col gap-1">
            {view.title && (
              <h1 className="text-2xl font-semibold text-gray-950 sm:text-3xl">
                {view.title}
              </h1>
            )}
            {view.price && (
              <p
                data-testid="listing-price"
                className="text-xl font-bold text-indigo-700 sm:text-2xl"
              >
                {view.price}
              </p>
            )}
          </header>
        )}

        {view.tags.length > 0 && (
          <ul
            data-testid="listing-tags"
            className="flex flex-wrap gap-2"
            aria-label="Property features"
          >
            {view.tags.map((tag) => (
              <li
                key={tag}
                className="rounded-full bg-indigo-100 px-3 py-1 text-sm font-medium text-indigo-800"
              >
                {tag}
              </li>
            ))}
          </ul>
        )}

        {hasStats && (
          <dl
            data-testid="listing-stats"
            className="flex flex-wrap gap-x-10 gap-y-4 rounded-lg border border-white/70 bg-white/75 p-4 shadow-sm"
          >
            {view.bedrooms !== null && (
              <Stat label="Bedrooms" value={view.bedrooms} />
            )}
            {view.bathrooms !== null && (
              <Stat label="Bathrooms" value={view.bathrooms} />
            )}
          </dl>
        )}

        {view.location && (
          <p data-testid="listing-location" className="text-sm text-gray-600">
            {view.location}
          </p>
        )}

        {view.description && (
          <section data-testid="listing-description">
            <h2 className="sr-only">Description</h2>
            <p className="whitespace-pre-line text-base leading-relaxed text-gray-700">
              {view.description}
            </p>
          </section>
        )}
      </section>
    </main>
  );
}
