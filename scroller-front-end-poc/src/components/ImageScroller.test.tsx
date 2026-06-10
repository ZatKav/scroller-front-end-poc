import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ImageScroller from './ImageScroller';

jest.mock('@/app/shared/clients/scroller-customer-interactions-db-api-client', () => ({
  scrollerCustomerInteractionsDbApiClient: {
    createCustomerImageInteraction: jest.fn().mockResolvedValue({}),
    deleteCustomerImageInteractions: jest.fn().mockResolvedValue({ deleted: 0 }),
  },
}));

import { scrollerCustomerInteractionsDbApiClient } from '@/app/shared/clients/scroller-customer-interactions-db-api-client';

const mockCreateInteraction =
  scrollerCustomerInteractionsDbApiClient.createCustomerImageInteraction as jest.Mock;
const mockDeleteInteractions =
  scrollerCustomerInteractionsDbApiClient.deleteCustomerImageInteractions as jest.Mock;

const IMAGES = [
  { id: 1, image_data: 'AAAA', image_summary: 'Nice house' },
  { id: 2, image_data: 'BBBB', image_summary: null },
];

const CUSTOMER_ID = 42;

let reloadMock: jest.Mock;
const originalLocation = window.location;

beforeEach(() => {
  mockCreateInteraction.mockClear();
  // Reset to the resolved default: some tests install a never-resolving
  // implementation, which otherwise leaks into later tests via the shared mock.
  mockCreateInteraction.mockResolvedValue({});
  mockDeleteInteractions.mockClear();
  mockDeleteInteractions.mockResolvedValue({ deleted: 0 });

  // jsdom does not implement navigation, so stub window.location.reload to
  // assert the post-reset page refresh without actually reloading (PRO-231).
  reloadMock = jest.fn();
  Object.defineProperty(window, 'location', {
    configurable: true,
    writable: true,
    value: { ...originalLocation, reload: reloadMock },
  });
});

