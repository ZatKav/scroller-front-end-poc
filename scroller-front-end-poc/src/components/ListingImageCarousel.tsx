'use client';

import { useEffect, useRef, useState } from 'react';

// Horizontal swipe gesture tuning, reused from ImageScroller (PRO-236): a swipe
// only counts when it travels at least SWIPE_MIN_DISTANCE_PX horizontally AND its
// horizontal travel dominates its vertical travel by SWIPE_HORIZONTAL_RATIO. This
// keeps short taps and ordinary vertical page scrolling from being misread as a
// navigation. Here the gesture moves between a listing's images rather than
// recording a Like/Skip: swipe left advances, swipe right goes back (PRO-254).
const SWIPE_MIN_DISTANCE_PX = 60;
const SWIPE_HORIZONTAL_RATIO = 1.5;

// A single image in the carousel. Deliberately minimal and local so this
// component does not depend on the enrichment-db client/types (FE-2); the detail
// page (FE-3) maps its data onto this shape. `image_data` is raw base64 or an
// already-prefixed `data:` URI (PRO-254).
export interface CarouselImage {
  image_data: string;
  alt?: string;
}

interface ListingImageCarouselProps {
  images: CarouselImage[];
}

// Presentation-only image gallery: swipe/touch, paging dots and left/right
// keyboard arrows move between a listing's images. It records nothing and makes
// no API calls — that is what separates it from ImageScroller (PRO-254).
export default function ListingImageCarousel({ images }: ListingImageCarouselProps) {
  // Drop images with no bytes so the dots and navigation only ever reflect
  // renderable images, never a broken <img> (PRO-254).
  const renderable = images.filter((image) => Boolean(image.image_data));

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
          // Copied from ImageScroller.tsx:418: prefix raw base64, but pass an
          // already-prefixed data: URI through unchanged (PRO-254).
          src={
            currentImage.image_data.startsWith('data:')
              ? currentImage.image_data
              : `data:image/jpeg;base64,${currentImage.image_data}`
          }
          alt={currentImage.alt || 'Listing image'}
          className="h-full w-full object-contain"
        />
      </div>
      {/* Announce the current position for assistive tech as it changes (PRO-254). */}
      <p data-testid="carousel-status" role="status" className="sr-only">
        Image {activeIndex + 1} of {renderable.length}
      </p>
      {/* Paging dots: real, labelled, focusable controls. Hidden when there is
          nothing to page between (PRO-254). */}
      {hasMultiple && (
        <div
          data-testid="carousel-dots"
          className="flex items-center justify-center gap-2"
        >
          {renderable.map((_, index) => {
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
      )}
    </div>
  );
}
