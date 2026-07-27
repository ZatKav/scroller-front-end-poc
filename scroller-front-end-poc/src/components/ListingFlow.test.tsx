import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ListingFlow from '@/components/ListingFlow';
import { scrollerCustomerInteractionsDbApiClient } from '@/app/shared/clients/scroller-customer-interactions-db-api-client';
import type { ListingDetail } from '@/types/enrichment-db';

const mockReplace = jest.fn();
const mockUseAuth = jest.fn();
const mockFetch = jest.fn();
const mockCreateListingInteraction =
  scrollerCustomerInteractionsDbApiClient.createCustomerListingInteraction as jest.Mock;
const mockDeleteListingInteractions =
  scrollerCustomerInteractionsDbApiClient.deleteCustomerListingInteractions as jest.Mock;

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    replace: mockReplace,
  }),
}));

jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

jest.mock('@/app/shared/clients/scroller-customer-interactions-db-api-client', () => ({
  scrollerCustomerInteractionsDbApiClient: {
    createCustomerListingInteraction: jest.fn().mockResolvedValue({}),
    deleteCustomerListingInteractions: jest.fn().mockResolvedValue({ deleted: 0 }),
  },
}));

function makeListing(id: number): ListingDetail {
  return {
    id,
    title: `Listing ${id}`,
    price: 450000 + id,
    first_seen: new Date().toISOString(),
    images: [{ id: id * 10, content_hash: 'a'.repeat(64), is_primary: true, position: 0 }],
  };
}

function makeListingWithImages(id: number, imageTags: string[]): ListingDetail {
  return {
    ...makeListing(id),
    images: imageTags.map((tag, index) => ({
      id: id * 10 + index,
      // Distinct, valid 64-char hex per tag so /media URLs differ per image.
      content_hash: (tag.toLowerCase().replace(/[^a-f0-9]/g, 'a') + 'a'.repeat(64)).slice(0, 64),
      is_primary: index === 0,
      position: index,
    })),
  };
}

let historySpy: jest.SpyInstance;

// The URL the flow last synced via history.replaceState (advancing is now
// client-side, not a router navigation).
function lastHistoryUrl(): string | undefined {
  const { calls } = historySpy.mock;
  return calls.length ? (calls[calls.length - 1][2] as string) : undefined;
}

beforeEach(() => {
  global.fetch = mockFetch as unknown as typeof fetch;
  mockFetch.mockReset();
  mockReplace.mockClear();
  historySpy = jest.spyOn(window.history, 'replaceState');
  mockUseAuth.mockReturnValue({ user: { id: 42 } });
  mockCreateListingInteraction.mockReset();
  mockCreateListingInteraction.mockResolvedValue({});
  mockDeleteListingInteractions.mockReset();
  mockDeleteListingInteractions.mockResolvedValue({ deleted: 0 });
});

afterEach(() => {
  jest.useRealTimers();
  historySpy.mockRestore();
});

