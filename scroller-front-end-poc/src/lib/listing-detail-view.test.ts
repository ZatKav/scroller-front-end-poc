import {
  deriveTags,
  formatLocation,
  formatPrice,
  isNew,
  mapListingToView,
  NEW_TAG_WINDOW_DAYS,
  toCarouselImages,
} from '@/lib/listing-detail-view';
import type { ListingDetail, ListingDetailImage } from '@/types/enrichment-db';

const NOW = new Date('2026-06-08T12:00:00.000Z');

function daysAgo(days: number): string {
  return new Date(NOW.getTime() - days * 24 * 60 * 60 * 1000).toISOString();
}

describe('formatPrice', () => {
  it('formats a whole number as GBP with thousands separators and no decimals', () => {
    expect(formatPrice(450000)).toBe('£450,000');
  });

  it('rounds fractional values and groups thousands', () => {
    expect(formatPrice(1234567.89)).toBe('£1,234,568');
  });

  it('formats values below 1000 without a separator', () => {
    expect(formatPrice(999)).toBe('£999');
  });

  it.each([null, undefined, NaN, Infinity])(
    'returns null for the non-renderable price %p',
    (value) => {
      expect(formatPrice(value as number | null | undefined)).toBeNull();
    },
  );
});

describe('isNew', () => {
  it('is true when first_seen is within the window', () => {
    expect(isNew(daysAgo(NEW_TAG_WINDOW_DAYS - 1), NOW)).toBe(true);
  });

  it('is true exactly on the window boundary', () => {
    expect(isNew(daysAgo(NEW_TAG_WINDOW_DAYS), NOW)).toBe(true);
  });

  it('is false once first_seen is older than the window', () => {
    expect(isNew(daysAgo(NEW_TAG_WINDOW_DAYS + 1), NOW)).toBe(false);
  });

  it.each([null, undefined, '', 'not-a-date'])(
    'is false for the unusable timestamp %p',
    (value) => {
      expect(isNew(value as string | null | undefined, NOW)).toBe(false);
    },
  );
});

describe('deriveTags', () => {
  it('returns New for a recent listing', () => {
    expect(deriveTags(null, daysAgo(1), NOW)).toEqual(['New']);
  });

  it('returns Garden when property_tags mentions a garden (case-insensitive)', () => {
    expect(deriveTags('Patio, GARDEN, Parking', daysAgo(100), NOW)).toEqual([
      'Garden',
    ]);
  });

  it('returns both New and Garden when applicable', () => {
    expect(deriveTags('private garden', daysAgo(2), NOW)).toEqual([
      'New',
      'Garden',
    ]);
  });

  it('returns no tags for an old listing without a garden', () => {
    expect(deriveTags('Parking, Balcony', daysAgo(100), NOW)).toEqual([]);
  });
});

describe('formatLocation', () => {
  it('joins the populated address parts in order, skipping blanks', () => {
    expect(
      formatLocation({
        address_line_1: '12 High Street',
        address_line_2: '  ',
        county: 'Surrey',
        postcode: 'RH1 1AA',
      }),
    ).toBe('12 High Street, Surrey, RH1 1AA');
  });

  it('returns null when there is no address', () => {
    expect(formatLocation(null)).toBeNull();
  });

  it('returns null when every part is blank', () => {
    expect(formatLocation({ address_line_1: '', county: '   ' })).toBeNull();
  });
});

describe('toCarouselImages', () => {
  function image(overrides: Partial<ListingDetailImage>): ListingDetailImage {
    return { id: 1, image_data: 'AAAA', ...overrides };
  }

  it('orders the primary image first then by ascending position', () => {
    const images = [
      image({ id: 1, position: 2, is_primary: false, image_data: 'pos2' }),
      image({ id: 2, position: 0, is_primary: true, image_data: 'primary' }),
      image({ id: 3, position: 1, is_primary: false, image_data: 'pos1' }),
    ];

    expect(toCarouselImages(images, 'Flat').map((i) => i.image_data)).toEqual([
      'primary',
      'pos1',
      'pos2',
    ]);
  });

  it('drops images with no bytes', () => {
    const images = [
      image({ id: 1, image_data: null }),
      image({ id: 2, image_data: 'bytes' }),
    ];

    expect(toCarouselImages(images, null)).toEqual([
      { image_data: 'bytes', alt: undefined },
    ]);
  });

  it('uses alt_text when present and falls back to the title', () => {
    const images = [
      image({ id: 1, alt_text: 'Kitchen', image_data: 'a' }),
      image({ id: 2, alt_text: null, image_data: 'b' }),
    ];

    expect(toCarouselImages(images, 'Riverside Flat')).toEqual([
      { image_data: 'a', alt: 'Kitchen' },
      { image_data: 'b', alt: 'Riverside Flat' },
    ]);
  });

  it('returns an empty array when images is missing', () => {
    expect(toCarouselImages(undefined, 'Flat')).toEqual([]);
  });
});

describe('mapListingToView', () => {
  const fullListing: ListingDetail = {
    id: 42,
    title: 'Riverside Apartment',
    short_description: 'Bright and modern apartment.',
    price: 450000,
    bedrooms: 2,
    bathrooms: 1,
    property_tags: 'Garden, Modern',
    first_seen: daysAgo(1),
    location: { address: { address_line_1: '1 River Way', postcode: 'RH1 1AA' } },
    images: [
      { id: 1, image_data: 'bytes', is_primary: true, position: 0 },
    ],
  };

  it('maps a fully-populated listing to display values', () => {
    const view = mapListingToView(fullListing, NOW);

    expect(view).toEqual({
      id: 42,
      title: 'Riverside Apartment',
      price: '£450,000',
      bedrooms: 2,
      bathrooms: 1,
      location: '1 River Way, RH1 1AA',
      description: 'Bright and modern apartment.',
      tags: ['New', 'Garden'],
      images: [{ image_data: 'bytes', alt: 'Riverside Apartment' }],
    });
  });

  it('collapses missing fields to null/empty so the page can hide them', () => {
    const view = mapListingToView({ id: 7, first_seen: daysAgo(100) }, NOW);

    expect(view).toEqual({
      id: 7,
      title: null,
      price: null,
      bedrooms: null,
      bathrooms: null,
      location: null,
      description: null,
      tags: [],
      images: [],
    });
  });
});
