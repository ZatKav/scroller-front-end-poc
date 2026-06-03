import type { ReactElement } from 'react';

const mockCookieGet = jest.fn();
const mockRedirect = jest.fn((url: string) => {
  // Mirror Next's real `redirect`, which throws to halt rendering.
  throw new Error(`NEXT_REDIRECT:${url}`);
});
const mockVerifyToken = jest.fn();

jest.mock('next/headers', () => ({
  cookies: jest.fn(async () => ({ get: mockCookieGet })),
}));

jest.mock('next/navigation', () => ({
  redirect: (url: string) => mockRedirect(url),
}));

jest.mock('@/lib/auth', () => ({
  verifyToken: (token: string) => mockVerifyToken(token),
}));

jest.mock('@/components/ProtectedRoute', () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="protected-route">{children}</div>
  ),
}));

import ProtectedLayout from './layout';

describe('ProtectedLayout', () => {
  beforeEach(() => {
    mockCookieGet.mockReset();
    mockRedirect.mockClear();
    mockVerifyToken.mockReset();
  });

  it('redirects to the bare /login route when there is no auth token', async () => {
    mockCookieGet.mockReturnValue(undefined);

    await expect(
      ProtectedLayout({ children: <span>child</span> }),
    ).rejects.toThrow('NEXT_REDIRECT:/login');

    // Must NOT pass appPath('/login'); the server redirect re-applies the base
    // path itself, so anything other than '/login' produces /scroller/scroller/login.
    expect(mockRedirect).toHaveBeenCalledWith('/login');
    expect(mockVerifyToken).not.toHaveBeenCalled();
  });

  it('redirects to the bare /login route when the token is invalid', async () => {
    mockCookieGet.mockReturnValue({ value: 'bad-token' });
    mockVerifyToken.mockReturnValue(null);

    await expect(
      ProtectedLayout({ children: <span>child</span> }),
    ).rejects.toThrow('NEXT_REDIRECT:/login');

    expect(mockVerifyToken).toHaveBeenCalledWith('bad-token');
    expect(mockRedirect).toHaveBeenCalledWith('/login');
  });

  it('renders the protected children when the token is valid', async () => {
    mockCookieGet.mockReturnValue({ value: 'good-token' });
    mockVerifyToken.mockReturnValue({ id: 1, username: 'phil', email: 'phil@finder.co.uk', role: 'admin' });

    const result = (await ProtectedLayout({ children: <span>child</span> })) as ReactElement;

    expect(mockRedirect).not.toHaveBeenCalled();
    expect(result).toBeTruthy();
  });
});
