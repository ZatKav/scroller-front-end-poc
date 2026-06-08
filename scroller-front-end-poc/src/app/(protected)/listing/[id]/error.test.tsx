import { fireEvent, render, screen } from '@testing-library/react';
import ErrorPage from './error';

describe('listing detail error state', () => {
  it('renders an error message and retries when requested', () => {
    const reset = jest.fn();

    render(<ErrorPage error={new Error('Render failed')} reset={reset} />);

    expect(
      screen.getByRole('heading', { name: 'Listing could not load' }),
    ).toBeTruthy();
    expect(screen.getByText('Render failed')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));

    expect(reset).toHaveBeenCalledTimes(1);
  });

  it('uses a base-path-safe feed link', () => {
    render(<ErrorPage error={new Error()} reset={jest.fn()} />);

    expect(screen.getByRole('link', { name: 'Back to feed' }).getAttribute('href')).toBe(
      '/',
    );
  });
});
