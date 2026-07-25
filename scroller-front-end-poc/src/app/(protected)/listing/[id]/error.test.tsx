import { fireEvent, render, screen } from '@testing-library/react';
import * as React from 'react';
import ErrorPage from './error';

describe('listing detail error state', () => {
  const ORIGINAL_BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH;
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
    if (ORIGINAL_BASE_PATH === undefined) {
      delete process.env.NEXT_PUBLIC_BASE_PATH;
    } else {
      process.env.NEXT_PUBLIC_BASE_PATH = ORIGINAL_BASE_PATH;
    }
    jest.dontMock('react');
    jest.resetModules();
  });

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
      '/listings',
    );
  });

  it('logs the error for observability', () => {
    const error = new Error('Render failed');

    render(<ErrorPage error={error} reset={jest.fn()} />);

    expect(consoleErrorSpy).toHaveBeenCalledWith(error);
  });

  it('keeps the feed href base-path-relative when NEXT_PUBLIC_BASE_PATH is configured', () => {
    process.env.NEXT_PUBLIC_BASE_PATH = '/scroller';
    jest.resetModules();
    jest.doMock('react', () => React);
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const BasePathErrorPage = require('./error').default as typeof ErrorPage;

    render(<BasePathErrorPage error={new Error()} reset={jest.fn()} />);

    const link = screen.getByRole('link', { name: 'Back to feed' });
    expect(link.getAttribute('href')).toBe('/listings');
    expect(link.getAttribute('href')).not.toContain('/scroller/scroller');
  });
});
