import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useAuth } from '@/contexts/AuthContext';
import type { StackRankImage } from '@/types/scroller-customer-interactions-db';
import Home from './page';

jest.mock('@/contexts/AuthContext', () => ({
  useAuth: jest.fn(),
}));

jest.mock('@/components/ImageScroller', () => ({
  __esModule: true,
  default: ({
    images,
    customerId,
    onAdvance,
    loadingMore = false,
    noMoreAvailable = true,
    continuationErrored = false,
  }: {
    images: StackRankImage[];
    customerId: number;
    onAdvance?: (nextIndex: number) => void;
    loadingMore?: boolean;
    noMoreAvailable?: boolean;
    continuationErrored?: boolean;
  }) => {
    const React = require('react');
    const [currentIndex, setCurrentIndex] = React.useState(0);
    const currentImage = images[currentIndex];

    let statusText = currentImage?.image_summary;
    if (!statusText) {
      if (loadingMore || (!noMoreAvailable && !continuationErrored)) {
        statusText = 'Loading more images...';
      } else {
        statusText = 'No more images';
      }
    }

    return (
      <section data-testid="image-scroller" data-customer-id={customerId}>
        <div data-testid="current-image">{statusText}</div>
        <button
          type="button"
          onClick={() => {
            const nextIndex = currentIndex + 1;
            setCurrentIndex(nextIndex);
            onAdvance?.(nextIndex);
          }}
        >
          Advance
        </button>
        {images.map((image) => (
          <div data-testid={`image-${image.id}`} key={image.id}>
            {image.image_summary}
          </div>
        ))}
      </section>
    );
  },
}));

const mockUseAuth = useAuth as jest.Mock;
const mockFetch = jest.fn();

function makeImage(id: number): StackRankImage {
  return {
    id,
    image_data: `data:image/png;base64,${id}`,
    image_summary: `Image ${id}`,
  };
}

function makeImageRange(startId: number, count: number): StackRankImage[] {
  return Array.from({ length: count }, (_, index) => makeImage(startId + index));
}

function responseWithImages(images: StackRankImage[]): Response {
  return {
    ok: true,
    json: () => Promise.resolve({ images }),
  } as Response;
}

function failedResponse(): Response {
  return {
    ok: false,
    json: () => Promise.resolve({ error: 'upstream failed' }),
  } as Response;
}

function deferredResponse(images: StackRankImage[]): {
  promise: Promise<Response>;
  resolve: () => void;
} {
  let resolveResponse: (response: Response) => void = () => undefined;
  const promise = new Promise<Response>((resolve) => {
    resolveResponse = resolve;
  });
  return {
    promise,
    resolve: () => resolveResponse(responseWithImages(images)),
  };
}

beforeEach(() => {
  global.fetch = mockFetch as unknown as typeof fetch;
  mockFetch.mockReset();
  mockUseAuth.mockReturnValue({
    user: { id: 42, username: 'testuser', email: 'test@example.com', role: 'user' },
  });
});

function advanceScroller(times: number) {
  for (let index = 0; index < times; index += 1) {
    fireEvent.click(screen.getByRole('button', { name: 'Advance' }));
  }
}

describe('protected scroller page', () => {
  it('renders the first image before the continuation preload resolves', async () => {
    const preload = deferredResponse(makeImageRange(2, 3));
    mockFetch
      .mockResolvedValueOnce(responseWithImages([makeImage(1)]))
      .mockReturnValueOnce(preload.promise);

    render(<Home />);

    expect(await screen.findByTestId('image-1')).toBeTruthy();
    expect(screen.queryByTestId('image-2')).toBeNull();
    expect(screen.getByTestId('current-image').textContent).toBe('Image 1');

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    await act(async () => {
      preload.resolve();
      await preload.promise;
    });

    expect(await screen.findByTestId('image-2')).toBeTruthy();
    expect(mockFetch).toHaveBeenNthCalledWith(1, '/api/stack-rank?limit=1');
    expect(mockFetch).toHaveBeenNthCalledWith(2, '/api/stack-rank?limit=10');
  });

  it('loads additional unseen images when the customer consumes the queue without showing terminal empty state', async () => {
    const continuation = deferredResponse([makeImage(3)]);
    mockFetch
      .mockResolvedValueOnce(responseWithImages([makeImage(1)]))
      .mockResolvedValueOnce(responseWithImages([makeImage(2)]))
      .mockReturnValueOnce(continuation.promise);

    render(<Home />);

    expect(await screen.findByTestId('image-2')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Advance' }));
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledTimes(3);
    });

    fireEvent.click(screen.getByRole('button', { name: 'Advance' }));
    expect(screen.getByTestId('current-image').textContent).toBe('Loading more images...');
    expect(screen.queryByText('No more images')).toBeNull();

    await act(async () => {
      continuation.resolve();
      await continuation.promise;
    });

    expect(await screen.findByTestId('image-3')).toBeTruthy();
    expect(screen.getByTestId('current-image').textContent).toBe('Image 3');
  });

  it('shows terminal empty state when continuation returns no unseen images', async () => {
    mockFetch
      .mockResolvedValueOnce(responseWithImages([makeImage(1)]))
      .mockResolvedValueOnce(responseWithImages([makeImage(2)]))
      .mockResolvedValueOnce(responseWithImages([]));

    render(<Home />);

    expect(await screen.findByTestId('image-2')).toBeTruthy();

    advanceScroller(2);
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledTimes(3);
    });
    await waitFor(() => {
      expect(screen.getByTestId('current-image').textContent).toBe('No more images');
    });
  });

  it('keeps already loaded cards available when a continuation request fails', async () => {
    mockFetch
      .mockResolvedValueOnce(responseWithImages([makeImage(1)]))
      .mockResolvedValueOnce(responseWithImages([makeImage(2), makeImage(3)]))
      .mockResolvedValueOnce(failedResponse());

    render(<Home />);

    expect(await screen.findByTestId('image-3')).toBeTruthy();

    advanceScroller(2);

    expect(await screen.findByText('More images could not be loaded.')).toBeTruthy();
    expect(screen.getByTestId('current-image').textContent).toBe('Image 3');

    fireEvent.click(screen.getByRole('button', { name: 'Advance' }));
    await waitFor(() => {
      expect(screen.getByTestId('current-image').textContent).toBe('No more images');
    });
  });

  it('deduplicates repeated continuation images by image id', async () => {
    mockFetch
      .mockResolvedValueOnce(responseWithImages([makeImage(1)]))
      .mockResolvedValueOnce(responseWithImages([makeImage(2)]))
      .mockResolvedValueOnce(responseWithImages([makeImage(2), makeImage(3)]));

    render(<Home />);

    expect(await screen.findByTestId('image-2')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Advance' }));
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledTimes(3);
    });

    expect(await screen.findByTestId('image-3')).toBeTruthy();
    expect(screen.getAllByTestId('image-2')).toHaveLength(1);
  });
});
