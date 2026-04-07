import { act, render, screen, waitFor } from '@testing-library/react';
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
  }: {
    images: StackRankImage[];
    customerId: number;
  }) => (
    <section data-testid="image-scroller" data-customer-id={customerId}>
      {images.map((image) => (
        <div data-testid={`image-${image.id}`} key={image.id}>
          {image.image_summary}
        </div>
      ))}
    </section>
  ),
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

describe('protected scroller page', () => {
  it('renders the first image before later stack-rank windows finish loading', async () => {
    const nextThree = deferredResponse([makeImage(2), makeImage(3), makeImage(4)]);
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
