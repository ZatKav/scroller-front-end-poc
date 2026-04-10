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
  }: {
    images: StackRankImage[];
    customerId: number;
    onAdvance?: (nextIndex: number) => void;
  }) => {
    const React = require('react');
    const [currentIndex, setCurrentIndex] = React.useState(0);
    const currentImage = images[currentIndex];

    return (
      <section data-testid="image-scroller" data-customer-id={customerId}>
        <div data-testid="current-image">
          {currentImage?.image_summary ?? 'No more images'}
        </div>
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
  it('renders the first image before later stack-rank windows finish loading', async () => {
    const nextThree = deferredResponse(makeImageRange(2, 3));
    const nextTen = deferredResponse([makeImage(5)]);
    mockFetch
      .mockResolvedValueOnce(responseWithImages([makeImage(1)]))
      .mockReturnValueOnce(nextThree.promise)
      .mockReturnValueOnce(nextTen.promise);

    render(<Home />);

    expect(await screen.findByTestId('image-1')).toBeTruthy();
    expect(screen.queryByTestId('image-2')).toBeNull();
    await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(2));

    await act(async () => {
      nextThree.resolve();
      await nextThree.promise;
    });
    expect(await screen.findByTestId('image-2')).toBeTruthy();
    expect(screen.getByTestId('image-4')).toBeTruthy();

    await act(async () => {
      nextTen.resolve();
      await nextTen.promise;
    });
    expect(await screen.findByTestId('image-5')).toBeTruthy();

    expect(mockFetch).toHaveBeenNthCalledWith(1, '/api/stack-rank?skip=0&limit=1');
    expect(mockFetch).toHaveBeenNthCalledWith(2, '/api/stack-rank?skip=1&limit=3');
    expect(mockFetch).toHaveBeenNthCalledWith(3, '/api/stack-rank?skip=4&limit=10');
  });

  it('starts a staged refill at 10 remaining cards and keeps the current card actionable', async () => {
    const refillThree = deferredResponse(makeImageRange(15, 3));
    const refillSeven = deferredResponse(makeImageRange(18, 7));
    mockFetch
      .mockResolvedValueOnce(responseWithImages([makeImage(1)]))
      .mockResolvedValueOnce(responseWithImages(makeImageRange(2, 3)))
      .mockResolvedValueOnce(responseWithImages(makeImageRange(5, 10)))
      .mockReturnValueOnce(refillThree.promise)
      .mockReturnValueOnce(refillSeven.promise);

    render(<Home />);

    expect(await screen.findByTestId('image-14')).toBeTruthy();

    advanceScroller(4);

    await waitFor(() => {
      expect(screen.getByTestId('current-image').textContent).toBe('Image 5');
      expect(mockFetch).toHaveBeenCalledTimes(4);
    });
    expect(mockFetch).toHaveBeenNthCalledWith(4, '/api/stack-rank?skip=14&limit=3');

    fireEvent.click(screen.getByRole('button', { name: 'Advance' }));
    expect(screen.getByTestId('current-image').textContent).toBe('Image 6');
    expect(mockFetch).toHaveBeenCalledTimes(4);

    await act(async () => {
      refillThree.resolve();
      await refillThree.promise;
    });

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledTimes(5);
    });
    expect(mockFetch).toHaveBeenNthCalledWith(5, '/api/stack-rank?skip=17&limit=7');

    await act(async () => {
      refillSeven.resolve();
      await refillSeven.promise;
    });

    expect(await screen.findByTestId('image-24')).toBeTruthy();
  });

  it('deduplicates refill windows before appending them to the local queue', async () => {
    mockFetch
      .mockResolvedValueOnce(responseWithImages([makeImage(1)]))
      .mockResolvedValueOnce(responseWithImages(makeImageRange(2, 3)))
      .mockResolvedValueOnce(responseWithImages(makeImageRange(5, 10)))
      .mockResolvedValueOnce(responseWithImages([makeImage(14), makeImage(15), makeImage(16)]))
      .mockResolvedValueOnce(
        responseWithImages([
          makeImage(16),
          makeImage(17),
          makeImage(18),
          makeImage(19),
          makeImage(20),
          makeImage(21),
          makeImage(22),
        ]),
      );

    render(<Home />);

    expect(await screen.findByTestId('image-14')).toBeTruthy();

    advanceScroller(4);

    expect(await screen.findByTestId('image-22')).toBeTruthy();
    expect(screen.getAllByTestId('image-14')).toHaveLength(1);
    expect(screen.getAllByTestId('image-16')).toHaveLength(1);
  });

  it('keeps the current queue available when a staged refill fails', async () => {
    const refillThree = deferredResponse(makeImageRange(15, 3));
    mockFetch
      .mockResolvedValueOnce(responseWithImages([makeImage(1)]))
      .mockResolvedValueOnce(responseWithImages(makeImageRange(2, 3)))
      .mockResolvedValueOnce(responseWithImages(makeImageRange(5, 10)))
      .mockReturnValueOnce(refillThree.promise)
      .mockResolvedValueOnce(failedResponse());

    render(<Home />);

    expect(await screen.findByTestId('image-14')).toBeTruthy();

    advanceScroller(4);
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledTimes(4);
    });

    await act(async () => {
      refillThree.resolve();
      await refillThree.promise;
    });

    expect(await screen.findByTestId('image-17')).toBeTruthy();
    expect(await screen.findByText('More images could not be loaded.')).toBeTruthy();
    expect(screen.getByTestId('current-image').textContent).toBe('Image 5');

    fireEvent.click(screen.getByRole('button', { name: 'Advance' }));
    expect(screen.getByTestId('current-image').textContent).toBe('Image 6');
  });

  it('keeps the first image visible and reports a later window failure', async () => {
    mockFetch
      .mockResolvedValueOnce(responseWithImages([makeImage(1)]))
      .mockResolvedValueOnce(failedResponse());

    render(<Home />);

    expect(await screen.findByTestId('image-1')).toBeTruthy();
    expect(await screen.findByText('More images could not be loaded.')).toBeTruthy();
    expect(screen.getByTestId('image-1')).toBeTruthy();
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });
});
