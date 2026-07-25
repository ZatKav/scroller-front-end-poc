import type { ReactNode } from 'react';
import ListingImageCarousel from '@/components/ListingImageCarousel';
import type { ListingDetailView } from '@/lib/listing-detail-view';

interface ListingDetailContentProps {
  view: ListingDetailView;
  /** Optional content above the card (e.g. the feed's "Homes for you" header). */
  header?: ReactNode;
  /** Optional content below the card (e.g. feed controls, or a route CTA). */
  footer?: ReactNode;
}

/**
 * Compact "beds · baths" summary line, matching the Zelli MVP card meta row.
 * Only the parts we actually hold are shown; property type / chain from the
 * Figma mock have no backing field yet, so they are omitted rather than faked.
 */
function buildMetaLine(view: ListingDetailView): string | null {
  const parts: string[] = [];
  if (view.bedrooms !== null) {
    parts.push(`${view.bedrooms} bed`);
  }
  if (view.bathrooms !== null) {
    parts.push(`${view.bathrooms} bath`);
  }
  return parts.length > 0 ? parts.join(' · ') : null;
}

/**
 * Presentational listing card, shared by the discovery feed (ListingFlow) and
 * the standalone detail page. Styled to the Zelli MVP design (Figma 08/09):
 * cream page, white rounded card, ink title, magenta price. Every field is
 * rendered from the pre-derived view-model and any section whose value is
 * null/empty is omitted entirely, so a sparse listing never leaves empty chrome
 * (PRO-255). Layout shift from images is handled inside ListingImageCarousel.
 */
export default function ListingDetailContent({ view, header, footer }: ListingDetailContentProps) {
  const metaLine = buildMetaLine(view);

  return (
    <main className="min-h-[100dvh] bg-zelli-bg pt-[max(1rem,env(safe-area-inset-top))] pr-[max(0.75rem,env(safe-area-inset-right))] pb-[max(6rem,env(safe-area-inset-bottom))] pl-[max(0.75rem,env(safe-area-inset-left))]">
      <section className="mx-auto flex w-full max-w-[420px] flex-col gap-5 py-4">
        {header}

        <article className="flex flex-col gap-4 rounded-zelli-card border border-zelli-border bg-zelli-surface p-4 shadow-sm">
          <ListingImageCarousel key={view.id} images={view.images} />

          <div className="flex flex-col gap-3">
            {(view.title || view.location || view.price) && (
              <header className="flex flex-col gap-1">
                {view.title && (
                  <h1 className="text-xl font-bold leading-snug text-zelli-ink">
                    {view.title}
                  </h1>
                )}
                {view.location && (
                  <p data-testid="listing-location" className="text-[13px] text-zelli-muted">
                    {view.location}
                  </p>
                )}
                {view.price && (
                  <p
                    data-testid="listing-price"
                    className="text-lg font-bold text-zelli-primary"
                  >
                    {view.price}
                  </p>
                )}
              </header>
            )}

            {metaLine && (
              <p data-testid="listing-stats" className="text-xs font-bold text-zelli-ink">
                {metaLine}
              </p>
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
                    className="rounded-full border border-zelli-accent bg-zelli-accent-soft px-3 py-1 text-xs font-bold text-zelli-accent"
                  >
                    {tag}
                  </li>
                ))}
              </ul>
            )}

            {view.description && (
              <section data-testid="listing-description">
                <h2 className="sr-only">Description</h2>
                <p className="whitespace-pre-line text-sm leading-relaxed text-zelli-ink">
                  {view.description}
                </p>
              </section>
            )}
          </div>

          {footer}
        </article>
      </section>
    </main>
  );
}
