import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ShortlistFlow from '@/components/ShortlistFlow';
import { scrollerCustomerInteractionsDbApiClient } from '@/app/shared/clients/scroller-customer-interactions-db-api-client';
import type { CustomerListingInteraction } from '@/types/scroller-customer-interactions-db';

const mockGetListingInteractions =
  scrollerCustomerInteractionsDbApiClient.getCustomerListingInteractions as jest.Mock;
const mockUseAuth = jest.fn();
const mockFetch = jest.fn();

jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

jest.mock('@/app/shared/clients/scroller-customer-interactions-db-api-client', () => ({
  scrollerCustomerInteractionsDbApiClient: {
    getCustomerListingInteractions: jest.fn(),
  },
}));

function interaction(listingId: number, action: 0 | 1 | 2): CustomerListingInteraction {
  return {
    id: listingId,
    customer_id: 42,
    listing_id: listingId,
    action,
    view_duration_ms: 0,
    viewed_at: new Date().toISOString(),
  };
}

function listingResponse(id: number, title: string) {
  return {
    ok: true,
    json: () =>
      Promise.resolve({
        id,
        title,
        price: 450000 + id,
        images: [{ id, image_data: 'AAAA', is_primary: true, position: 0 }],
      }),
  } as Response;
}

beforeEach(() => {
  global.fetch = mockFetch as unknown as typeof fetch;
  mockFetch.mockReset();
  mockUseAuth.mockReturnValue({ user: { id: 42 } });
  mockGetListingInteractions.mockReset();
});

describe('ShortlistFlow', () => {
  it('renders saved listings with a "Saved …" label', async () => {
    mockGetListingInteractions.mockResolvedValue([interaction(101, 1)]);
    mockFetch.mockResolvedValue(listingResponse(101, 'Riverside Loft'));

    render(<ShortlistFlow />);

    expect(await screen.findByText('Riverside Loft')).toBeTruthy();
    expect(screen.getByText(/^Saved/)).toBeTruthy();
    expect(mockGetListingInteractions).toHaveBeenCalledWith(42, 0, 100, 1);
  });

  it('shows the empty state when nothing is saved', async () => {
    mockGetListingInteractions.mockResolvedValue([]);

    render(<ShortlistFlow />);

    expect(await screen.findByText('No saved homes yet')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Browse homes' })).toBeTruthy();
  });

  it('switches to the Maybe tab and loads action=2 interactions', async () => {
    mockGetListingInteractions.mockImplementation(
      (_customerId: number, _skip: number, _limit: number, action: 0 | 1 | 2) =>
        Promise.resolve(action === 2 ? [interaction(202, 2)] : [interaction(101, 1)]),
    );
    mockFetch.mockImplementation((url: string) =>
      Promise.resolve(
        url.includes('/202') ? listingResponse(202, 'Maybe Cottage') : listingResponse(101, 'Riverside Loft'),
      ),
    );

    const user = userEvent.setup();
    render(<ShortlistFlow />);

    await screen.findByText('Riverside Loft');

    await user.click(screen.getByRole('tab', { name: /maybe/i }));

    expect(await screen.findByText('Maybe Cottage')).toBeTruthy();
    expect(screen.getByText(/^Maybe ·/)).toBeTruthy();
    expect(mockGetListingInteractions).toHaveBeenLastCalledWith(42, 0, 100, 2);
  });
});
