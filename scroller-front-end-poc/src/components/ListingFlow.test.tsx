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
    images: [{ id: id * 10, image_data: 'AAAA', is_primary: true, position: 0 }],
  };
}

beforeEach(() => {
  global.fetch = mockFetch as unknown as typeof fetch;
  mockFetch.mockReset();
  mockReplace.mockClear();
  mockUseAuth.mockReturnValue({ user: { id: 42 } });
  mockCreateListingInteraction.mockReset();
  mockCreateListingInteraction.mockResolvedValue({});
  mockDeleteListingInteractions.mockReset();
  mockDeleteListingInteractions.mockResolvedValue({ deleted: 0 });
});

describe('ListingFlow', () => {
  it('loads the listing stack-rank queue and moves /listings to the first listing URL', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ listings: [makeListing(101), makeListing(102)] }),
    } as Response);

    render(<ListingFlow />);

    expect(screen.getByText('Loading listings...')).toBeTruthy();
    expect(await screen.findByRole('heading', { name: 'Listing 101' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Skip' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Like' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Next' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Delete preferences' })).toBeTruthy();
    expect(mockFetch).toHaveBeenCalledWith('/api/listings/stack-rank?limit=4');
    await waitFor(() => expect(mockReplace).toHaveBeenLastCalledWith('/listings/101'));
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
    await waitFor(() => expect(mockReplace).toHaveBeenLastCalledWith('/listings/202'));
  });

  it('records Like and advances through the same listing action contract', async () => {
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
      await user.click(screen.getByRole('button', { name: 'Like' }));
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

  it('shows the terminal state inside the listings flow', async () => {
    const user = userEvent.setup();
    mockFetch.mockResolvedValueOnce({
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
    await waitFor(() => expect(mockReplace).toHaveBeenLastCalledWith('/listings/701'));
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
    await waitFor(() => expect(mockReplace).toHaveBeenLastCalledWith('/listings/901'));
  });

});
