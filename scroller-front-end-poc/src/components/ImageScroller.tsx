'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import type {
  StackRankImage,
  StackRankProfileWeights,
} from '@/types/scroller-customer-interactions-db';
import { scrollerCustomerInteractionsDbApiClient } from '@/app/shared/clients/scroller-customer-interactions-db-api-client';
import { ExternalLink, Maximize, Minimize } from 'lucide-react';

// Horizontal swipe gesture tuning for the image area (PRO-236). A swipe only
// counts as a Skip/Like when it travels at least SWIPE_MIN_DISTANCE_PX
// horizontally AND its horizontal travel dominates its vertical travel by
// SWIPE_HORIZONTAL_RATIO. This keeps short taps and ordinary vertical page
// scrolling from being misread as an action: swipe right Likes, swipe left
// Skips, mirroring the existing right/left tap zones.
const SWIPE_MIN_DISTANCE_PX = 60;
const SWIPE_HORIZONTAL_RATIO = 1.5;

// Mobile landscape: landscape orientation with a short viewport (phones). The
// max-height guard keeps tall tablet/desktop landscape out. This is one of the
// two triggers of the immersive view; browser fullscreen is the other (PRO-239).
// Kept in sync with the `mobile-landscape` screen in tailwind.config.js.
const MOBILE_LANDSCAPE_QUERY = '(orientation: landscape) and (max-height: 600px)';

// Observe whether we are in mobile landscape. It feeds the `immersive` signal,
// which hides the Skip/Like, Debug and Reset controls and promotes the tap zones
// to real, labelled, focusable controls. dvh sizing reclaims the address-bar
// space for phones that cannot or do not enter fullscreen (PRO-235).
function useIsMobileLandscape(): boolean {
  const [isMobileLandscape, setIsMobileLandscape] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return;
    }

    const mediaQuery = window.matchMedia(MOBILE_LANDSCAPE_QUERY);
    const update = () => setIsMobileLandscape(mediaQuery.matches);
    update();

    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', update);
      return () => mediaQuery.removeEventListener('change', update);
    }

    // Safari < 14 only exposes the deprecated addListener/removeListener API.
    mediaQuery.addListener(update);
    return () => mediaQuery.removeListener(update);
  }, []);

  return isMobileLandscape;
}

// PORTRAIT_QUERY drives the rotate-back-to-portrait exit on phones: returning to
// portrait leaves fullscreen so the normal, controls-bearing view comes back
// (PRO-238). The fullscreen button and the immersive layout are keyed off
// fullscreen state, not orientation, so they behave the same on tablet and
// desktop (PRO-239).
const PORTRAIT_QUERY = '(orientation: portrait)';

// Minimal typing for the still-prefixed WebKit Fullscreen API (older Android
// webviews); modern Chrome uses the unprefixed names.
interface FullscreenDocument extends Document {
  webkitFullscreenEnabled?: boolean;
  webkitFullscreenElement?: Element | null;
  webkitExitFullscreen?: () => Promise<void> | void;
}
interface FullscreenElement extends HTMLElement {
  webkitRequestFullscreen?: () => Promise<void> | void;
}

// requestFullscreen/exitFullscreen return a promise that rejects if the user
// dismisses the prompt or the activating gesture is stale; there is nothing to
// recover, so swallow it rather than surfacing an unhandled rejection.
function ignoreRejection(result: Promise<void> | void): void {
  if (result && typeof (result as Promise<void>).catch === 'function') {
    (result as Promise<void>).catch(() => {});
  }
}

function getFullscreenElement(): Element | null {
  if (typeof document === 'undefined') {
    return null;
  }
  const doc = document as FullscreenDocument;
  return doc.fullscreenElement ?? doc.webkitFullscreenElement ?? null;
}

function requestPageFullscreen(): void {
  if (typeof document === 'undefined') {
    return;
  }
  const el = document.documentElement as FullscreenElement;
  const request = el.requestFullscreen ?? el.webkitRequestFullscreen;
  if (!request) {
    return;
  }
  try {
    ignoreRejection(request.call(el));
  } catch {
    /* fullscreen is best-effort */
  }
}

