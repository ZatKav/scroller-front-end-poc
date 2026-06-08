import { act, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ListingImageCarousel, { type CarouselImage } from './ListingImageCarousel';

const IMAGES: CarouselImage[] = [
  { image_data: 'AAAA', alt: 'Front of house' },
  { image_data: 'BBBB', alt: 'Kitchen' },
  { image_data: 'CCCC', alt: 'Garden' },
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
  it('renders the first image and a dot per image on mount', () => {
    render(<ListingImageCarousel images={IMAGES} />);

    const img = screen.getByTestId('carousel-image');
    expect(img).toHaveAttribute('src', 'data:image/jpeg;base64,AAAA');
    expect(img).toHaveAttribute('alt', 'Front of house');

    expect(screen.getByTestId('carousel-dots').children).toHaveLength(3);
    expect(screen.getByTestId('carousel-dot-0')).toHaveAttribute('aria-current', 'true');
    expect(screen.getByTestId('carousel-dot-1')).not.toHaveAttribute('aria-current');
    expect(screen.getByTestId('carousel-status')).toHaveTextContent('Image 1 of 3');
  });

  it('navigates to a chosen image when its paging dot is activated', async () => {
    const user = userEvent.setup();
    render(<ListingImageCarousel images={IMAGES} />);

    await user.click(screen.getByTestId('carousel-dot-2'));

    expect(screen.getByTestId('carousel-image')).toHaveAttribute(
      'src',
      'data:image/jpeg;base64,CCCC',
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
      'data:image/jpeg;base64,BBBB',
    );
  });

  it('returns to the previous image when swiped right', () => {
    render(<ListingImageCarousel images={IMAGES} />);

    act(() => {
      swipe(-120);
    });
    expect(screen.getByTestId('carousel-image')).toHaveAttribute(
      'src',
      'data:image/jpeg;base64,BBBB',
    );

    act(() => {
      swipe(120);
    });
    expect(screen.getByTestId('carousel-image')).toHaveAttribute(
      'src',
      'data:image/jpeg;base64,AAAA',
    );
  });

  it('ignores a short horizontal drag below the swipe threshold', () => {
    render(<ListingImageCarousel images={IMAGES} />);

    act(() => {
      swipe(20);
    });

    expect(screen.getByTestId('carousel-image')).toHaveAttribute(
      'src',
      'data:image/jpeg;base64,AAAA',
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
      'data:image/jpeg;base64,AAAA',
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
      'data:image/jpeg;base64,BBBB',
    );

    act(() => {
      fireEvent.keyDown(viewport, { key: 'ArrowLeft' });
    });
    expect(screen.getByTestId('carousel-image')).toHaveAttribute(
      'src',
      'data:image/jpeg;base64,AAAA',
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
      'data:image/jpeg;base64,AAAA',
    );
  });

  it('renders raw base64 image data as a data URI', () => {
    render(<ListingImageCarousel images={[{ image_data: 'ZZZZ' }]} />);

    expect(screen.getByTestId('carousel-image')).toHaveAttribute(
      'src',
      'data:image/jpeg;base64,ZZZZ',
    );
  });

  it('passes an already-prefixed data URI through unchanged', () => {
    render(
      <ListingImageCarousel images={[{ image_data: 'data:image/png;base64,CCCC' }]} />,
    );

    expect(screen.getByTestId('carousel-image')).toHaveAttribute(
      'src',
      'data:image/png;base64,CCCC',
    );
  });

  it('falls back to a generic alt when none is provided', () => {
    render(<ListingImageCarousel images={[{ image_data: 'AAAA' }]} />);

    expect(screen.getByTestId('carousel-image')).toHaveAttribute('alt', 'Listing image');
  });

  it('excludes images with missing data from the carousel', () => {
    const images: CarouselImage[] = [
      { image_data: 'AAAA', alt: 'Front' },
      { image_data: '', alt: 'Broken' },
      { image_data: 'CCCC', alt: 'Garden' },
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
      'data:image/jpeg;base64,CCCC',
    );
  });

  it('hides the paging dots when there is only one image', () => {
    render(<ListingImageCarousel images={[{ image_data: 'AAAA' }]} />);

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
    render(<ListingImageCarousel images={[{ image_data: '' }, { image_data: '' }]} />);

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
      'data:image/jpeg;base64,AAAA',
    );
  });

  it('keeps a stable aspect-ratio viewport with object-contain', () => {
    render(<ListingImageCarousel images={IMAGES} />);

    expect(screen.getByTestId('carousel-viewport')).toHaveClass('aspect-[4/3]');
    expect(screen.getByTestId('carousel-image')).toHaveClass('object-contain');
  });
});
