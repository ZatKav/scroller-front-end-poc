'use client';

import { useEffect, useState } from 'react';
import type { StackRankImage } from '@/types/scroller-customer-interactions-db';
import { scrollerCustomerInteractionsDbApiClient } from '@/app/shared/clients/scroller-customer-interactions-db-api-client';

interface ImageScrollerProps {
  images: StackRankImage[];
  customerId: number;
  onAdvance?: (nextIndex: number) => void;
  loadingMore?: boolean;
  noMoreAvailable?: boolean;
  continuationErrored?: boolean;
}

export default function ImageScroller({
  images,
  customerId,
  onAdvance,
  loadingMore = false,
  noMoreAvailable = true,
  continuationErrored = false,
}: ImageScrollerProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [imageShownAtMs, setImageShownAtMs] = useState(() => Date.now());
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setImageShownAtMs(Date.now());
  }, [currentIndex]);

  if (images.length === 0 || currentIndex >= images.length) {
    if (loadingMore || !noMoreAvailable) {
      const emptyStateText = continuationErrored
        ? 'More images could not be loaded.'
        : 'Loading more images...';

      return (
        <div className="text-center py-12">
          <p className="text-lg text-gray-500">{emptyStateText}</p>
        </div>
      );
    }

    return (
      <div className="text-center py-12">
        <p className="text-lg text-gray-500">No more images</p>
      </div>
    );
  }

  const currentImage = images[currentIndex];

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
    </div>
  );
}
