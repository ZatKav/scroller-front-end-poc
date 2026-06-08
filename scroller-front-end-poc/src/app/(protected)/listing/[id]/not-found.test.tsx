import { render, screen } from '@testing-library/react';
import NotFound from './not-found';

describe('listing detail not-found state', () => {
  it('renders not-found content and a feed link', () => {
    render(<NotFound />);

    expect(screen.getByRole('heading', { name: 'Listing not found' })).toBeTruthy();
    expect(screen.getByText(/Check the listing id/)).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Back to feed' }).getAttribute('href')).toBe(
      '/',
    );
  });
});
