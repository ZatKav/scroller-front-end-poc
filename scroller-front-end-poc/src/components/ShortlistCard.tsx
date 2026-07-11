import Link from 'next/link';
import type { ListingDetailView } from '@/lib/listing-detail-view';

interface ShortlistCardProps {
  view: ListingDetailView;
  /** Shown under the price, e.g. "Saved 2 days ago" or "Maybe · 2 days ago". */
  metaLabel: string;
  /** 'saved' shows a magenta heart, 'maybe' shows a "?" marker. */
  variant: 'saved' | 'maybe';
}

function thumbnailSrc(view: ListingDetailView): string | null {
  const first = view.images[0]?.image_data;
  if (!first) {
    return null;
  }
  return first.startsWith('data:') ? first : `data:image/jpeg;base64,${first}`;
}

/** Compact horizontal listing row used on the shortlist (Figma 10/11). Tapping it
 *  opens the full detail page. */
export default function ShortlistCard({ view, metaLabel, variant }: ShortlistCardProps) {
  const src = thumbnailSrc(view);

  return (
    <Link
      href={`/listing/${view.id}`}
      className="flex gap-3 rounded-zelli-card border border-zelli-border bg-zelli-surface p-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-zelli-accent"
    >
      <div className="h-[88px] w-[104px] shrink-0 overflow-hidden rounded-xl bg-zelli-accent-soft">
        {src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={src} alt={view.title ?? 'Listing image'} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-xs font-bold text-zelli-accent">
            Image
          </div>
        )}
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-start justify-between gap-2">
          {view.title && (
            <p className="line-clamp-2 text-sm font-bold leading-snug text-zelli-ink">
              {view.title}
            </p>
          )}
          <span
            aria-hidden
            className={`shrink-0 text-lg leading-none ${
              variant === 'saved' ? 'text-zelli-primary' : 'text-zelli-accent'
            }`}
          >
            {variant === 'saved' ? '♥' : '?'}
          </span>
        </div>
        {view.price && (
          <p className="mt-1 text-sm font-bold text-zelli-primary">{view.price}</p>
        )}
        {view.location && (
          <p className="truncate text-xs text-zelli-muted">{view.location}</p>
        )}
        <p className="mt-auto pt-1 text-xs text-zelli-muted">{metaLabel}</p>
      </div>
    </Link>
  );
}
