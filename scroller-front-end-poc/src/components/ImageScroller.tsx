'use client';

import { useState } from 'react';
import type { StackRankImage } from '@/types/scroller-customer-interactions-db';
import { scrollerCustomerInteractionsDbApiClient } from '@/app/shared/clients/scroller-customer-interactions-db-api-client';

interface ImageScrollerProps {
  images: StackRankImage[];
  customerId: number;
}

export default function ImageScroller({ images, customerId }: ImageScrollerProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  if (images.length === 0 || currentIndex >= images.length) {
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
      await scrollerCustomerInteractionsDbApiClient.createCustomerImageInteraction({
        customer_id: customerId,
        image_id: currentImage.id,
        action,
      });
    } catch (error) {
      console.error('Failed to record interaction:', error);
    } finally {
      setSubmitting(false);
      setCurrentIndex((prev) => prev + 1);
    }
  }

  return (
    <div className="flex flex-col items-center gap-6">
      <img
        src={`data:image/jpeg;base64,${currentImage.image_data}`}
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