describe('ListingFlow', () => {
  it('defers URL sync and preserves the router history state', () => {
    jest.useFakeTimers();
    const routerState = { __NA: true, tree: ['listings'] };
    window.history.replaceState(routerState, '', '/listings');
    historySpy.mockClear();
    mockFetch.mockImplementation(() => new Promise<Response>(() => {}));

    const { unmount } = render(<ListingFlow initialListing={makeListing(100)} />);

    expect(historySpy).not.toHaveBeenCalled();

    act(() => {
      jest.runOnlyPendingTimers();
    });

    expect(historySpy).toHaveBeenCalledWith(routerState, '', '/listings/100');
    unmount();
  });

  it('cancels a pending URL sync when unmounted', () => {
    jest.useFakeTimers();
    mockFetch.mockImplementation(() => new Promise<Response>(() => {}));

    const { unmount } = render(<ListingFlow initialListing={makeListing(100)} />);

    expect(historySpy).not.toHaveBeenCalled();
    unmount();

    act(() => {
      jest.runOnlyPendingTimers();
    });

    expect(historySpy).not.toHaveBeenCalled();
  });

  it('loads the first listing fast, then hydrates the preload buffer in the background', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ listings: [makeListing(101)] }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ listings: [makeListing(101), makeListing(102)] }),
      } as Response);

    render(<ListingFlow />);

    expect(screen.getByText('Loading listings...')).toBeTruthy();
    expect(await screen.findByRole('heading', { name: 'Listing 101' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Skip' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Maybe' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Save' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Next' })).toBeNull();
    // Red marks it as a debug-only control rather than a normal user action.
    expect(screen.getByRole('button', { name: 'Delete preferences' })).toHaveClass(
      'text-red-600',
    );
    expect(screen.queryByRole('link', { name: 'Show me something I will like' })).toBeNull();

    // First paint fetches a single listing; the background hydration then fills
    // the preload buffer (current + 5 ahead).
    expect(mockFetch).toHaveBeenCalledWith('/api/listings/stack-rank?limit=1');
    await waitFor(() =>
      expect(mockFetch).toHaveBeenCalledWith('/api/listings/stack-rank?limit=6'),
    );
    await waitFor(() => expect(lastHistoryUrl()).toBe('/listings/101'));
    expect(historySpy).toHaveBeenLastCalledWith(
      window.history.state,
      '',
      '/listings/101',
    );
  });

  it('records Skip and advances to the next ranked listing', async () => {
    const user = userEvent.setup();
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ listings: [makeListing(202)] }),
    } as Response).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ listings: [] }),
    } as Response);

    render(<ListingFlow initialListing={makeListing(201)} />);

    await screen.findByRole('heading', { name: 'Listing 201' });
    await act(async () => {
      await user.click(screen.getByRole('button', { name: 'Skip' }));
    });

    expect(mockCreateListingInteraction).toHaveBeenCalledWith(
      expect.objectContaining({
        customer_id: 42,
        listing_id: 201,
        action: 0,
      }),
    );
    expect(await screen.findByRole('heading', { name: 'Listing 202' })).toBeTruthy();
    await waitFor(() => expect(lastHistoryUrl()).toBe('/listings/202'));
  });

  it('starts the next listing at its first image after advancing from a later image', async () => {
    const user = userEvent.setup();
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        listings: [makeListingWithImages(212, ['CCCC', 'DDDD'])],
      }),
    } as Response).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ listings: [] }),
    } as Response);

    render(<ListingFlow initialListing={makeListingWithImages(211, ['AAAA', 'BBBB'])} />);

    await act(async () => {
      await user.click(screen.getByRole('button', { name: 'Go to image 2' }));
    });
    expect(screen.getByTestId('carousel-image')).toHaveAttribute(
      'src',
      '/media/v1/bbbbaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa/card.webp',
    );

    await act(async () => {
      await user.click(screen.getByRole('button', { name: 'Skip' }));
    });

    expect(await screen.findByRole('heading', { name: 'Listing 212' })).toBeTruthy();
    expect(screen.getByTestId('carousel-image')).toHaveAttribute(
      'src',
      '/media/v1/ccccaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa/card.webp',
    );
  });

  it('records Save and advances through the same listing action contract', async () => {
    const user = userEvent.setup();
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ listings: [makeListing(302)] }),
    } as Response).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ listings: [] }),
    } as Response);

    render(<ListingFlow initialListing={makeListing(301)} />);

    await screen.findByRole('heading', { name: 'Listing 301' });
    await act(async () => {
      await user.click(screen.getByRole('button', { name: 'Save' }));
    });

    expect(mockCreateListingInteraction).toHaveBeenCalledWith(
      expect.objectContaining({
        customer_id: 42,
        listing_id: 301,
        action: 1,
      }),
    );
    expect(await screen.findByRole('heading', { name: 'Listing 302' })).toBeTruthy();
  });

  it('records Maybe as action 2 and advances to the next ranked listing', async () => {
    const user = userEvent.setup();
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ listings: [makeListing(402)] }),
    } as Response).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ listings: [] }),
    } as Response);

    render(<ListingFlow initialListing={makeListing(401)} />);

    await screen.findByRole('heading', { name: 'Listing 401' });
    await act(async () => {
      await user.click(screen.getByRole('button', { name: 'Maybe' }));
    });

    expect(mockCreateListingInteraction).toHaveBeenCalledWith(
      expect.objectContaining({
        customer_id: 42,
        listing_id: 401,
        action: 2,
      }),
    );
    expect(await screen.findByRole('heading', { name: 'Listing 402' })).toBeTruthy();
  });

  it('shows the terminal state inside the listings flow', async () => {
    const user = userEvent.setup();
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ listings: [] }),
    } as Response).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ listings: [] }),
    } as Response);

    render(<ListingFlow initialListing={makeListing(501)} />);

    await screen.findByRole('heading', { name: 'Listing 501' });
    await act(async () => {
      await user.click(screen.getByRole('button', { name: 'Skip' }));
    });

    expect(await screen.findByRole('heading', { name: 'No more listings' })).toBeTruthy();
  });

  it('keeps a loading state while the next post-action listing is being fetched', async () => {
    const user = userEvent.setup();
    let resolveContinuation: (response: Response) => void = () => {};
    const continuation = new Promise<Response>((resolve) => {
      resolveContinuation = resolve;
    });
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ listings: [] }),
    } as Response).mockImplementationOnce(() => continuation);

    render(<ListingFlow initialListing={makeListing(551)} />);

    await screen.findByRole('heading', { name: 'Listing 551' });
    await waitFor(() => expect(screen.queryByText('Loading more listings...')).toBeNull());

    await act(async () => {
      await user.click(screen.getByRole('button', { name: 'Save' }));
    });

    expect(screen.queryByRole('heading', { name: 'No more listings' })).toBeNull();
    expect(screen.getByText('Loading more listings...')).toBeTruthy();

    await act(async () => {
      resolveContinuation({
        ok: true,
        json: () => Promise.resolve({ listings: [makeListing(552)] }),
      } as Response);
    });

    expect(await screen.findByRole('heading', { name: 'Listing 552' })).toBeTruthy();
  });

  it('deletes listing preferences and reloads the listing queue from its initial state', async () => {
    const user = userEvent.setup();
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ listings: [makeListing(602)] }),
    } as Response).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ listings: [] }),
    } as Response).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ listings: [makeListing(701), makeListing(702)] }),
    } as Response);

    render(<ListingFlow initialListing={makeListing(601)} />);

    await screen.findByRole('heading', { name: 'Listing 601' });
    await act(async () => {
      await user.click(screen.getByRole('button', { name: 'Skip' }));
    });

    expect(await screen.findByRole('heading', { name: 'Listing 602' })).toBeTruthy();

    await act(async () => {
      await user.click(screen.getByRole('button', { name: 'Delete preferences' }));
    });

    expect(mockDeleteListingInteractions).toHaveBeenCalledWith(42);
    expect(mockCreateListingInteraction).toHaveBeenCalledTimes(1);
    expect(await screen.findByRole('heading', { name: 'Listing 701' })).toBeTruthy();
    await waitFor(() => expect(lastHistoryUrl()).toBe('/listings/701'));
  });

  it('ignores stale continuation fetches when deleting preferences reloads the queue', async () => {
    const user = userEvent.setup();
    let resolvePrefetch: (response: Response) => void = () => {};
    const stalePrefetch = new Promise<Response>((resolve) => {
      resolvePrefetch = resolve;
    });
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ listings: [makeListing(802)] }),
    } as Response).mockImplementationOnce(() => stalePrefetch).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ listings: [makeListing(901), makeListing(902)] }),
    } as Response);

    render(<ListingFlow initialListing={makeListing(801)} />);

    await screen.findByRole('heading', { name: 'Listing 801' });
    await act(async () => {
      await user.click(screen.getByRole('button', { name: 'Skip' }));
    });

    expect(await screen.findByRole('heading', { name: 'Listing 802' })).toBeTruthy();
    expect(await screen.findByText('Loading more listings...')).toBeTruthy();

    await act(async () => {
      await user.click(screen.getByRole('button', { name: 'Delete preferences' }));
    });

    expect(mockDeleteListingInteractions).toHaveBeenCalledWith(42);
    expect(await screen.findByRole('heading', { name: 'Listing 901' })).toBeTruthy();

    await act(async () => {
      resolvePrefetch({
        ok: true,
        json: () => Promise.resolve({ listings: [makeListing(803)] }),
      } as Response);
    });

    expect(screen.queryByRole('heading', { name: 'Listing 803' })).toBeNull();
    expect(screen.getByRole('heading', { name: 'Listing 901' })).toBeTruthy();
    await waitFor(() => expect(lastHistoryUrl()).toBe('/listings/901'));
  });
});
