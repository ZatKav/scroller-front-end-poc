import { act, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { scrollerCustomerInteractionsDbApiClient } from '@/app/shared/clients/scroller-customer-interactions-db-api-client';
import ListingImageCarousel, { type CarouselImage } from './ListingImageCarousel';

jest.mock('@/app/shared/clients/scroller-customer-interactions-db-api-client', () => ({
  scrollerCustomerInteractionsDbApiClient: {
    createCustomerImageInteraction: jest.fn().mockResolvedValue({}),
    createCustomerListingInteraction: jest.fn().mockResolvedValue({}),
  },
}));

const mockCreateCustomerImageInteraction =
  scrollerCustomerInteractionsDbApiClient.createCustomerImageInteraction as jest.Mock;
const mockCreateCustomerListingInteraction =
  scrollerCustomerInteractionsDbApiClient.createCustomerListingInteraction as jest.Mock;

const IMAGES: CarouselImage[] = [
  { contentHash: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', alt: 'Front of house' },
  { contentHash: 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb', alt: 'Kitchen' },
  { contentHash: 'cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc', alt: 'Garden' },
];

const SWIPE_START = { x: 200, y: 200 };

// Drive a single-finger horizontal/vertical drag across the carousel viewport.
// deltaX < 0 swipes left (next), deltaX > 0 swipes right (previous).
function swipe(deltaX: number, deltaY = 0) {
  const area = screen.getByTestId('carousel-viewport');
  fireEvent.touchStart(area, {
    touches: [{ clientX: SWIPE_START.x, clientY: SWIPE_START.y }],
  });
  fireEvent.touchEnd(area, {
    changedTouches: [
      { clientX: SWIPE_START.x + deltaX, clientY: SWIPE_START.y + deltaY },
    ],
  });
}

describe('ListingImageCarousel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the first image and a dot per image on mount', () => {
    render(<ListingImageCarousel images={IMAGES} />);

    const img = screen.getByTestId('carousel-image');
    expect(img).toHaveAttribute('src', '/media/v1/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa/card.webp');
    expect(img).toHaveAttribute('alt', 'Front of house');

    expect(screen.getByTestId('carousel-dots').children).toHaveLength(3);
    expect(screen.getByTestId('carousel-dot-0')).toHaveAttribute('aria-current', 'true');
    expect(screen.getByTestId('carousel-dot-1')).not.toHaveAttribute('aria-current');
    expect(screen.getByTestId('carousel-status')).toHaveTextContent('Image 1 of 3');
  });

  it('navigates to a chosen image when its paging dot is activated', async () => {
    const user = userEvent.setup();
    render(<ListingImageCarousel images={IMAGES} />);

    await act(async () => {
      await user.click(screen.getByTestId('carousel-dot-2'));
    });

    expect(screen.getByTestId('carousel-image')).toHaveAttribute(
      'src',
      '/media/v1/cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc/card.webp',
    );
    expect(screen.getByTestId('carousel-dot-2')).toHaveAttribute('aria-current', 'true');
    expect(screen.getByTestId('carousel-status')).toHaveTextContent('Image 3 of 3');
  });

  it('advances to the next image when swiped left', () => {
    render(<ListingImageCarousel images={IMAGES} />);

    act(() => {
      swipe(-120);
    });

    expect(screen.getByTestId('carousel-image')).toHaveAttribute(
      'src',
      '/media/v1/bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb/card.webp',
    );
  });

  it('returns to the previous image when swiped right', () => {
    render(<ListingImageCarousel images={IMAGES} />);

    act(() => {
      swipe(-120);
    });
    expect(screen.getByTestId('carousel-image').getAttribute('src')).toBe(
      '/media/v1/bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb/card.webp',
    );

    act(() => {
      swipe(120);
    });
    expect(screen.getByTestId('carousel-image').getAttribute('src')).toBe(
      '/media/v1/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa/card.webp',
    );
  });

  it('keeps left and right swipes local to the carousel without navigation or interactions', () => {
    const navigateToListings = jest.fn();
    render(
      <section>
        <a href="/listings" onClick={navigateToListings}>
          Show me something I will like
        </a>
        <ListingImageCarousel images={IMAGES} />
      </section>,
    );

    act(() => {
      swipe(-120);
    });
    expect(screen.getByTestId('carousel-image').getAttribute('src')).toBe(
      '/media/v1/bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb/card.webp',
    );

    act(() => {
      swipe(120);
    });
    expect(screen.getByTestId('carousel-image').getAttribute('src')).toBe(
      '/media/v1/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa/card.webp',
    );

    expect(navigateToListings).not.toHaveBeenCalled();
    expect(mockCreateCustomerImageInteraction).not.toHaveBeenCalled();
    expect(mockCreateCustomerListingInteraction).not.toHaveBeenCalled();
  });

  it('ignores a short horizontal drag below the swipe threshold', () => {
    render(<ListingImageCarousel images={IMAGES} />);

    act(() => {
      swipe(20);
    });

    expect(screen.getByTestId('carousel-image')).toHaveAttribute(
      'src',
      '/media/v1/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa/card.webp',
    );
  });

  it('ignores a mostly-vertical drag so page scrolling is not consumed', () => {
    render(<ListingImageCarousel images={IMAGES} />);

    act(() => {
      // Long gesture, but vertical travel dominates the horizontal travel.
      swipe(70, 200);
    });

    expect(screen.getByTestId('carousel-image')).toHaveAttribute(
      'src',
      '/media/v1/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa/card.webp',
    );
  });

  it('prevents the default action on a consumed swipe to suppress the ghost click', () => {
    render(<ListingImageCarousel images={IMAGES} />);

    const area = screen.getByTestId('carousel-viewport');
    fireEvent.touchStart(area, {
      touches: [{ clientX: SWIPE_START.x, clientY: SWIPE_START.y }],
    });
    const defaultPrevented = !fireEvent.touchEnd(area, {
      changedTouches: [{ clientX: SWIPE_START.x - 120, clientY: SWIPE_START.y }],
    });

    expect(defaultPrevented).toBe(true);
  });

  it('navigates with the left and right arrow keys', () => {
    render(<ListingImageCarousel images={IMAGES} />);

    const viewport = screen.getByTestId('carousel-viewport');

    act(() => {
      fireEvent.keyDown(viewport, { key: 'ArrowRight' });
    });
    expect(screen.getByTestId('carousel-image')).toHaveAttribute(
      'src',
      '/media/v1/bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb/card.webp',
    );

    act(() => {
      fireEvent.keyDown(viewport, { key: 'ArrowLeft' });
    });
    expect(screen.getByTestId('carousel-image')).toHaveAttribute(
      'src',
      '/media/v1/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa/card.webp',
    );
  });

  it('does not page past the ends of the list', () => {
    render(<ListingImageCarousel images={IMAGES} />);

    // Already at the first image: a right swipe stays put.
    act(() => {
      swipe(120);
    });
    expect(screen.getByTestId('carousel-image')).toHaveAttribute(
      'src',
      '/media/v1/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa/card.webp',
    );
  });

  it('addresses the image at its content-hashed /media URL', () => {
    render(<ListingImageCarousel images={[{ contentHash: 'dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd' }]} />);

    expect(screen.getByTestId('carousel-image')).toHaveAttribute(
      'src',
      '/media/v1/dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd/card.webp',
    );
  });

  it('offers every variant in a srcset so the browser picks the smallest that fits', () => {
    // Without this the browser would always take the largest available file.
    render(<ListingImageCarousel images={[{ contentHash: 'dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd' }]} />);

    const image = screen.getByTestId('carousel-image');
    expect(image).toHaveAttribute(
      'srcset',
      [
        '/media/v1/dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd/thumb.webp 400w',
        '/media/v1/dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd/card.webp 828w',
        '/media/v1/dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd/full.webp 1280w',
      ].join(', '),
    );
    expect(image).toHaveAttribute('sizes');
  });

  it('sets intrinsic dimensions so the image reserves its space before loading', () => {
    render(
      <ListingImageCarousel
        images={[{ contentHash: 'dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd', width: 1621, height: 1080 }]}
      />,
    );

    const image = screen.getByTestId('carousel-image');
    expect(image).toHaveAttribute('width', '1621');
    expect(image).toHaveAttribute('height', '1080');
    expect(image).toHaveAttribute('decoding', 'async');
  });

  it('preloads only the adjacent images, so a swipe is not a cold fetch', () => {
    // Preloading the whole set would recreate the payload problem this change
    // removes, so only the reachable neighbours are warmed.
    const hashes = ['1', '2', '3', '4'].map((n) => n.repeat(64));
    render(
      <ListingImageCarousel images={hashes.map((contentHash) => ({ contentHash }))} />,
    );

    const preloaded = screen
      .getAllByTestId('carousel-preload')
      .map((node) => node.getAttribute('src'));

    // Showing image 0: only image 1 is one step away.
    expect(preloaded).toEqual([`/media/v1/${hashes[1]}/card.webp`]);
  });

  it('falls back to a generic alt when none is provided', () => {
    render(<ListingImageCarousel images={[{ contentHash: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' }]} />);

    expect(screen.getByTestId('carousel-image')).toHaveAttribute('alt', 'Listing image');
  });

  it('excludes images with missing data from the carousel', () => {
    const images: CarouselImage[] = [
      { contentHash: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', alt: 'Front' },
      { contentHash: '', alt: 'Broken' },
      { contentHash: 'cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc', alt: 'Garden' },
    ];
    render(<ListingImageCarousel images={images} />);

    expect(screen.getByTestId('carousel-dots').children).toHaveLength(2);
    expect(screen.getByTestId('carousel-status')).toHaveTextContent('Image 1 of 2');

    act(() => {
      swipe(-120);
    });

    // The second renderable image is the third source image (the empty one is skipped).
    expect(screen.getByTestId('carousel-image')).toHaveAttribute(
      'src',
      '/media/v1/cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc/card.webp',
    );
  });

  it('hides the paging dots when there is only one image', () => {
    render(<ListingImageCarousel images={[{ contentHash: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' }]} />);

    expect(screen.getByTestId('carousel-image')).toBeInTheDocument();
    expect(screen.queryByTestId('carousel-dots')).not.toBeInTheDocument();
  });

  it('shows a clean placeholder and no image when the list is empty', () => {
    render(<ListingImageCarousel images={[]} />);

    expect(screen.getByTestId('carousel-empty')).toBeInTheDocument();
    expect(screen.queryByTestId('carousel-image')).not.toBeInTheDocument();
    expect(screen.queryByTestId('carousel-dots')).not.toBeInTheDocument();
  });

  it('shows the placeholder when every image is missing data', () => {
    render(<ListingImageCarousel images={[{ contentHash: '' }, { contentHash: '' }]} />);

    expect(screen.getByTestId('carousel-empty')).toBeInTheDocument();
    expect(screen.queryByTestId('carousel-image')).not.toBeInTheDocument();
  });

  it('clamps the active image when the images prop shrinks', () => {
    const { rerender } = render(<ListingImageCarousel images={IMAGES} />);

    act(() => {
      swipe(-120);
    });
    act(() => {
      swipe(-120);
    });
    expect(screen.getByTestId('carousel-status')).toHaveTextContent('Image 3 of 3');

    rerender(<ListingImageCarousel images={[IMAGES[0]]} />);

    expect(screen.getByTestId('carousel-image')).toHaveAttribute(
      'src',
      '/media/v1/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa/card.webp',
    );
  });

  describe('with more images than the dot cap', () => {
    // 12 renderable images: above the 7-dot cap, so the row becomes a sliding
    // window of 7 dots flanked by previous/next arrows.
    const MANY_IMAGES: CarouselImage[] = Array.from({ length: 12 }, (_, index) => ({
      contentHash: `${String(index).padStart(2, '0')}${'e'.repeat(62)}`,
      alt: `Image ${index + 1}`,
    }));

    function visibleDotIndexes(): number[] {
      return Array.from(screen.getByTestId('carousel-dots').children).map((dot) =>
        Number(dot.getAttribute('data-testid')!.replace('carousel-dot-', '')),
      );
    }

    it('caps the dots at seven and adds previous/next arrows', () => {
      render(<ListingImageCarousel images={MANY_IMAGES} />);

      expect(screen.getByTestId('carousel-dots').children).toHaveLength(7);
      expect(screen.getByTestId('carousel-dots-previous')).toBeInTheDocument();
      expect(screen.getByTestId('carousel-dots-next')).toBeInTheDocument();
      expect(screen.getByTestId('carousel-status')).toHaveTextContent('Image 1 of 12');
    });

    it('shows no arrows when the images fit inside the cap', () => {
      render(<ListingImageCarousel images={MANY_IMAGES.slice(0, 7)} />);

      expect(screen.getByTestId('carousel-dots').children).toHaveLength(7);
      expect(screen.queryByTestId('carousel-dots-previous')).not.toBeInTheDocument();
      expect(screen.queryByTestId('carousel-dots-next')).not.toBeInTheDocument();
    });

    it('slides the dot window to keep the active image centred', () => {
      render(<ListingImageCarousel images={MANY_IMAGES} />);

      // At the start the window is pinned to the front of the list.
      expect(visibleDotIndexes()).toEqual([0, 1, 2, 3, 4, 5, 6]);

      act(() => {
        fireEvent.keyDown(screen.getByTestId('carousel-viewport'), { key: 'ArrowRight' });
      });
      act(() => {
        fireEvent.keyDown(screen.getByTestId('carousel-viewport'), { key: 'ArrowRight' });
      });
      act(() => {
        fireEvent.keyDown(screen.getByTestId('carousel-viewport'), { key: 'ArrowRight' });
      });
      act(() => {
        fireEvent.keyDown(screen.getByTestId('carousel-viewport'), { key: 'ArrowRight' });
      });

      // Image 5 (index 4) is now centred in the window.
      expect(visibleDotIndexes()).toEqual([1, 2, 3, 4, 5, 6, 7]);
      expect(screen.getByTestId('carousel-dot-4')).toHaveAttribute('aria-current', 'true');
    });

    it('pins the window to the end of the list on the last image', async () => {
      const user = userEvent.setup();
      render(<ListingImageCarousel images={MANY_IMAGES} />);

      // Walk to the last image via the next arrow.
      for (let step = 0; step < MANY_IMAGES.length - 1; step += 1) {
        await act(async () => {
          await user.click(screen.getByTestId('carousel-dots-next'));
        });
      }

      expect(screen.getByTestId('carousel-status')).toHaveTextContent('Image 12 of 12');
      expect(visibleDotIndexes()).toEqual([5, 6, 7, 8, 9, 10, 11]);
    });

    it('disables each arrow at its end of the list', async () => {
      const user = userEvent.setup();
      render(<ListingImageCarousel images={MANY_IMAGES} />);

      expect(screen.getByTestId('carousel-dots-previous')).toBeDisabled();
      expect(screen.getByTestId('carousel-dots-next')).toBeEnabled();

      await act(async () => {
        await user.click(screen.getByTestId('carousel-dots-next'));
      });

      expect(screen.getByTestId('carousel-dots-previous')).toBeEnabled();
      expect(screen.getByTestId('carousel-status')).toHaveTextContent('Image 2 of 12');
    });

    it('steps back one image with the previous arrow', async () => {
      const user = userEvent.setup();
      render(<ListingImageCarousel images={MANY_IMAGES} />);

      await act(async () => {
        await user.click(screen.getByTestId('carousel-dots-next'));
      });
      await act(async () => {
        await user.click(screen.getByTestId('carousel-dots-previous'));
      });

      expect(screen.getByTestId('carousel-status')).toHaveTextContent('Image 1 of 12');
      expect(screen.getByTestId('carousel-image')).toHaveAttribute(
        'src',
        `/media/v1/00${'e'.repeat(62)}/card.webp`,
      );
    });
  });

  it('keeps a stable aspect-ratio viewport with object-contain', () => {
    render(<ListingImageCarousel images={IMAGES} />);

    expect(screen.getByTestId('carousel-viewport')).toHaveClass('aspect-[4/3]');
    expect(screen.getByTestId('carousel-image')).toHaveClass('object-contain');
  });
});
