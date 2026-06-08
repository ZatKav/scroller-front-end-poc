import { render, screen } from '@testing-library/react';
import ListingPage from './page';

const mockNotFound = jest.fn(() => {
  throw new Error('NEXT_NOT_FOUND');
});

jest.mock('next/navigation', () => ({
  notFound: () => mockNotFound(),
}));

describe('listing detail scaffold page', () => {
  beforeEach(() => {
    mockNotFound.mockClear();
  });

  it('renders the scaffold for a valid positive integer id', async () => {
    const result = await ListingPage({
      params: Promise.resolve({ id: '123' }),
    });

    render(result);

    expect(screen.getByRole('heading', { name: 'Listing #123' })).toBeTruthy();
    expect(
      screen.getByLabelText('Listing 123 image gallery placeholder'),
    ).toBeTruthy();
    expect(screen.getByLabelText('Listing facts placeholder')).toBeTruthy();
    expect(mockNotFound).not.toHaveBeenCalled();
  });

  it.each(['not-a-number', '0', '-1', '1.5'])(
    'renders the not-found state for malformed id %s',
    async (id) => {
      await expect(
        ListingPage({
          params: Promise.resolve({ id }),
        }),
      ).rejects.toThrow('NEXT_NOT_FOUND');

      expect(mockNotFound).toHaveBeenCalledTimes(1);
    },
  );
});
