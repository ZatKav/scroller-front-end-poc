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
    <div className="flex flex-col items-center gap-6">
      <img
        data-testid="scroller-image"
        src={currentImage.image_data!.startsWith('data:') ? currentImage.image_data! : `data:image/jpeg;base64,${currentImage.image_data}`}
        alt={currentImage.image_summary || 'Property image'}
        className="max-w-full max-h-[60vh] rounded-lg shadow-md object-contain"
      />
      {currentImage.image_summary && (
        <p className="text-sm text-gray-600 max-w-md text-center">{currentImage.image_summary}</p>
      )}
      <pre
        data-testid="stack-rank-weights"
        className="text-xs text-left text-gray-700 bg-gray-100 rounded-md p-3 max-w-md w-full overflow-x-auto"
      >
        {JSON.stringify(stackRankWeights, null, 2)}
      </pre>
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
      {renderResetControls()}
    </div>
  );
}
