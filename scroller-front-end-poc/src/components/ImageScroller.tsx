'use client';

import { useEffect, useState } from 'react';
import type {
  StackRankImage,
  StackRankProfileWeights,
} from '@/types/scroller-customer-interactions-db';
import { scrollerCustomerInteractionsDbApiClient } from '@/app/shared/clients/scroller-customer-interactions-db-api-client';

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

  useEffect(() => {
    setImageShownAtMs(Date.now());
  }, [currentIndex]);

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

  const stackRankWeights = {
    profile_weights: profileWeights,
    image_score: {
      final_score: currentImage.final_score ?? null,
      selection_reason: currentImage.selection_reason ?? null,
    },
  };

  async function handleAction(action: 0 | 1) {
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
      setSubmitting(false);
    }
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
          object-contain preserves its aspect ratio, and the max-height cap keeps
          the action buttons visible without scrolling (PRO-233). */}
      <div className="relative w-full">
        <img
          data-testid="scroller-image"
          src={currentImage.image_data!.startsWith('data:') ? currentImage.image_data! : `data:image/jpeg;base64,${currentImage.image_data}`}
          alt={currentImage.image_summary || 'Property image'}
          className="w-full max-h-[70vh] rounded-lg shadow-md object-contain"
        />
        {/* Left/right tap zones mirror the Skip/Like buttons for fast thumb
            interaction. They are aria-hidden and not focusable so they don't
            duplicate the labelled buttons for keyboard/assistive-tech users
            (PRO-233). */}
        <button
          type="button"
          data-testid="image-skip-zone"
          aria-hidden="true"
          tabIndex={-1}
          onClick={() => handleAction(0)}
          disabled={submitting}
          className="absolute inset-y-0 left-0 w-1/2 bg-transparent cursor-pointer disabled:cursor-not-allowed focus:outline-none"
        />
        <button
          type="button"
          data-testid="image-like-zone"
          aria-hidden="true"
          tabIndex={-1}
          onClick={() => handleAction(1)}
          disabled={submitting}
          className="absolute inset-y-0 right-0 w-1/2 bg-transparent cursor-pointer disabled:cursor-not-allowed focus:outline-none"
        />
      </div>
      <div className="flex gap-4">
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
          the mobile view, while staying a real, focusable control (PRO-234). */}
      <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer select-none">
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
        <div className="grid grid-cols-2 gap-4 w-full max-w-3xl">
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
      {renderResetControls()}
    </div>
  );
}
