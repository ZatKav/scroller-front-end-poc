'use client';

import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import type { StackRankImage } from '@/types/scroller-customer-interactions-db';
import ImageScroller from '@/components/ImageScroller';

const STACK_RANK_WINDOWS = [
  { skip: 0, limit: 1 },
  { skip: 1, limit: 3 },
  { skip: 4, limit: 10 },
];
const REFILL_STAGE_LIMITS = [3, 7];
const REFILL_THRESHOLD = 10;
const INITIAL_NEXT_SKIP = STACK_RANK_WINDOWS.reduce((total, window) => total + window.limit, 0);

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
  return [
    ...existingImages,
    ...newImages,
  ];
}

async function fetchStackRankWindow(skip: number, limit: number): Promise<StackRankImage[]> {
  const response = await fetch(`/api/stack-rank?skip=${skip}&limit=${limit}`);
  if (!response.ok) {
    throw new Error('Failed to load images');
  }
  const data = (await response.json()) as { images?: StackRankImage[] };
  return data.images ?? [];
}

function windowKey(skip: number, limit: number): string {
  return `${skip}:${limit}`;
}

export default function Home() {
  const { user } = useAuth();
  const [images, setImages] = useState<StackRankImage[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [windowError, setWindowError] = useState<string | null>(null);
  const imageCacheRef = useRef<StackRankImage[]>([]);
  const loadedWindowKeysRef = useRef<Set<string>>(new Set());
  const nextSkipRef = useRef(INITIAL_NEXT_SKIP);
  const refillInFlightRef = useRef(false);
  const mountedRef = useRef(false);

  async function refillQueue() {
    if (refillInFlightRef.current) {
      return;
    }

    refillInFlightRef.current = true;
    setWindowError(null);

    try {
      for (const limit of REFILL_STAGE_LIMITS) {
        const skip = nextSkipRef.current;
        const windowImages = await fetchStackRankWindow(skip, limit);
        if (!mountedRef.current) {
          return;
        }

        nextSkipRef.current += limit;
        imageCacheRef.current = appendUniqueImages(imageCacheRef.current, windowImages);
        setImages(imageCacheRef.current);
      }
    } catch {
      if (!mountedRef.current) {
        return;
      }

      setWindowError('More images could not be loaded.');
    } finally {
      refillInFlightRef.current = false;
    }
  }

  function handleAdvance(nextIndex: number) {
    const remainingImages = imageCacheRef.current.length - nextIndex;
    if (remainingImages !== REFILL_THRESHOLD || refillInFlightRef.current) {
      return;
    }

    void refillQueue();
  }

  useEffect(() => {
    mountedRef.current = true;
    let cancelled = false;
    let loadedFirstWindow = false;

    async function fetchImages() {
      try {
        for (const window of STACK_RANK_WINDOWS) {
          const key = windowKey(window.skip, window.limit);
          if (loadedWindowKeysRef.current.has(key)) {
            continue;
          }

          const windowImages = await fetchStackRankWindow(window.skip, window.limit);
          if (cancelled) {
            return;
          }

          loadedWindowKeysRef.current.add(key);
          imageCacheRef.current = appendUniqueImages(imageCacheRef.current, windowImages);
          loadedFirstWindow = loadedFirstWindow || imageCacheRef.current.length > 0;
          setImages(imageCacheRef.current);
        }
      } catch {
        if (cancelled) {
          return;
        }

        if (loadedFirstWindow) {
          setWindowError('More images could not be loaded.');
          return;
        }

        setError('Failed to load images');
      }
    }

    fetchImages();

    return () => {
      cancelled = true;
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
          <ImageScroller images={images} customerId={user.id} onAdvance={handleAdvance} />
          {windowError && <p className="text-sm text-red-600 mt-4">{windowError}</p>}
        </>
      )}
    </main>
  );
}
