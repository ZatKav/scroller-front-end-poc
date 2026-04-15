import { act, render, screen, waitFor } from '@testing-library/react';
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

afterEach(() => {
  jest.useRealTimers();
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

  it('shows loading state when queue is exhausted but continuation is still expected', async () => {
    const user = userEvent.setup();
    render(<ImageScroller images={[IMAGES[0]]} customerId={CUSTOMER_ID} noMoreAvailable={false} />);

    await act(async () => {
      await user.click(screen.getByRole('button', { name: 'Like' }));
    });

    expect(screen.getByText('Loading more images...')).toBeInTheDocument();
    expect(screen.queryByText('No more images')).not.toBeInTheDocument();
  });

  it('shows terminal empty state when continuation errors and no queued cards remain', async () => {
    const user = userEvent.setup();
    const { rerender } = render(
      <ImageScroller images={[IMAGES[0]]} customerId={CUSTOMER_ID} noMoreAvailable={false} />,
    );

    await act(async () => {
      await user.click(screen.getByRole('button', { name: 'Like' }));
    });
    expect(screen.getByText('Loading more images...')).toBeInTheDocument();

    rerender(
      <ImageScroller
        images={[IMAGES[0]]}
        customerId={CUSTOMER_ID}
        noMoreAvailable={false}
        continuationErrored
      />,
    );

    expect(screen.getByText('No more images')).toBeInTheDocument();
  });

  it('sends a like interaction and advances to the next image', async () => {
    const user = userEvent.setup();
    render(<ImageScroller images={IMAGES} customerId={CUSTOMER_ID} />);

    await act(async () => {
      await user.click(screen.getByRole('button', { name: 'Like' }));
    });

    expect(mockCreateInteraction).toHaveBeenCalledWith({
      customer_id: CUSTOMER_ID,
      image_id: 1,
      action: 1,
      view_duration_ms: expect.any(Number),
    });
    expect(Number.isInteger(mockCreateInteraction.mock.calls[0][0].view_duration_ms)).toBe(true);
    expect(mockCreateInteraction.mock.calls[0][0].view_duration_ms).toBeGreaterThanOrEqual(0);

    await waitFor(() => {
      expect(screen.getByRole('img')).toHaveAttribute('src', 'data:image/jpeg;base64,BBBB');
    });
  });

  it('notifies the parent after a successful card advance', async () => {
    const user = userEvent.setup();
    const onAdvance = jest.fn();

    render(<ImageScroller images={IMAGES} customerId={CUSTOMER_ID} onAdvance={onAdvance} />);

    await act(async () => {
      await user.click(screen.getByRole('button', { name: 'Like' }));
    });

    await waitFor(() => {
      expect(onAdvance).toHaveBeenCalledWith(1);
    });
  });

  it('sends a skip interaction and advances to the next image', async () => {
    const user = userEvent.setup();
    render(<ImageScroller images={IMAGES} customerId={CUSTOMER_ID} />);

    await act(async () => {
      await user.click(screen.getByRole('button', { name: 'Skip' }));
    });

    expect(mockCreateInteraction).toHaveBeenCalledWith({
      customer_id: CUSTOMER_ID,
      image_id: 1,
      action: 0,
      view_duration_ms: expect.any(Number),
    });
    expect(Number.isInteger(mockCreateInteraction.mock.calls[0][0].view_duration_ms)).toBe(true);
    expect(mockCreateInteraction.mock.calls[0][0].view_duration_ms).toBeGreaterThanOrEqual(0);

    await waitFor(() => {
      expect(screen.getByRole('img')).toHaveAttribute('src', 'data:image/jpeg;base64,BBBB');
    });
  });

  it('shows empty state after all images are acted on', async () => {
    const user = userEvent.setup();
    render(<ImageScroller images={IMAGES} customerId={CUSTOMER_ID} />);

    await act(async () => {
      await user.click(screen.getByRole('button', { name: 'Like' }));
    });
    await waitFor(() => {
      expect(screen.getByRole('img')).toHaveAttribute('src', 'data:image/jpeg;base64,BBBB');
    });

    await act(async () => {
      await user.click(screen.getByRole('button', { name: 'Skip' }));
    });
    await waitFor(() => {
      expect(screen.getByText('No more images')).toBeInTheDocument();
    });
  });

  it('measures duration per displayed image and resets after advancing', async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-04-06T10:00:00.000Z'));
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    render(<ImageScroller images={IMAGES} customerId={CUSTOMER_ID} />);

    jest.setSystemTime(new Date('2026-04-06T10:00:01.500Z'));
    await act(async () => {
      await user.click(screen.getByRole('button', { name: 'Like' }));
    });

    expect(mockCreateInteraction).toHaveBeenNthCalledWith(1, {
      customer_id: CUSTOMER_ID,
      image_id: 1,
      action: 1,
      view_duration_ms: 1500,
    });

    await waitFor(() => {
      expect(screen.getByRole('img')).toHaveAttribute('src', 'data:image/jpeg;base64,BBBB');
    });

    jest.setSystemTime(new Date('2026-04-06T10:00:02.250Z'));
    await act(async () => {
      await user.click(screen.getByRole('button', { name: 'Skip' }));
    });

    expect(mockCreateInteraction).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        customer_id: CUSTOMER_ID,
        image_id: 2,
        action: 0,
        view_duration_ms: expect.any(Number),
      }),
    );
    const secondDuration = mockCreateInteraction.mock.calls[1][0].view_duration_ms as number;
    expect(Number.isInteger(secondDuration)).toBe(true);
    expect(secondDuration).toBeGreaterThanOrEqual(0);
    expect(secondDuration).toBeLessThan(1000);
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

    await act(async () => {
      await user.click(screen.getByRole('button', { name: 'Like' }));
    });

    expect(screen.getByRole('button', { name: 'Like' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Skip' })).toBeDisabled();

    await act(async () => {
      resolveInteraction!();
    });

    await waitFor(() => {
      expect(screen.getByRole('img')).toHaveAttribute('src', 'data:image/jpeg;base64,BBBB');
    });
  });

  it('does not advance when the interaction POST fails', async () => {
    mockCreateInteraction.mockRejectedValueOnce(new Error('Network error'));
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
    const onAdvance = jest.fn();

    const user = userEvent.setup();
    render(<ImageScroller images={IMAGES} customerId={CUSTOMER_ID} onAdvance={onAdvance} />);

    await act(async () => {
      await user.click(screen.getByRole('button', { name: 'Like' }));
    });

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Like' })).not.toBeDisabled();
    });

    // Should still show the first image, not advance
    expect(screen.getByRole('img')).toHaveAttribute('src', 'data:image/jpeg;base64,AAAA');
    expect(onAdvance).not.toHaveBeenCalled();

    consoleSpy.mockRestore();
  });

  it('renders image_data that already contains a data URI prefix without double-prefixing', () => {
    const imagesWithDataUri = [
      { id: 3, image_data: 'data:image/png;base64,CCCC', image_summary: 'PNG image' },
    ];
    render(<ImageScroller images={imagesWithDataUri} customerId={CUSTOMER_ID} />);

    expect(screen.getByRole('img')).toHaveAttribute('src', 'data:image/png;base64,CCCC');
  });
});
