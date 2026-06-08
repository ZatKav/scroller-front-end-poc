import { render, screen } from '@testing-library/react';
import Loading from './loading';

describe('listing detail loading state', () => {
  it('renders the loading fallback', () => {
    render(<Loading />);

    expect(screen.getByLabelText('Loading listing detail')).toBeTruthy();
    expect(screen.getByText('Loading listing...')).toBeTruthy();
  });
});
