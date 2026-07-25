import { render, screen } from '@testing-library/react';
import * as React from 'react';
import NotFound from './not-found';

describe('listing detail not-found state', () => {
  const ORIGINAL_BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH;

  afterEach(() => {
    if (ORIGINAL_BASE_PATH === undefined) {
      delete process.env.NEXT_PUBLIC_BASE_PATH;
    } else {
      process.env.NEXT_PUBLIC_BASE_PATH = ORIGINAL_BASE_PATH;
    }
    jest.dontMock('react');
    jest.resetModules();
  });

  it('renders not-found content and a feed link', () => {
    render(<NotFound />);

    expect(screen.getByRole('heading', { name: 'Listing not found' })).toBeTruthy();
    expect(screen.getByText(/Check the listing id/)).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Back to feed' }).getAttribute('href')).toBe(
      '/listings',
    );
  });

  it('keeps the feed href base-path-relative when NEXT_PUBLIC_BASE_PATH is configured', () => {
    process.env.NEXT_PUBLIC_BASE_PATH = '/scroller';
    jest.resetModules();
    jest.doMock('react', () => React);
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const BasePathNotFound = require('./not-found').default as typeof NotFound;

    render(<BasePathNotFound />);

    const link = screen.getByRole('link', { name: 'Back to feed' });
    expect(link.getAttribute('href')).toBe('/listings');
    expect(link.getAttribute('href')).not.toContain('/scroller/scroller');
  });
});
