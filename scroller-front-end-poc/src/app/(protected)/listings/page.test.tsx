import { render, screen } from '@testing-library/react';
import ListingsPage from './page';

jest.mock('@/components/ListingFlow', () => function MockListingFlow() {
  return <div>Listing flow</div>;
});

describe('listings flow page', () => {
  it('renders the listing flow component', () => {
    render(<ListingsPage />);

    expect(screen.getByText('Listing flow')).toBeTruthy();
  });
});
