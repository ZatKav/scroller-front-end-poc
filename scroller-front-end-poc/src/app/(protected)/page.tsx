'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import type { StackRankImage } from '@/types/scroller-customer-interactions-db';
import ImageScroller from '@/components/ImageScroller';

const STACK_RANK_WINDOWS = [
  { skip: 0, limit: 1 },
  { skip: 1, limit: 3 },
  { skip: 4, limit: 10 },
];

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

export default function Home() {
  const { user } = useAuth();
  const [images, setImages] = useState<StackRankImage[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [windowError, setWindowError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let loadedFirstWindow = false;

    async function fetchImages() {
      try {
        for (const [index, window] of STACK_RANK_WINDOWS.entries()) {
          const windowImages = await fetchStackRankWindow(window.skip, window.limit);
          if (cancelled) {
            return;
          }

          if (index === 0) {
            loadedFirstWindow = true;
            setImages(windowImages);
          } else {
            setImages((currentImages) => appendUniqueImages(currentImages ?? [], windowImages));
          }
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
          <ImageScroller images={images} customerId={user.id} />
          {windowError && <p className="text-sm text-red-600 mt-4">{windowError}</p>}
        </>
      )}
    </main>
  );
}
