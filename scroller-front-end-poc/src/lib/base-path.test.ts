/**
 * The base-path helper is the root of the PRO-225 login bug: the deployed app
 * runs under `NEXT_PUBLIC_BASE_PATH=/scroller`, and any path that is
 * double-prefixed produces the broken `/scroller/scroller/...` URLs.
 */
describe('base-path helper', () => {
  const ORIGINAL_BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH;

  afterEach(() => {
    if (ORIGINAL_BASE_PATH === undefined) {
      delete process.env.NEXT_PUBLIC_BASE_PATH;
    } else {
      process.env.NEXT_PUBLIC_BASE_PATH = ORIGINAL_BASE_PATH;
    }
    jest.resetModules();
  });

  function loadWithBasePath(value: string | undefined) {
    jest.resetModules();
    if (value === undefined) {
      delete process.env.NEXT_PUBLIC_BASE_PATH;
    } else {
      process.env.NEXT_PUBLIC_BASE_PATH = value;
    }
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    return require('./base-path') as typeof import('./base-path');
  }

  describe('without a base path', () => {
    it('returns paths unchanged', () => {
      const { appPath, authCookiePath, APP_BASE_PATH } = loadWithBasePath(undefined);
      expect(APP_BASE_PATH).toBe('');
      expect(appPath('/login')).toBe('/login');
      expect(appPath('/api/auth/me')).toBe('/api/auth/me');
      expect(authCookiePath()).toBe('/');
    });

    it('treats "/" base path as empty', () => {
      const { appPath, APP_BASE_PATH } = loadWithBasePath('/');
      expect(APP_BASE_PATH).toBe('');
      expect(appPath('/login')).toBe('/login');
    });
  });

  describe('with a "/scroller" base path', () => {
    it('prefixes the base path exactly once', () => {
      const { appPath, APP_BASE_PATH } = loadWithBasePath('/scroller');
      expect(APP_BASE_PATH).toBe('/scroller');
      expect(appPath('/login')).toBe('/scroller/login');
      expect(appPath('/api/scroller-customer-interactions-db')).toBe(
        '/scroller/api/scroller-customer-interactions-db',
      );
    });

    it('never produces a duplicated base path', () => {
      const { appPath } = loadWithBasePath('/scroller');
      expect(appPath('/login')).not.toContain('/scroller/scroller');
    });

    it('maps the root path to the bare base path', () => {
      const { appPath } = loadWithBasePath('/scroller');
      expect(appPath('/')).toBe('/scroller');
    });

    it('scopes the auth cookie to the base path', () => {
      const { authCookiePath } = loadWithBasePath('/scroller');
      expect(authCookiePath()).toBe('/scroller');
    });

    it('normalizes a trailing slash and a missing leading slash', () => {
      const { appPath } = loadWithBasePath('scroller/');
      expect(appPath('/login')).toBe('/scroller/login');
    });
  });
});
