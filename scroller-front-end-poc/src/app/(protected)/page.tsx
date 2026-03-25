'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import type { StackRankImage } from '@/types/scroller-customer-interactions-db';
import ImageScroller from '@/components/ImageScroller';

export default function Home() {
  const { user } = useAuth();
  const [images, setImages] = useState<StackRankImage[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchImages() {
      try {
        const response = await fetch('/api/stack-rank');
        if (!response.ok) {
          setError('Failed to load images');
          return;
        }
        const data = await response.json();
        setImages(data.images ?? []);
      } catch {
        setError('Failed to load images');
      }
    }

    fetchImages();
  }, []);

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Scroller</h1>
      {error && <p className="text-red-600">{error}</p>}
      {!error && images === null && (
        <p className="text-gray-500">Loading images...</p>
      )}
      {!error && images !== null && user && (
        <ImageScroller images={images} customerId={user.id} />
      )}
    </main>
  );
}
