import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ImageScroller from './ImageScroller';

jest.mock('@/app/shared/clients/scroller-customer-interactions-db-api-client', () => ({
  scrollerCustomerInteractionsDbApiClient: {
    createCustomerImageInteraction: jest.fn().mockResolvedValue({}),
  },
}));

import { scrollerCustomerInteractionsDbApiClient } from '@/app/shared/clients/scroller-customer-interactions-db-api-client';

const mockCreateInteraction =
  scrollerCustomerInteractionsDbApiClient.createCustomerImageInteraction as jest.Mock;

const IMAGES = [
  { id: 1, image_data: 'AAAA', image_summary: 'Nice house' },
  { id: 2, image_data: 'BBBB', image_summary: null },
];

const CUSTOMER_ID = 42;

beforeEach(() => {
  mockCreateInteraction.mockClear();
});

describe('ImageScroller', () => {
  it('renders the first image and both buttons', () => {
    render(<ImageScroller images={IMAGES} customerId={CUSTOMER_ID} />);

    const img = screen.getByRole('img');
    expect(img).toHaveAttribute('src', 'data:image/jpeg;base64,AAAA');
    expect(img).toHaveAttribute('alt', 'Nice house');
    expect(screen.getByText('Nice house')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Like' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Skip' })).toBeInTheDocument();
  });

  it('shows empty state when images array is empty', () => {
    render(<ImageScroller images={[]} customerId={CUSTOMER_ID} />);

    expect(screen.getByText('No more images')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Like' })).not.toBeInTheDocument();
  });

  it('sends a like interaction and advances to the next image', async () => {
    const user = userEvent.setup();
    render(<ImageScroller images={IMAGES} customerId={CUSTOMER_ID} />);

    await user.click(screen.getByRole('button', { name: 'Like' }));

    expect(mockCreateInteraction).toHaveBeenCalledWith({
      customer_id: CUSTOMER_ID,
      image_id: 1,
      action: 1,
    });

    await waitFor(() => {
      expect(screen.getByRole('img')).toHaveAttribute('src', 'data:image/jpeg;base64,BBBB');
    });
  });

  it('sends a skip interaction and advances to the next image', async () => {
    const user = userEvent.setup();
    render(<ImageScroller images={IMAGES} customerId={CUSTOMER_ID} />);

    await user.click(screen.getByRole('button', { name: 'Skip' }));

    expect(mockCreateInteraction).toHaveBeenCalledWith({
      customer_id: CUSTOMER_ID,
      image_id: 1,
      action: 0,
    });

    await waitFor(() => {
      expect(screen.getByRole('img')).toHaveAttribute('src', 'data:image/jpeg;base64,BBBB');
    });
  });

  it('shows empty state after all images are acted on', async () => {
    const user = userEvent.setup();
    render(<ImageScroller images={IMAGES} customerId={CUSTOMER_ID} />);

    await user.click(screen.getByRole('button', { name: 'Like' }));
    await waitFor(() => {
      expect(screen.getByRole('img')).toHaveAttribute('src', 'data:image/jpeg;base64,BBBB');
    });

    await user.click(screen.getByRole('button', { name: 'Skip' }));
    await waitFor(() => {
      expect(screen.getByText('No more images')).toBeInTheDocument();
    });
  });

  it('uses "Property image" as alt text when image_summary is null', () => {
    render(<ImageScroller images={[IMAGES[1]]} customerId={CUSTOMER_ID} />);

    expect(screen.getByRole('img')).toHaveAttribute('alt', 'Property image');
  });

  it('disables buttons while submitting', async () => {
    let resolveInteraction: () => void;
    mockCreateInteraction.mockImplementation(
      () => new Promise<void>((resolve) => { resolveInteraction = resolve; }),
    );

    const user = userEvent.setup();
    render(<ImageScroller images={IMAGES} customerId={CUSTOMER_ID} />);

    await user.click(screen.getByRole('button', { name: 'Like' }));

    expect(screen.getByRole('button', { name: 'Like' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Skip' })).toBeDisabled();

    resolveInteraction!();

    await waitFor(() => {
      expect(screen.getByRole('img')).toHaveAttribute('src', 'data:image/jpeg;base64,BBBB');
    });
  });
});