afterEach(() => {
  Object.defineProperty(window, 'location', {
    configurable: true,
    writable: true,
    value: originalLocation,
  });
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

describe('ImageScroller', () => {
  it('renders the first image and both buttons', () => {
    render(<ImageScroller images={IMAGES} customerId={CUSTOMER_ID} />);

    const img = screen.getByRole('img');
    expect(img).toHaveAttribute('src', 'data:image/jpeg;base64,AAAA');
    expect(img).toHaveAttribute('alt', 'Nice house');
    // The summary text lives behind the Debug toggle (off by default), so it is
    // not visible on first render — see the 'debug toggle' suite (PRO-234).
    expect(screen.getByRole('button', { name: 'Like' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Skip' })).toBeInTheDocument();
  });

  it('shows empty state when images array is empty', () => {
    render(<ImageScroller images={[]} customerId={CUSTOMER_ID} />);

    expect(screen.getByText('No more images')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Like' })).not.toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Reset my interactions' }),
    ).toBeInTheDocument();
  });

  it('shows the reset button on the continuation-error screen', () => {
    render(
      <ImageScroller
        images={[]}
        customerId={CUSTOMER_ID}
        noMoreAvailable={false}
        continuationErrored
      />,
    );

    expect(screen.getByText('More images could not be loaded.')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Reset my interactions' }),
    ).toBeInTheDocument();
  });

  it('hides the reset button while more images are loading', () => {
    render(<ImageScroller images={[]} customerId={CUSTOMER_ID} noMoreAvailable={false} />);

    expect(screen.getByText('Loading more images...')).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Reset my interactions' }),
    ).not.toBeInTheDocument();
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

  it('keeps continuation failures distinct from terminal empty state', async () => {
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

    expect(screen.getByText('More images could not be loaded.')).toBeInTheDocument();
    expect(screen.queryByText('No more images')).not.toBeInTheDocument();
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

  describe('image sizing', () => {
    it('caps the image height with dynamic viewport units in the normal view', () => {
      render(<ImageScroller images={IMAGES} customerId={CUSTOMER_ID} />);

      const img = screen.getByTestId('scroller-image');
      expect(img).toHaveClass('w-full');
      expect(img).toHaveClass('object-contain');
      // dvh tracks the visible viewport as the address bar collapses (PRO-235);
      // the full-viewport size is applied only in the immersive view (PRO-239).
      expect(img).toHaveClass('max-h-[70dvh]');
      expect(img.className).not.toContain('max-h-[100dvh]');
      // The old fixed-vh caps are gone.
      expect(img.className).not.toContain('max-h-[70vh]');
      expect(img.className).not.toContain('max-h-[60vh]');
    });
  });

  describe('image tap zones', () => {
    it('records a skip and advances when the left tap zone is tapped', async () => {
      const user = userEvent.setup();
      render(<ImageScroller images={IMAGES} customerId={CUSTOMER_ID} />);

      await act(async () => {
        await user.click(screen.getByTestId('image-skip-zone'));
      });

      expect(mockCreateInteraction).toHaveBeenCalledWith({
        customer_id: CUSTOMER_ID,
        image_id: 1,
        action: 0,
        view_duration_ms: expect.any(Number),
      });

      await waitFor(() => {
        expect(screen.getByTestId('scroller-image')).toHaveAttribute(
          'src',
          'data:image/jpeg;base64,BBBB',
        );
      });
    });

    it('records a like and advances when the right tap zone is tapped', async () => {
      const user = userEvent.setup();
      render(<ImageScroller images={IMAGES} customerId={CUSTOMER_ID} />);

      await act(async () => {
        await user.click(screen.getByTestId('image-like-zone'));
      });

      expect(mockCreateInteraction).toHaveBeenCalledWith({
        customer_id: CUSTOMER_ID,
        image_id: 1,
        action: 1,
        view_duration_ms: expect.any(Number),
      });

      await waitFor(() => {
        expect(screen.getByTestId('scroller-image')).toHaveAttribute(
          'src',
          'data:image/jpeg;base64,BBBB',
        );
      });
    });

    it('keeps the tap zones out of the accessibility tree so they do not duplicate the buttons', () => {
      render(<ImageScroller images={IMAGES} customerId={CUSTOMER_ID} />);

      // aria-hidden tap zones must not surface as additional Skip/Like buttons.
      expect(screen.getAllByRole('button', { name: 'Skip' })).toHaveLength(1);
      expect(screen.getAllByRole('button', { name: 'Like' })).toHaveLength(1);
      expect(screen.getByTestId('image-skip-zone')).toHaveAttribute('aria-hidden', 'true');
      expect(screen.getByTestId('image-like-zone')).toHaveAttribute('aria-hidden', 'true');
    });

    it('disables the tap zones while an interaction is in flight', async () => {
      let resolveInteraction: () => void;
      mockCreateInteraction.mockImplementation(
        () => new Promise<void>((resolve) => { resolveInteraction = resolve; }),
      );

      const user = userEvent.setup();
      render(<ImageScroller images={IMAGES} customerId={CUSTOMER_ID} />);

      await act(async () => {
        await user.click(screen.getByTestId('image-like-zone'));
      });

      expect(screen.getByTestId('image-skip-zone')).toBeDisabled();
      expect(screen.getByTestId('image-like-zone')).toBeDisabled();

      await act(async () => {
        resolveInteraction!();
      });

      await waitFor(() => {
        expect(screen.getByTestId('scroller-image')).toHaveAttribute(
          'src',
          'data:image/jpeg;base64,BBBB',
        );
      });
    });
  });

  describe('image swipe gestures', () => {
    const SWIPE_START = { x: 200, y: 200 };

    // Drive a single-finger horizontal/vertical drag across the image swipe
    // area. deltaX > 0 swipes right (Like), deltaX < 0 swipes left (Skip).
    function swipe(deltaX: number, deltaY = 0) {
      const area = screen.getByTestId('scroller-swipe-area');
      fireEvent.touchStart(area, {
        touches: [{ clientX: SWIPE_START.x, clientY: SWIPE_START.y }],
      });
      fireEvent.touchEnd(area, {
        changedTouches: [
          { clientX: SWIPE_START.x + deltaX, clientY: SWIPE_START.y + deltaY },
        ],
      });
    }

    it('records a like and advances when the image is swiped right', async () => {
      render(<ImageScroller images={IMAGES} customerId={CUSTOMER_ID} />);

      await act(async () => {
        swipe(120);
      });

      expect(mockCreateInteraction).toHaveBeenCalledWith({
        customer_id: CUSTOMER_ID,
        image_id: 1,
        action: 1,
        view_duration_ms: expect.any(Number),
      });

      await waitFor(() => {
        expect(screen.getByTestId('scroller-image')).toHaveAttribute(
          'src',
          'data:image/jpeg;base64,BBBB',
        );
      });
    });

    it('records a skip and advances when the image is swiped left', async () => {
      render(<ImageScroller images={IMAGES} customerId={CUSTOMER_ID} />);

      await act(async () => {
        swipe(-120);
      });

      expect(mockCreateInteraction).toHaveBeenCalledWith({
        customer_id: CUSTOMER_ID,
        image_id: 1,
        action: 0,
        view_duration_ms: expect.any(Number),
      });

      await waitFor(() => {
        expect(screen.getByTestId('scroller-image')).toHaveAttribute(
          'src',
          'data:image/jpeg;base64,BBBB',
        );
      });
    });

    it('reuses the onAdvance notification for an accepted swipe', async () => {
      const onAdvance = jest.fn();
      render(<ImageScroller images={IMAGES} customerId={CUSTOMER_ID} onAdvance={onAdvance} />);

      await act(async () => {
        swipe(120);
      });

      await waitFor(() => {
        expect(onAdvance).toHaveBeenCalledWith(1);
      });
    });

    it('ignores a short horizontal drag below the swipe threshold', async () => {
      render(<ImageScroller images={IMAGES} customerId={CUSTOMER_ID} />);

      await act(async () => {
        swipe(20);
      });

      expect(mockCreateInteraction).not.toHaveBeenCalled();
      expect(screen.getByTestId('scroller-image')).toHaveAttribute(
        'src',
        'data:image/jpeg;base64,AAAA',
      );
    });

    it('ignores a mostly-vertical drag so page scrolling is not consumed', async () => {
      render(<ImageScroller images={IMAGES} customerId={CUSTOMER_ID} />);

      await act(async () => {
        // Long gesture, but vertical travel dominates the horizontal travel.
        swipe(70, 200);
      });

      expect(mockCreateInteraction).not.toHaveBeenCalled();
      expect(screen.getByTestId('scroller-image')).toHaveAttribute(
        'src',
        'data:image/jpeg;base64,AAAA',
      );
    });

    it('prevents the default action on a consumed swipe to suppress the ghost click', () => {
      render(<ImageScroller images={IMAGES} customerId={CUSTOMER_ID} />);

      const area = screen.getByTestId('scroller-swipe-area');
      fireEvent.touchStart(area, {
        touches: [{ clientX: SWIPE_START.x, clientY: SWIPE_START.y }],
      });
      const defaultPrevented = !fireEvent.touchEnd(area, {
        changedTouches: [{ clientX: SWIPE_START.x + 120, clientY: SWIPE_START.y }],
      });

      expect(defaultPrevented).toBe(true);
    });

    it('does not submit a second interaction when a swipe lands mid-flight', async () => {
      let resolveInteraction: () => void;
      mockCreateInteraction.mockImplementation(
        () => new Promise<void>((resolve) => { resolveInteraction = resolve; }),
      );
      const onAdvance = jest.fn();
      render(<ImageScroller images={IMAGES} customerId={CUSTOMER_ID} onAdvance={onAdvance} />);

      // First swipe starts an interaction that has not resolved yet.
      await act(async () => {
        swipe(120);
      });
      expect(mockCreateInteraction).toHaveBeenCalledTimes(1);

      // A second swipe before the first resolves must be dropped by the
      // in-flight guard: no duplicate POST and no second advance.
      await act(async () => {
        swipe(120);
      });
      expect(mockCreateInteraction).toHaveBeenCalledTimes(1);

      await act(async () => {
        resolveInteraction!();
      });

      await waitFor(() => {
        expect(screen.getByTestId('scroller-image')).toHaveAttribute(
          'src',
          'data:image/jpeg;base64,BBBB',
        );
      });
      expect(onAdvance).toHaveBeenCalledTimes(1);
    });
  });

  describe('mobile landscape', () => {
    const originalMatchMedia = window.matchMedia;

    function setMobileLandscape(matches: boolean) {
      window.matchMedia = jest.fn().mockReturnValue({
        matches,
        media: '(orientation: landscape) and (max-height: 600px)',
        onchange: null,
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        addListener: jest.fn(),
        removeListener: jest.fn(),
        dispatchEvent: jest.fn(),
      });
    }

    afterEach(() => {
      window.matchMedia = originalMatchMedia;
    });

    it('promotes the tap zones to accessible, labelled, focusable controls', async () => {
      setMobileLandscape(true);
      render(<ImageScroller images={IMAGES} customerId={CUSTOMER_ID} />);

      const skipZone = screen.getByTestId('image-skip-zone');
      const likeZone = screen.getByTestId('image-like-zone');

      await waitFor(() => {
        expect(skipZone).not.toHaveAttribute('aria-hidden');
      });
      expect(likeZone).not.toHaveAttribute('aria-hidden');
      expect(skipZone).toHaveAttribute('aria-label', 'Skip');
      expect(likeZone).toHaveAttribute('aria-label', 'Like');
      expect(skipZone).toHaveAttribute('tabindex', '0');
      expect(likeZone).toHaveAttribute('tabindex', '0');
    });

    it('hides the Skip/Like, Debug and Reset controls and expands the image in the immersive view', () => {
      setMobileLandscape(true);
      render(<ImageScroller images={IMAGES} customerId={CUSTOMER_ID} />);

      // In the immersive view the visible buttons row, debug toggle and reset
      // block are removed and the image fills the viewport (PRO-235, PRO-239).
      // Query by text so we match the visible buttons, not the tap zones.
      expect(screen.getByText('Skip').closest('div')).toHaveClass('hidden');
      expect(screen.getByTestId('debug-toggle').closest('label')).toHaveClass('hidden');
      expect(screen.getByText('Reset my interactions').closest('div')).toHaveClass('hidden');
      expect(screen.getByTestId('scroller-image')).toHaveClass('max-h-[100dvh]');
    });

    it('records a skip via the tap zone when the buttons are hidden in landscape', async () => {
      setMobileLandscape(true);
      const user = userEvent.setup();
      render(<ImageScroller images={IMAGES} customerId={CUSTOMER_ID} />);

      await act(async () => {
        await user.click(screen.getByTestId('image-skip-zone'));
      });

      expect(mockCreateInteraction).toHaveBeenCalledWith({
        customer_id: CUSTOMER_ID,
        image_id: 1,
        action: 0,
        view_duration_ms: expect.any(Number),
      });
    });

    it('keeps the tap zones inert in portrait so they do not duplicate the buttons', () => {
      setMobileLandscape(false);
      render(<ImageScroller images={IMAGES} customerId={CUSTOMER_ID} />);

      const skipZone = screen.getByTestId('image-skip-zone');
      expect(skipZone).toHaveAttribute('aria-hidden', 'true');
      expect(skipZone).toHaveAttribute('tabindex', '-1');
      expect(skipZone).not.toHaveAttribute('aria-label');
      expect(screen.getAllByRole('button', { name: 'Skip' })).toHaveLength(1);
      expect(screen.getAllByRole('button', { name: 'Like' })).toHaveLength(1);
    });

    it('does not attempt the Fullscreen API when entering landscape', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      const requestFullscreen = jest.fn();
      // jsdom does not define requestFullscreen; spy on a stub to prove it is
      // never called (dvh sizing is used instead of the Fullscreen API).
      Object.defineProperty(HTMLElement.prototype, 'requestFullscreen', {
        configurable: true,
        writable: true,
        value: requestFullscreen,
      });

      setMobileLandscape(true);
      render(<ImageScroller images={IMAGES} customerId={CUSTOMER_ID} />);

      expect(requestFullscreen).not.toHaveBeenCalled();
      expect(consoleSpy).not.toHaveBeenCalled();

      delete (HTMLElement.prototype as unknown as { requestFullscreen?: unknown }).requestFullscreen;
      consoleSpy.mockRestore();
    });
  });

  describe('fullscreen button and immersive view (PRO-238, PRO-239)', () => {
    const originalMatchMedia = window.matchMedia;
    let orientationListeners: Array<(event: { matches: boolean }) => void>;
    let portrait: boolean;
    let requestFullscreenMock: jest.Mock;
    let exitFullscreenMock: jest.Mock;
    let fullscreenElement: Element | null;

    // matchMedia mock that answers per query (portrait vs landscape) and lets a
    // test fire an orientation change, so the rotate-to-portrait auto-exit can be
    // exercised (the global stub's addEventListener is a no-op).
    function installOrientation(initialPortrait: boolean) {
      portrait = initialPortrait;
      orientationListeners = [];
      window.matchMedia = jest.fn().mockImplementation((query: string) => ({
        get matches() {
          return query.includes('portrait') ? portrait : !portrait;
        },
        media: query,
        onchange: null,
        addEventListener: (_type: string, cb: (event: { matches: boolean }) => void) =>
          orientationListeners.push(cb),
        removeEventListener: jest.fn(),
        addListener: (cb: (event: { matches: boolean }) => void) => orientationListeners.push(cb),
        removeListener: jest.fn(),
        dispatchEvent: jest.fn(),
      }));
    }

    function rotateTo(nextPortrait: boolean) {
      portrait = nextPortrait;
      act(() => {
        orientationListeners.forEach((cb) => cb({ matches: nextPortrait }));
      });
    }

    function setFullscreenSupported(supported: boolean) {
      Object.defineProperty(document, 'fullscreenEnabled', {
        configurable: true,
        writable: true,
        value: supported,
      });
    }

    function installFullscreenApi() {
      requestFullscreenMock = jest.fn();
      exitFullscreenMock = jest.fn();
      fullscreenElement = null;
      Object.defineProperty(HTMLElement.prototype, 'requestFullscreen', {
        configurable: true,
        writable: true,
        value: requestFullscreenMock,
      });
      Object.defineProperty(document, 'exitFullscreen', {
        configurable: true,
        writable: true,
        value: exitFullscreenMock,
      });
      Object.defineProperty(document, 'fullscreenElement', {
        configurable: true,
        get: () => fullscreenElement,
      });
    }

    // Simulate entering/leaving browser fullscreen: flip document.fullscreenElement
    // and fire the fullscreenchange event the component listens to. Call after
    // render so the listener is attached.
    function setFullscreen(active: boolean) {
      fullscreenElement = active ? document.documentElement : null;
      act(() => {
        document.dispatchEvent(new Event('fullscreenchange'));
      });
    }

    afterEach(() => {
      window.matchMedia = originalMatchMedia;
      delete (HTMLElement.prototype as unknown as { requestFullscreen?: unknown }).requestFullscreen;
      delete (document as unknown as { exitFullscreen?: unknown }).exitFullscreen;
      delete (document as unknown as { fullscreenElement?: unknown }).fullscreenElement;
      delete (document as unknown as { fullscreenEnabled?: unknown }).fullscreenEnabled;
    });

    it('shows the button in landscape too, not only portrait (toggle available anywhere)', () => {
      installOrientation(false); // landscape
      setFullscreenSupported(true);
      installFullscreenApi();
      render(<ImageScroller images={IMAGES} customerId={CUSTOMER_ID} />);

      expect(screen.getByTestId('fullscreen-button')).toBeInTheDocument();
    });

    it('does not render the button where the Fullscreen API is unsupported', () => {
      installOrientation(true);
      setFullscreenSupported(false);
      render(<ImageScroller images={IMAGES} customerId={CUSTOMER_ID} />);

      expect(screen.queryByTestId('fullscreen-button')).not.toBeInTheDocument();
    });

    it('requests fullscreen when tapped, without recording an interaction', async () => {
      installOrientation(true);
      setFullscreenSupported(true);
      installFullscreenApi();
      const user = userEvent.setup();
      render(<ImageScroller images={IMAGES} customerId={CUSTOMER_ID} />);

      const button = screen.getByTestId('fullscreen-button');
      expect(button).toHaveAttribute('aria-label', 'Enter fullscreen');
      await act(async () => {
        await user.click(button);
      });

      expect(requestFullscreenMock).toHaveBeenCalledTimes(1);
      expect(mockCreateInteraction).not.toHaveBeenCalled();
    });

    it('toggles back out when tapped while fullscreen, showing an exit label', async () => {
      installOrientation(true);
      setFullscreenSupported(true);
      installFullscreenApi();
      const user = userEvent.setup();
      render(<ImageScroller images={IMAGES} customerId={CUSTOMER_ID} />);

      setFullscreen(true);
      const button = screen.getByTestId('fullscreen-button');
      expect(button).toHaveAttribute('aria-label', 'Exit fullscreen');

      await act(async () => {
        await user.click(button);
      });

      expect(exitFullscreenMock).toHaveBeenCalledTimes(1);
    });

    it('shows the immersive view when fullscreen on a non-mobile-landscape viewport', () => {
      installOrientation(true); // tablet/desktop portrait — not mobile landscape
      setFullscreenSupported(true);
      installFullscreenApi();
      render(<ImageScroller images={IMAGES} customerId={CUSTOMER_ID} />);

      // Normal view before fullscreen.
      expect(screen.getByTestId('scroller-image')).toHaveClass('max-h-[70dvh]');
      expect(screen.getByText('Skip').closest('div')).not.toHaveClass('hidden');

      setFullscreen(true);

      // Immersive once fullscreen: image fills, controls hidden, toggle stays.
      expect(screen.getByTestId('scroller-image')).toHaveClass('max-h-[100dvh]');
      expect(screen.getByText('Skip').closest('div')).toHaveClass('hidden');
      expect(screen.getByTestId('fullscreen-button')).toBeInTheDocument();
    });

    it('restores the normal view when fullscreen is exited (e.g. Esc or refresh)', () => {
      installOrientation(true);
      setFullscreenSupported(true);
      installFullscreenApi();
      render(<ImageScroller images={IMAGES} customerId={CUSTOMER_ID} />);

      setFullscreen(true);
      expect(screen.getByTestId('scroller-image')).toHaveClass('max-h-[100dvh]');

      setFullscreen(false);
      expect(screen.getByTestId('scroller-image')).toHaveClass('max-h-[70dvh]');
      expect(screen.getByText('Skip').closest('div')).not.toHaveClass('hidden');
    });

    it('exits fullscreen when the device rotates back to portrait', () => {
      installOrientation(false); // start in landscape, already fullscreen
      setFullscreenSupported(true);
      installFullscreenApi();
      fullscreenElement = document.documentElement;
      render(<ImageScroller images={IMAGES} customerId={CUSTOMER_ID} />);

      expect(exitFullscreenMock).not.toHaveBeenCalled();

      rotateTo(true);

      expect(exitFullscreenMock).toHaveBeenCalledTimes(1);
    });
  });

  describe('layout', () => {
    it('renders the action buttons above the image-summary and weights readout', async () => {
      const user = userEvent.setup();
      render(<ImageScroller images={IMAGES} customerId={CUSTOMER_ID} />);
      await user.click(screen.getByTestId('debug-toggle'));

      const likeButton = screen.getByRole('button', { name: 'Like' });
      const summary = screen.getByTestId('image-summary');
      const weights = screen.getByTestId('stack-rank-weights');

      // DOCUMENT_POSITION_FOLLOWING (4) means the argument comes after the node.
      expect(
        likeButton.compareDocumentPosition(summary) & Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBeTruthy();
      expect(
        likeButton.compareDocumentPosition(weights) & Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBeTruthy();
    });

    it('renders the image summary inside a preformatted code-style block', async () => {
      const user = userEvent.setup();
      render(<ImageScroller images={IMAGES} customerId={CUSTOMER_ID} />);
      await user.click(screen.getByTestId('debug-toggle'));

      const summary = screen.getByTestId('image-summary');
      expect(summary.tagName).toBe('PRE');
      expect(summary).toHaveTextContent('Nice house');
    });

    it('omits the image-summary block but keeps the weights block when image_summary is null', async () => {
      const user = userEvent.setup();
      render(<ImageScroller images={[IMAGES[1]]} customerId={CUSTOMER_ID} />);
      await user.click(screen.getByTestId('debug-toggle'));

      expect(screen.queryByTestId('image-summary')).not.toBeInTheDocument();
      expect(screen.getByTestId('stack-rank-weights')).toBeInTheDocument();
    });
  });

  describe('debug toggle', () => {
    it('hides the summary and weights by default with the checkbox unticked', () => {
      render(<ImageScroller images={IMAGES} customerId={CUSTOMER_ID} />);

      const toggle = screen.getByTestId('debug-toggle');
      expect(toggle).not.toBeChecked();
      expect(screen.queryByTestId('image-summary')).not.toBeInTheDocument();
      expect(screen.queryByTestId('stack-rank-weights')).not.toBeInTheDocument();
    });

    it('reveals the summary and weights when ticked and hides them again when unticked', async () => {
      const user = userEvent.setup();
      render(<ImageScroller images={IMAGES} customerId={CUSTOMER_ID} />);

      await user.click(screen.getByTestId('debug-toggle'));
      expect(screen.getByTestId('image-summary')).toBeInTheDocument();
      expect(screen.getByTestId('stack-rank-weights')).toBeInTheDocument();

      await user.click(screen.getByTestId('debug-toggle'));
      expect(screen.queryByTestId('image-summary')).not.toBeInTheDocument();
      expect(screen.queryByTestId('stack-rank-weights')).not.toBeInTheDocument();
    });

    it('keeps the debug preference when advancing to the next image', async () => {
      const user = userEvent.setup();
      render(<ImageScroller images={IMAGES} customerId={CUSTOMER_ID} />);

      await user.click(screen.getByTestId('debug-toggle'));
      expect(screen.getByTestId('image-summary')).toBeInTheDocument();

      await act(async () => {
        await user.click(screen.getByRole('button', { name: 'Like' }));
      });

      await waitFor(() => {
        expect(screen.getByTestId('scroller-image')).toHaveAttribute(
          'src',
          'data:image/jpeg;base64,BBBB',
        );
      });
      expect(screen.getByTestId('debug-toggle')).toBeChecked();
      expect(screen.getByTestId('stack-rank-weights')).toBeInTheDocument();
    });
  });

  describe('reset interactions', () => {
    it('renders the reset button below the action buttons', () => {
      render(<ImageScroller images={IMAGES} customerId={CUSTOMER_ID} />);

      expect(
        screen.getByRole('button', { name: 'Reset my interactions' }),
      ).toBeInTheDocument();
    });

    it('deletes the current user interactions after confirmation and reloads the page', async () => {
      jest.spyOn(window, 'confirm').mockReturnValue(true);
      mockDeleteInteractions.mockResolvedValueOnce({ deleted: 3 });
      const user = userEvent.setup();
      render(<ImageScroller images={IMAGES} customerId={CUSTOMER_ID} />);

      await act(async () => {
        await user.click(screen.getByRole('button', { name: 'Reset my interactions' }));
      });

      expect(mockDeleteInteractions).toHaveBeenCalledWith(CUSTOMER_ID);
      await waitFor(() => {
        expect(reloadMock).toHaveBeenCalledTimes(1);
      });
      expect(screen.queryByRole('status')).not.toBeInTheDocument();
    });

    it('does not send a delete request or reload when the confirmation is cancelled', async () => {
      jest.spyOn(window, 'confirm').mockReturnValue(false);
      const user = userEvent.setup();
      render(<ImageScroller images={IMAGES} customerId={CUSTOMER_ID} />);

      await act(async () => {
        await user.click(screen.getByRole('button', { name: 'Reset my interactions' }));
      });

      expect(mockDeleteInteractions).not.toHaveBeenCalled();
      expect(reloadMock).not.toHaveBeenCalled();
      expect(screen.queryByRole('status')).not.toBeInTheDocument();
    });

    it('reloads the page even when there were no interactions to reset', async () => {
      jest.spyOn(window, 'confirm').mockReturnValue(true);
      mockDeleteInteractions.mockResolvedValueOnce({ deleted: 0 });
      const user = userEvent.setup();
      render(<ImageScroller images={IMAGES} customerId={CUSTOMER_ID} />);

      await act(async () => {
        await user.click(screen.getByRole('button', { name: 'Reset my interactions' }));
      });

      expect(mockDeleteInteractions).toHaveBeenCalledWith(CUSTOMER_ID);
      await waitFor(() => {
        expect(reloadMock).toHaveBeenCalledTimes(1);
      });
    });

    it('shows an error message and does not reload when the delete fails', async () => {
      jest.spyOn(window, 'confirm').mockReturnValue(true);
      jest.spyOn(console, 'error').mockImplementation();
      mockDeleteInteractions.mockRejectedValueOnce(new Error('boom'));
      const user = userEvent.setup();
      render(<ImageScroller images={IMAGES} customerId={CUSTOMER_ID} />);

      await act(async () => {
        await user.click(screen.getByRole('button', { name: 'Reset my interactions' }));
      });

      await waitFor(() => {
        expect(screen.getByRole('status')).toHaveTextContent(
          'Could not reset your interactions. Please try again.',
        );
      });
      expect(reloadMock).not.toHaveBeenCalled();
    });

    describe('from the no-more-images screen', () => {
      it('deletes interactions after confirmation and reloads the page', async () => {
        jest.spyOn(window, 'confirm').mockReturnValue(true);
        mockDeleteInteractions.mockResolvedValueOnce({ deleted: 3 });
        const user = userEvent.setup();
        render(<ImageScroller images={[]} customerId={CUSTOMER_ID} />);

        await act(async () => {
          await user.click(screen.getByRole('button', { name: 'Reset my interactions' }));
        });

        expect(mockDeleteInteractions).toHaveBeenCalledWith(CUSTOMER_ID);
        await waitFor(() => {
          expect(reloadMock).toHaveBeenCalledTimes(1);
        });
      });

      it('does not send a delete request or reload when the confirmation is cancelled', async () => {
        jest.spyOn(window, 'confirm').mockReturnValue(false);
        const user = userEvent.setup();
        render(<ImageScroller images={[]} customerId={CUSTOMER_ID} />);

        await act(async () => {
          await user.click(screen.getByRole('button', { name: 'Reset my interactions' }));
        });

        expect(mockDeleteInteractions).not.toHaveBeenCalled();
        expect(reloadMock).not.toHaveBeenCalled();
        expect(screen.queryByRole('status')).not.toBeInTheDocument();
      });

      it('reloads the page even when there were no interactions to reset', async () => {
        jest.spyOn(window, 'confirm').mockReturnValue(true);
        mockDeleteInteractions.mockResolvedValueOnce({ deleted: 0 });
        const user = userEvent.setup();
        render(<ImageScroller images={[]} customerId={CUSTOMER_ID} />);

        await act(async () => {
          await user.click(screen.getByRole('button', { name: 'Reset my interactions' }));
        });

        await waitFor(() => {
          expect(reloadMock).toHaveBeenCalledTimes(1);
        });
      });

      it('shows an error message and does not reload when the delete fails', async () => {
        jest.spyOn(window, 'confirm').mockReturnValue(true);
        jest.spyOn(console, 'error').mockImplementation();
        mockDeleteInteractions.mockRejectedValueOnce(new Error('boom'));
        const user = userEvent.setup();
        render(<ImageScroller images={[]} customerId={CUSTOMER_ID} />);

        await act(async () => {
          await user.click(screen.getByRole('button', { name: 'Reset my interactions' }));
        });

        await waitFor(() => {
          expect(screen.getByRole('status')).toHaveTextContent(
            'Could not reset your interactions. Please try again.',
          );
        });
        expect(reloadMock).not.toHaveBeenCalled();
      });
    });
  });

  it('renders the stack-rank weights as raw JSON under the image', async () => {
    const user = userEvent.setup();
    const scoredImages = [
      {
        id: 1,
        image_data: 'AAAA',
        image_summary: 'Nice house',
        final_score: 0.73,
        selection_reason: 'exploit',
      },
    ];
    const profileWeights = { 'decor_style:modern': 1.0, 'material:quartz': 0.5 };

    render(
      <ImageScroller images={scoredImages} customerId={CUSTOMER_ID} profileWeights={profileWeights} />,
    );
    await user.click(screen.getByTestId('debug-toggle'));

    const weightsBlock = screen.getByTestId('stack-rank-weights');
    const parsed = JSON.parse(weightsBlock.textContent ?? '');
    expect(parsed).toEqual({
      profile_weights: profileWeights,
      image_score: { final_score: 0.73, selection_reason: 'exploit' },
    });
    // The existing summary text is still shown alongside the weights.
    expect(screen.getByText('Nice house')).toBeInTheDocument();
  });

  it('renders an empty weights object for a cold-start customer with no scores', async () => {
    const user = userEvent.setup();
    render(<ImageScroller images={IMAGES} customerId={CUSTOMER_ID} />);
    await user.click(screen.getByTestId('debug-toggle'));

    const weightsBlock = screen.getByTestId('stack-rank-weights');
    const parsed = JSON.parse(weightsBlock.textContent ?? '');
    expect(parsed).toEqual({
      profile_weights: {},
      image_score: { final_score: null, selection_reason: null },
    });
  });
});

describe('view listing button (PRO-256)', () => {
  // Cards carrying an enrichment-db listing id; the default IMAGES fixture has
  // none, which is itself one of the cases under test.
  const IMAGES_WITH_LISTING = [
    { id: 1, listing_id: 42, image_data: 'AAAA', image_summary: 'Nice house' },
    { id: 2, listing_id: 99, image_data: 'BBBB', image_summary: null },
  ];

  it('links to the listing detail route for the current card listing id', () => {
    render(<ImageScroller images={IMAGES_WITH_LISTING} customerId={CUSTOMER_ID} />);

    const link = screen.getByTestId('view-listing-button');
    // No NEXT_PUBLIC_BASE_PATH is set under test, so appPath leaves the route
    // unprefixed; the base-path prefixing itself is covered by base-path.test.ts.
    expect(link).toHaveAttribute('href', '/listing/42');
    expect(link).toHaveAccessibleName('View listing');
  });

  it('does not render the control when the card has no listing id', () => {
    // The default IMAGES fixture has no listing_id.
    render(<ImageScroller images={IMAGES} customerId={CUSTOMER_ID} />);

    expect(screen.queryByTestId('view-listing-button')).not.toBeInTheDocument();
    // No link pointing at the detail route, broken or otherwise.
    expect(screen.queryByRole('link', { name: 'View listing' })).not.toBeInTheDocument();
  });

  it('does not render the control when listing_id is explicitly null', () => {
    render(
      <ImageScroller
        images={[{ id: 1, listing_id: null, image_data: 'AAAA', image_summary: null }]}
        customerId={CUSTOMER_ID}
      />,
    );

    expect(screen.queryByTestId('view-listing-button')).not.toBeInTheDocument();
  });

  it('does not record an interaction or advance the card when activated', async () => {
    const user = userEvent.setup();
    const onAdvance = jest.fn();
    render(
      <ImageScroller
        images={IMAGES_WITH_LISTING}
        customerId={CUSTOMER_ID}
        onAdvance={onAdvance}
      />,
    );

    // jsdom does not implement navigation, so an anchor click logs a benign
    // "Not implemented: navigation" error rather than navigating; swallow it so
    // the assertions below stay focused on the interaction/advance behaviour.
    const navigationErrorSpy = jest.spyOn(console, 'error').mockImplementation();
    await act(async () => {
      await user.click(screen.getByTestId('view-listing-button'));
    });
    navigationErrorSpy.mockRestore();

    expect(mockCreateInteraction).not.toHaveBeenCalled();
    expect(onAdvance).not.toHaveBeenCalled();
    // Still on the first card.
    expect(screen.getByRole('img')).toHaveAttribute('src', 'data:image/jpeg;base64,AAAA');
  });

  it('hides the control in the immersive view', () => {
    const originalMatchMedia = window.matchMedia;
    // Report mobile landscape so the component enters the immersive view, where
    // the Skip/Like buttons are hidden and the View-listing control follows.
    window.matchMedia = jest.fn().mockReturnValue({
      matches: true,
      media: '(orientation: landscape) and (max-height: 600px)',
      onchange: null,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      addListener: jest.fn(),
      removeListener: jest.fn(),
      dispatchEvent: jest.fn(),
    });

    try {
      render(<ImageScroller images={IMAGES_WITH_LISTING} customerId={CUSTOMER_ID} />);
      // Confirm we really are immersive (Skip/Like row hidden) before asserting
      // the View-listing control is gone too.
      expect(screen.getByText('Skip').closest('div')).toHaveClass('hidden');
      expect(screen.queryByTestId('view-listing-button')).not.toBeInTheDocument();
    } finally {
      window.matchMedia = originalMatchMedia;
    }
  });
});
