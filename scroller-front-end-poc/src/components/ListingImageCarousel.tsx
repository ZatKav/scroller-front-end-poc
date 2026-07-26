'use client';

import { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { mediaSrcSet, mediaUrl } from '@/lib/media-url';

// Horizontal swipe gesture tuning, reused from ImageScroller (PRO-236): a swipe
// only counts when it travels at least SWIPE_MIN_DISTANCE_PX horizontally AND its
// horizontal travel dominates its vertical travel by SWIPE_HORIZONTAL_RATIO. This
// keeps short taps and ordinary vertical page scrolling from being misread as a
// navigation. Here the gesture moves between a listing's images rather than
// recording a Like/Skip: swipe left advances, swipe right goes back (PRO-254).
const SWIPE_MIN_DISTANCE_PX = 60;
const SWIPE_HORIZONTAL_RATIO = 1.5;

// Listings can carry dozens of images, and one dot each overflows the row on a
// phone. Above MAX_VISIBLE_DOTS the row becomes a sliding window of that many
// dots flanked by previous/next arrows — at most 9 controls under the image.
const MAX_VISIBLE_DOTS = 7;

// First index of the dot window: keeps the active dot centred, clamped so the
// window never runs off either end of the list (so the first and last images
// still show a full window).
function dotWindowStart(activeIndex: number, total: number): number {
  if (total <= MAX_VISIBLE_DOTS) {
    return 0;
  }
  const centred = activeIndex - Math.floor(MAX_VISIBLE_DOTS / 2);
  return Math.max(0, Math.min(centred, total - MAX_VISIBLE_DOTS));
}

// A single image in the carousel. Deliberately minimal and local so this
// component does not depend on the enrichment-db client/types (FE-2); the detail
// page (FE-3) maps its data onto this shape.
//
// `contentHash` addresses the pre-rendered display variants served from /media.
// It replaced an inline base64 `image_data` string: those could not be cached,
// lazy-loaded or size-selected, so every listing shipped full-resolution bytes
// for images the user never looked at.
export interface CarouselImage {
  contentHash: string;
  alt?: string;
  /** Intrinsic master dimensions, used to reserve layout space. */
  width?: number | null;
  height?: number | null;
}

interface ListingImageCarouselProps {
  images: CarouselImage[];
}

// Presentation-only image gallery: swipe/touch, paging dots and left/right
// keyboard arrows move between a listing's images. It records nothing and makes
// no API calls — that is what separates it from ImageScroller (PRO-254).
export default function ListingImageCarousel({ images }: ListingImageCarouselProps) {
  // Drop unaddressable images so the dots and navigation only ever reflect
  // renderable images, never a broken <img> (PRO-254).
  const renderable = images.filter((image) => Boolean(image.contentHash));

  const [currentIndex, setCurrentIndex] = useState(0);

  // Start point of an active single-finger touch, or null when no qualifying
  // gesture is in progress. Mirrors ImageScroller's touch plumbing (PRO-236).
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  // Keep the index in range when the renderable set shrinks (e.g. a new, shorter
  // images prop), so we never point past the end of the list.
  useEffect(() => {
    setCurrentIndex((prev) => Math.min(prev, Math.max(0, renderable.length - 1)));
  }, [renderable.length]);

  if (renderable.length === 0) {
    return (
      <div
        data-testid="carousel-empty"
        className="flex aspect-[4/3] w-full items-center justify-center rounded-lg bg-gray-100"
      >
        <p className="text-sm text-gray-500">No images available</p>
      </div>
    );
  }

  // Clamp during render too: the prop can change between the render that shrinks
  // `renderable` and the effect above that corrects the index.
  const activeIndex = Math.min(currentIndex, renderable.length - 1);
  const currentImage = renderable[activeIndex];
  const hasMultiple = renderable.length > 1;
  const showDotArrows = renderable.length > MAX_VISIBLE_DOTS;
  const windowStart = dotWindowStart(activeIndex, renderable.length);
  // The next and previous images, which are the only ones a swipe or arrow can
  // reach in one step. Deliberately not the whole set: preloading 30 images
  // would recreate the very problem this change removes.
  const preloadHashes = [renderable[activeIndex + 1], renderable[activeIndex - 1]]
    .filter((image): image is CarouselImage => Boolean(image))
    .map((image) => image.contentHash);
  const visibleDotIndexes = renderable
    .slice(windowStart, windowStart + MAX_VISIBLE_DOTS)
    .map((_, offset) => windowStart + offset);

  function goToIndex(index: number) {
    setCurrentIndex(Math.max(0, Math.min(index, renderable.length - 1)));
  }

  function goNext() {
    goToIndex(activeIndex + 1);
  }

  function goPrevious() {
    goToIndex(activeIndex - 1);
  }

  function handleTouchStart(event: React.TouchEvent<HTMLDivElement>) {
    // Ignore multi-touch gestures (e.g. pinch-zoom) so they never resolve into a
    // navigation (PRO-236).
    if (event.touches.length !== 1) {
      touchStartRef.current = null;
      return;
    }
    const touch = event.touches[0];
    touchStartRef.current = { x: touch.clientX, y: touch.clientY };
  }

  function handleTouchEnd(event: React.TouchEvent<HTMLDivElement>) {
    const start = touchStartRef.current;
    touchStartRef.current = null;
    if (!start) {
      return;
    }

    const touch = event.changedTouches[0];
    if (!touch) {
      return;
    }

    const deltaX = touch.clientX - start.x;
    const deltaY = touch.clientY - start.y;
    const absX = Math.abs(deltaX);
    const absY = Math.abs(deltaY);

    // Ignore short drags and mostly-vertical drags so ordinary page scrolling is
    // never converted into a navigation (PRO-236).
    if (absX < SWIPE_MIN_DISTANCE_PX || absX < absY * SWIPE_HORIZONTAL_RATIO) {
      return;
    }

    // Suppress the synthetic click a browser fires after a consumed touch swipe,
    // so the swipe is not also read as a tap (PRO-236).
    event.preventDefault();
    if (deltaX < 0) {
      goNext();
    } else {
      goPrevious();
    }
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'ArrowRight') {
      event.preventDefault();
      goNext();
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault();
      goPrevious();
    }
  }

  return (
    <div className="flex w-full flex-col items-center gap-3">
      {/* Fixed aspect-ratio viewport with object-contain: the frame keeps a stable
          size as images of differing intrinsic dimensions are shown, so neither
          the carousel nor the surrounding page content shifts (no CLS) (PRO-254). */}
      <div
        data-testid="carousel-viewport"
        role="group"
        aria-roledescription="carousel"
        aria-label="Listing image carousel"
        tabIndex={0}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onKeyDown={handleKeyDown}
        className="relative aspect-[4/3] w-full overflow-hidden rounded-lg bg-gray-100 shadow-md focus:outline focus:outline-2 focus:outline-blue-500"
      >
        <img
          data-testid="carousel-image"
          // Keyed by hash so React swaps the element rather than mutating src
          // on one node, which would otherwise show the previous image until
          // the new one decodes.
          key={currentImage.contentHash}
          src={mediaUrl(currentImage.contentHash, 'card')}
          srcSet={mediaSrcSet(currentImage.contentHash)}
          // Describes the real slot so the browser can pick the smallest
          // candidate that covers it. The card is max-w-[420px] with p-4, and
          // the page adds px-3, so the image box is 100vw-56px until the card
          // stops growing, then a fixed 388px. Without `sizes` the browser
          // assumes full viewport width and always over-fetches.
          sizes="(max-width: 448px) calc(100vw - 56px), 388px"
          // Intrinsic size lets the browser reserve the right box before the
          // bytes arrive. The aspect-ratio frame already prevents shift, so
          // these are belt-and-braces for when the frame is not applied.
          width={currentImage.width ?? undefined}
          height={currentImage.height ?? undefined}
          alt={currentImage.alt || 'Listing image'}
          // The visible image is the point of the page: fetch it first and
          // decode it off the critical path.
          // React 18's DOM typings predate fetchpriority. The attribute is
          // valid HTML and browsers honour it, so it is spread in directly.
          {...({ fetchpriority: 'high' } as { fetchpriority: string })}
          decoding="async"
          className="h-full w-full object-contain"
        />
        {/* Warm the neighbours so a swipe is an already-decoded image rather
            than a cold fetch. Only the current image was ever in the DOM
            before, which made every swipe wait on a full download and decode.
            These are hidden and lazily fetched, so they cost nothing visually
            and never compete with the visible image. */}
        {preloadHashes.map((hash) => (
          <img
            key={`preload-${hash}`}
            data-testid="carousel-preload"
            src={mediaUrl(hash, 'card')}
            srcSet={mediaSrcSet(hash)}
            sizes="(max-width: 448px) calc(100vw - 56px), 388px"
            alt=""
            aria-hidden="true"
            loading="lazy"
            decoding="async"
            className="pointer-events-none absolute h-px w-px opacity-0"
          />
        ))}
      </div>
      {/* Announce the current position for assistive tech as it changes (PRO-254). */}
      <p data-testid="carousel-status" role="status" className="sr-only">
        Image {activeIndex + 1} of {renderable.length}
      </p>
      {/* Paging dots: real, labelled, focusable controls. Hidden when there is
          nothing to page between (PRO-254). Past MAX_VISIBLE_DOTS images the row
          is a sliding window flanked by previous/next arrows, which step one
          image at a time and are disabled at the ends of the list. */}
      {hasMultiple && (
        <div className="flex items-center justify-center gap-2">
          {showDotArrows && (
            <button
              type="button"
              data-testid="carousel-dots-previous"
              aria-label="Previous image"
              onClick={goPrevious}
              disabled={activeIndex === 0}
              className="flex h-6 w-6 items-center justify-center rounded-full text-gray-500 transition-colors hover:text-gray-800 focus:outline focus:outline-2 focus:outline-blue-500 disabled:cursor-not-allowed disabled:opacity-30"
            >
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            </button>
          )}
          <div
            data-testid="carousel-dots"
            className="flex items-center justify-center gap-2"
          >
            {visibleDotIndexes.map((index) => {
              const isCurrent = index === activeIndex;
              return (
                <button
                  key={index}
                  type="button"
                  data-testid={`carousel-dot-${index}`}
                  aria-label={`Go to image ${index + 1}`}
                  aria-current={isCurrent ? 'true' : undefined}
                  onClick={() => goToIndex(index)}
                  className={`h-2.5 w-2.5 rounded-full transition-colors focus:outline focus:outline-2 focus:outline-blue-500 ${
                    isCurrent ? 'bg-gray-800' : 'bg-gray-300 hover:bg-gray-400'
                  }`}
                />
              );
            })}
          </div>
          {showDotArrows && (
            <button
              type="button"
              data-testid="carousel-dots-next"
              aria-label="Next image"
              onClick={goNext}
              disabled={activeIndex === renderable.length - 1}
              className="flex h-6 w-6 items-center justify-center rounded-full text-gray-500 transition-colors hover:text-gray-800 focus:outline focus:outline-2 focus:outline-blue-500 disabled:cursor-not-allowed disabled:opacity-30"
            >
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