function exitPageFullscreen(): void {
  if (typeof document === 'undefined') {
    return;
  }
  const doc = document as FullscreenDocument;
  const exit = doc.exitFullscreen ?? doc.webkitExitFullscreen;
  if (!exit) {
    return;
  }
  try {
    ignoreRejection(exit.call(doc));
  } catch {
    /* fullscreen is best-effort */
  }
}

// True only in portrait. Mirrors useIsMobileLandscape's matchMedia plumbing
// (incl. the Safari < 14 addListener fallback) and is SSR/no-matchMedia safe.
function useIsPortrait(): boolean {
  const [isPortrait, setIsPortrait] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return;
    }

    const mediaQuery = window.matchMedia(PORTRAIT_QUERY);
    const update = () => setIsPortrait(mediaQuery.matches);
    update();

    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', update);
      return () => mediaQuery.removeEventListener('change', update);
    }

    mediaQuery.addListener(update);
    return () => mediaQuery.removeListener(update);
  }, []);

  return isPortrait;
}

// Whether the Fullscreen API is usable, resolved on the client only. It is
// false/undefined on iPhone Safari (no element fullscreen), which is exactly how
// the button stays hidden there. Resolved in an effect so the server and first
// client render agree, avoiding a hydration mismatch.
function useFullscreenSupported(): boolean {
  const [supported, setSupported] = useState(false);

  useEffect(() => {
    if (typeof document === 'undefined') {
      return;
    }
    const doc = document as FullscreenDocument;
    setSupported(Boolean(doc.fullscreenEnabled ?? doc.webkitFullscreenEnabled));
  }, []);

  return supported;
}

// Track browser fullscreen so the immersive layout follows it on every capable
// device — this is how tablet/desktop get the immersive view, and why a refresh
// (which drops fullscreen) returns to the normal view with no persisted setting
// (PRO-239). Resolved in an effect so SSR/first render shows the normal view.
function useIsFullscreen(): boolean {
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    if (typeof document === 'undefined') {
      return;
    }
    const update = () => setIsFullscreen(getFullscreenElement() !== null);
    update();

    document.addEventListener('fullscreenchange', update);
    document.addEventListener('webkitfullscreenchange', update);
    return () => {
      document.removeEventListener('fullscreenchange', update);
      document.removeEventListener('webkitfullscreenchange', update);
    };
  }, []);

  return isFullscreen;
}

interface ImageScrollerProps {
  images: StackRankImage[];
  customerId: number;
  onAdvance?: (nextIndex: number) => void;
  loadingMore?: boolean;
  noMoreAvailable?: boolean;
  continuationErrored?: boolean;
  profileWeights?: StackRankProfileWeights;
}

