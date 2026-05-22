'use client';

import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import type { StackRankImage } from '@/types/scroller-customer-interactions-db';
import ImageScroller from '@/components/ImageScroller';

const INITIAL_LOAD_LIMIT = 1;
const CONTINUATION_LOAD_LIMIT = 10;
const PREFETCH_THRESHOLD = 1;

function appendUniqueImages(
  existingImages: StackRankImage[],
  windowImages: StackRankImage[],
): StackRankImage[] {
  const seenImageIds = new Set(existingImages.map((image) => image.id));
  const newImages = windowImages.filter((image) => {
    if (seenImageIds.has(image.id)) {
      return false;
    }
    seenImageIds.add(image.id);
    return true;
  });
  return [...existingImages, ...newImages];
}

async function fetchStackRankBatch(limit: number): Promise<StackRankImage[]> {
  const response = await fetch(`/api/stack-rank?limit=${limit}`);
  if (!response.ok) {
    throw new Error('Failed to load images');
  }
  const data = (await response.json()) as { images?: StackRankImage[] };
  return data.images ?? [];
}

export default function Home() {
  const { user } = useAuth();
  const [images, setImages] = useState<StackRankImage[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [windowError, setWindowError] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [noMoreImages, setNoMoreImages] = useState(false);

  const imageCacheRef = useRef<StackRankImage[]>([]);
  const refillInFlightRef = useRef(false);
  const noMoreImagesRef = useRef(false);
  const mountedRef = useRef(false);

  async function loadMoreImages(limit: number) {
    if (refillInFlightRef.current || noMoreImagesRef.current) {
      return;
    }

    refillInFlightRef.current = true;
    setLoadingMore(true);
    setWindowError(null);

    try {
      const windowImages = await fetchStackRankBatch(limit);
      if (!mountedRef.current) {
        return;
      }

      const mergedImages = appendUniqueImages(imageCacheRef.current, windowImages);
      const addedCount = mergedImages.length - imageCacheRef.current.length;

      imageCacheRef.current = mergedImages;
      setImages(mergedImages);

      if (addedCount === 0) {
        noMoreImagesRef.current = true;
        setNoMoreImages(true);
      }
    } catch {
      if (!mountedRef.current) {
        return;
      }

      if (imageCacheRef.current.length > 0) {
        setWindowError('More images could not be loaded.');
        return;
      }

      setError('Failed to load images');
    } finally {
      refillInFlightRef.current = false;
      if (mountedRef.current) {
        setLoadingMore(false);
      }
    }
  }

  function handleAdvance(nextIndex: number) {
    const remainingImages = imageCacheRef.current.length - nextIndex;
    if (windowError !== null || remainingImages > PREFETCH_THRESHOLD || noMoreImagesRef.current) {
      return;
    }

    void loadMoreImages(CONTINUATION_LOAD_LIMIT);
  }

  useEffect(() => {
    mountedRef.current = true;

    async function initializeQueue() {
      await loadMoreImages(INITIAL_LOAD_LIMIT);
      if (!mountedRef.current || noMoreImagesRef.current || imageCacheRef.current.length === 0) {
        return;
      }

      void loadMoreImages(CONTINUATION_LOAD_LIMIT);
    }

    void initializeQueue();

    return () => {
      mountedRef.current = false;
    };
  }, []);

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Scroller</h1>
      {error && <p className="text-red-600">{error}</p>}
      {!error && images === null && (
        <p className="text-gray-500">Loading images...</p>
      )}
      {!error && images !== null && user && (
        <>
          <ImageScroller
            images={images}
            customerId={user.id}
            onAdvance={handleAdvance}
            loadingMore={loadingMore}
            noMoreAvailable={noMoreImages}
            continuationErrored={windowError !== null}
          />
          {windowError && <p className="text-sm text-red-600 mt-4">{windowError}</p>}
        </>
      )}
    </main>
  );
}
