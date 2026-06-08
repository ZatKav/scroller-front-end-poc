import { render, screen } from '@testing-library/react';
import ListingDetailContent from '@/components/ListingDetailContent';
import type { ListingDetailView } from '@/lib/listing-detail-view';

function makeView(overrides: Partial<ListingDetailView> = {}): ListingDetailView {
  return {
    id: 1,
    title: 'Riverside Apartment',
    price: '£450,000',
    bedrooms: 2,
    bathrooms: 1,
    location: '1 River Way, RH1 1AA',
    description: 'Bright and modern apartment.',
    tags: ['New', 'Garden'],
    images: [{ image_data: 'AAAA', alt: 'Riverside Apartment' }],
    ...overrides,
  };
}

describe('ListingDetailContent', () => {
  it('renders every section for a fully-populated listing', () => {
    render(<ListingDetailContent view={makeView()} />);

    expect(
      screen.getByRole('heading', { name: 'Riverside Apartment' }),
    ).toBeTruthy();
    expect(screen.getByTestId('listing-price').textContent).toBe('£450,000');
    expect(screen.getByTestId('listing-stats').textContent).toContain('Bedrooms');
    expect(screen.getByTestId('listing-stats').textContent).toContain('Bathrooms');
    expect(screen.getByTestId('listing-location').textContent).toBe(
      '1 River Way, RH1 1AA',
    );
    expect(screen.getByTestId('listing-description').textContent).toContain(
      'Bright and modern apartment.',
    );
    expect(screen.getByTestId('listing-tags').textContent).toContain('New');
    expect(screen.getByTestId('listing-tags').textContent).toContain('Garden');
    expect(screen.getByTestId('carousel-image')).toBeTruthy();
  });

  it('hides sections that have no data instead of leaving empty chrome', () => {
    render(
      <ListingDetailContent
        view={makeView({ bathrooms: null, description: null })}
      />,
    );

    // Bedrooms remains, but the bathrooms stat and the description section are
    // gone entirely (no empty placeholder).
    expect(screen.getByTestId('listing-stats').textContent).toContain('Bedrooms');
    expect(screen.getByTestId('listing-stats').textContent).not.toContain(
      'Bathrooms',
    );
    expect(screen.queryByTestId('listing-description')).toBeNull();
  });

  it('omits the stats block when neither bedrooms nor bathrooms are present', () => {
    render(
      <ListingDetailContent view={makeView({ bedrooms: null, bathrooms: null })} />,
    );

    expect(screen.queryByTestId('listing-stats')).toBeNull();
  });

  it('omits the tags list when there are no tags', () => {
    render(<ListingDetailContent view={makeView({ tags: [] })} />);

    expect(screen.queryByTestId('listing-tags')).toBeNull();
  });

  it('shows the carousel empty state when there are no renderable images', () => {
    render(<ListingDetailContent view={makeView({ images: [] })} />);

    expect(screen.getByTestId('carousel-empty')).toBeTruthy();
    // The rest of the page still renders.
    expect(
      screen.getByRole('heading', { name: 'Riverside Apartment' }),
    ).toBeTruthy();
  });
});