export default function ImageScroller({
  images,
  customerId,
  onAdvance,
  loadingMore = false,
  noMoreAvailable = true,
  continuationErrored = false,
  profileWeights = {},
}: ImageScrollerProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [imageShownAtMs, setImageShownAtMs] = useState(() => Date.now());
  const [submitting, setSubmitting] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);
  // Debug toggle for the per-image summary and stack-rank weights. Off by
  // default so the large JSON blocks don't dominate the mobile view; the
  // preference is session-only and persists as the user advances (PRO-234).
  const [debug, setDebug] = useState(false);
  const isMobileLandscape = useIsMobileLandscape();
  const isPortrait = useIsPortrait();
  const fullscreenSupported = useFullscreenSupported();
  const isFullscreen = useIsFullscreen();
  // The immersive view (full-viewport image, controls hidden, tap zones promoted)
  // is shown for phones in short landscape (PRO-235) OR whenever the page is in
  // browser fullscreen — the latter is how tablet/desktop opt in via the toggle
  // (PRO-239).
  const immersive = isMobileLandscape || isFullscreen;

  // Synchronous in-flight guard shared by every action entry point (buttons, tap
  // zones, swipes). The `submitting` state drives the disabled UI, but it updates
  // asynchronously, so it cannot stop a second action that fires in the same tick
  // — e.g. the synthetic click a browser dispatches after a consumed touch swipe.
  // This ref flips synchronously, guaranteeing a single interaction per gesture
  // even before React re-renders (PRO-236).
  const actionInFlightRef = useRef(false);
  // Start point of an active single-finger touch on the image, or null when no
  // qualifying gesture is in progress (PRO-236).
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    setImageShownAtMs(Date.now());
  }, [currentIndex]);

  // Rotating back to portrait leaves fullscreen so the normal, controls-bearing
  // view returns on phones; exiting needs no user gesture. Only entering portrait
  // acts here, so the PRO-235 "no Fullscreen on entering landscape" behaviour
  // holds (PRO-238).
  useEffect(() => {
    if (isPortrait && getFullscreenElement()) {
      exitPageFullscreen();
    }
  }, [isPortrait]);

  if (images.length === 0 || currentIndex >= images.length) {
    if (loadingMore || !noMoreAvailable) {
      const emptyStateText = continuationErrored
        ? 'More images could not be loaded.'
        : 'Loading more images...';

      return (
        <div className={`flex flex-col items-center py-12${continuationErrored ? ' gap-6' : ''}`}>
          <p className="text-lg text-gray-500">{emptyStateText}</p>
          {continuationErrored && renderResetControls()}
        </div>
      );
    }

    return (
      <div className="flex flex-col items-center gap-6 py-12">
        <p className="text-lg text-gray-500">No more images</p>
        {renderResetControls()}
      </div>
    );
  }

  const currentImage = images[currentIndex];
  // The detail route is keyed on the enrichment-db listing id carried by the
  // card. When it is absent we render no View-listing affordance at all, rather
  // than a disabled or empty link, so there is never a broken /listing/null
  // href (PRO-256).
  const listingId = currentImage.listing_id;

  const stackRankWeights = {
    profile_weights: profileWeights,
    image_score: {
      final_score: currentImage.final_score ?? null,
      selection_reason: currentImage.selection_reason ?? null,
    },
  };

  async function handleAction(action: 0 | 1) {
    // Drop the call if an interaction is already being recorded so no gesture
    // (button, tap zone, or swipe) can double-submit or double-advance (PRO-236).
    if (actionInFlightRef.current) {
      return;
    }
    actionInFlightRef.current = true;
    setSubmitting(true);
    try {
      const nowMs = Date.now();
      const viewDurationMs = Math.max(0, Math.floor(nowMs - imageShownAtMs));

      await scrollerCustomerInteractionsDbApiClient.createCustomerImageInteraction({
        customer_id: customerId,
        image_id: currentImage.id,
        action,
        view_duration_ms: viewDurationMs,
      });
      setCurrentIndex((prev) => {
        const nextIndex = prev + 1;
        onAdvance?.(nextIndex);
        return nextIndex;
      });
    } catch (error) {
      console.error('Failed to record interaction:', error);
    } finally {
      actionInFlightRef.current = false;
      setSubmitting(false);
    }
  }

  // Record where a single-finger touch begins so the end point can be compared
  // against the swipe thresholds. Multi-touch gestures (e.g. pinch-zoom) are
  // ignored so they never resolve into a Skip/Like (PRO-236).
  function handleImageTouchStart(event: React.TouchEvent<HTMLDivElement>) {
    if (event.touches.length !== 1) {
      touchStartRef.current = null;
      return;
    }
    const touch = event.touches[0];
    touchStartRef.current = { x: touch.clientX, y: touch.clientY };
  }

  function handleImageTouchEnd(event: React.TouchEvent<HTMLDivElement>) {
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

    // Ignore short drags and mostly-vertical drags so ordinary mobile scrolling
    // is never converted into a Skip/Like (PRO-236).
    if (absX < SWIPE_MIN_DISTANCE_PX || absX < absY * SWIPE_HORIZONTAL_RATIO) {
      return;
    }

    // Suppress the synthetic click the browser fires on the underlying tap zone
    // after a consumed touch swipe, so the swipe is not also counted as a tap.
    // The actionInFlightRef guard is the ultimate backstop, but preventing the
    // ghost click avoids relying on timing entirely (PRO-236).
    event.preventDefault();
    handleAction(deltaX > 0 ? 1 : 0);
  }

  async function handleReset() {
    const confirmed = window.confirm(
      'Reset all of your image interactions? This permanently deletes them and cannot be undone.',
    );
    if (!confirmed) {
      return;
    }

    setResetting(true);
    setResetError(null);
    try {
      await scrollerCustomerInteractionsDbApiClient.deleteCustomerImageInteractions(customerId);
      // Refresh the page so the stack-rank queue and profile weights are
      // re-fetched from scratch, reflecting the cleared interactions (PRO-231).
      // Done unconditionally on a successful delete, regardless of how many
      // interactions were removed.
      window.location.reload();
    } catch (error) {
      console.error('Failed to reset interactions:', error);
      setResetError('Could not reset your interactions. Please try again.');
      setResetting(false);
    }
  }

  function renderResetControls() {
    return (
      <>
        <button
          onClick={handleReset}
          disabled={resetting}
          className="px-6 py-2 rounded-lg bg-red-600 text-white font-semibold hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {resetting ? 'Resetting…' : 'Reset my interactions'}
        </button>
        {resetError && (
          <p role="status" className="text-sm text-red-600">
            {resetError}
          </p>
        )}
      </>
    );
  }

  return (
    <div className="flex flex-col items-center gap-6 w-full">
      {/* The image is the dominant element: it fills the available width while
          object-contain preserves its aspect ratio. The height cap uses dynamic
          viewport units (dvh); in the immersive view (phone short-landscape or
          browser fullscreen) it expands to the full viewport because the action
          controls are hidden there (PRO-233, PRO-235, PRO-239). */}
      <div
        className="relative w-full"
        data-testid="scroller-swipe-area"
        onTouchStart={handleImageTouchStart}
        onTouchEnd={handleImageTouchEnd}
      >
        <img
          data-testid="scroller-image"
          src={currentImage.image_data!.startsWith('data:') ? currentImage.image_data! : `data:image/jpeg;base64,${currentImage.image_data}`}
          alt={currentImage.image_summary || 'Property image'}
          className={`w-full ${immersive ? 'max-h-[100dvh]' : 'max-h-[70dvh]'} rounded-lg shadow-md object-contain`}
        />
        {/* Left/right tap zones mirror the Skip/Like buttons for fast thumb
            interaction. In the normal view the labelled buttons are visible, so
            the zones stay aria-hidden and unfocusable to avoid duplicating them
            for keyboard/assistive-tech users (PRO-233). In the immersive view the
            buttons are hidden, so the zones become the accessible, labelled,
            focusable Skip/Like controls so those users keep both actions
            (PRO-235, PRO-239). */}
        <button
          type="button"
          data-testid="image-skip-zone"
          aria-hidden={immersive ? undefined : true}
          aria-label={immersive ? 'Skip' : undefined}
          tabIndex={immersive ? 0 : -1}
          onClick={() => handleAction(0)}
          disabled={submitting}
          className={`absolute inset-y-0 left-0 w-1/2 bg-transparent cursor-pointer disabled:cursor-not-allowed ${immersive ? 'focus:outline focus:outline-2 focus:outline-blue-500' : 'focus:outline-none'}`}
        />
        <button
          type="button"
          data-testid="image-like-zone"
          aria-hidden={immersive ? undefined : true}
          aria-label={immersive ? 'Like' : undefined}
          tabIndex={immersive ? 0 : -1}
          onClick={() => handleAction(1)}
          disabled={submitting}
          className={`absolute inset-y-0 right-0 w-1/2 bg-transparent cursor-pointer disabled:cursor-not-allowed ${immersive ? 'focus:outline focus:outline-2 focus:outline-blue-500' : 'focus:outline-none'}`}
        />
        {/* View-listing overlay. Links to the listing detail route keyed on the
            enrichment-db listing id the card carries (PRO-256). It mirrors the
            fullscreen toggle: sits above the Skip/Like tap zones (z-10) and
            stops the tap from also reaching them, so opening the detail page
            neither records a Skip/Like nor advances the card. Positioned
            top-left so it never collides with the top-right fullscreen toggle.
            Hidden in the immersive view, like the Skip/Like buttons, and not
            rendered at all when the card has no listing id. */}
        {!immersive && listingId != null && (
          <Link
            href={`/listing/${listingId}`}
            data-testid="view-listing-button"
            aria-label="View listing"
            onClick={(event) => event.stopPropagation()}
            className="absolute top-2 left-2 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-sm transition-colors hover:bg-black/60 focus:outline focus:outline-2 focus:outline-blue-500"
          >
            <ExternalLink className="h-5 w-5" aria-hidden="true" />
          </Link>
        )}
        {/* Fullscreen toggle. Shown on any Fullscreen-capable browser (hidden on
            iPhone Safari, which lacks the element Fullscreen API). It is the entry
            point to the immersive view on tablet/desktop and stays visible while
            immersive so it doubles as the exit; sits above the Skip/Like tap zones
            (z-10) and stops the tap from also hitting the Like zone (PRO-238,
            PRO-239). */}
        {fullscreenSupported && (
          <button
            type="button"
            data-testid="fullscreen-button"
            aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
            onClick={(event) => {
              event.stopPropagation();
              if (isFullscreen) {
                exitPageFullscreen();
              } else {
                requestPageFullscreen();
              }
            }}
            className="absolute top-2 right-2 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-sm transition-colors hover:bg-black/60 focus:outline focus:outline-2 focus:outline-blue-500"
          >
            {isFullscreen ? (
              <Minimize className="h-5 w-5" aria-hidden="true" />
            ) : (
              <Maximize className="h-5 w-5" aria-hidden="true" />
            )}
          </button>
        )}
      </div>
      {/* Visible action buttons: hidden in the immersive view so the image fills
          the viewport; the tap zones take over there (PRO-235, PRO-239). */}
      <div className={`flex gap-4 ${immersive ? 'hidden' : ''}`}>
        <button
          onClick={() => handleAction(0)}
          disabled={submitting}
          className="px-8 py-3 rounded-lg bg-gray-200 text-gray-700 font-semibold hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Skip
        </button>
        <button
          onClick={() => handleAction(1)}
          disabled={submitting}
          className="px-8 py-3 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Like
        </button>
      </div>
      {/* Debug toggle: hides the summary/weights by default so they don't clutter
          the mobile view, while staying a real, focusable control (PRO-234). Also
          hidden in the immersive view so the image can fill the viewport
          (PRO-235, PRO-239). */}
      <label className={`flex items-center gap-2 text-sm text-gray-700 cursor-pointer select-none ${immersive ? 'hidden' : ''}`}>
        <input
          type="checkbox"
          data-testid="debug-toggle"
          checked={debug}
          onChange={(event) => setDebug(event.target.checked)}
          className="h-4 w-4"
        />
        Debug
      </label>
      {debug && (
        <div className={`grid grid-cols-2 gap-4 w-full max-w-3xl ${immersive ? 'hidden' : ''}`}>
          {currentImage.image_summary && (
            <pre
              data-testid="image-summary"
              className="text-xs text-left text-gray-700 bg-gray-100 rounded-md p-3 overflow-x-auto whitespace-pre-wrap"
            >
              {currentImage.image_summary}
            </pre>
          )}
          <pre
            data-testid="stack-rank-weights"
            className="text-xs text-left text-gray-700 bg-gray-100 rounded-md p-3 overflow-x-auto"
          >
            {JSON.stringify(stackRankWeights, null, 2)}
          </pre>
        </div>
      )}
      {/* Reset stays available in the normal view, but is hidden in the immersive
          view so the image owns the viewport (PRO-235, PRO-239). */}
      <div className={`flex flex-col items-center gap-6 ${immersive ? 'hidden' : ''}`}>
        {renderResetControls()}
      </div>
    </div>
  );
}
