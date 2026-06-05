/**
 * Web app manifest (PRO-237). Installing the scroller to the home screen and
 * launching it in `display: "standalone"` is the only cross-platform way to drop
 * the browser URL bar — including on iPhone Safari, where the Fullscreen API is
 * unavailable for elements. The manifest must also survive the `/scroller` base
 * path: start_url, scope and every icon `src` are hand-prefixed because Next does
 * not rewrite the fields inside the manifest body (only the route + the injected
 * <link rel="manifest">). These tests mirror the resetModules pattern in
 * base-path.test.ts so the module-level APP_BASE_PATH is recomputed per case.
 */
describe('web app manifest', () => {
  const ORIGINAL_BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH;

  afterEach(() => {
    if (ORIGINAL_BASE_PATH === undefined) {
      delete process.env.NEXT_PUBLIC_BASE_PATH;
    } else {
      process.env.NEXT_PUBLIC_BASE_PATH = ORIGINAL_BASE_PATH;
    }
    jest.resetModules();
  });

  function loadManifest(basePath: string | undefined) {
    jest.resetModules();
    if (basePath === undefined) {
      delete process.env.NEXT_PUBLIC_BASE_PATH;
    } else {
      process.env.NEXT_PUBLIC_BASE_PATH = basePath;
    }
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    return (require('./manifest') as typeof import('./manifest')).default();
  }

  it('runs standalone so the launched app has no browser URL bar', () => {
    expect(loadManifest(undefined).display).toBe('standalone');
  });

  it('ships installable icons including a maskable one', () => {
    const { icons } = loadManifest(undefined);
    const sizes = icons?.map((icon) => icon.sizes);
    expect(sizes).toEqual(expect.arrayContaining(['192x192', '512x512']));
    expect(icons?.some((icon) => icon.purpose === 'maskable')).toBe(true);
  });

  describe('without a base path', () => {
    it('points start_url, scope and icons at the root', () => {
      const manifest = loadManifest(undefined);
      expect(manifest.start_url).toBe('/');
      expect(manifest.scope).toBe('/');
      expect(manifest.icons?.[0]?.src).toBe('/icons/icon-192.png');
    });
  });

  describe('under the /scroller base path', () => {
    it('prefixes start_url, scope and icon src exactly once', () => {
      const manifest = loadManifest('/scroller');
      expect(manifest.start_url).toBe('/scroller');
      expect(manifest.scope).toBe('/scroller');
      expect(manifest.icons?.length).toBeGreaterThan(0);
      manifest.icons?.forEach((icon) => {
        expect(icon.src.startsWith('/scroller/icons/')).toBe(true);
        expect(icon.src).not.toContain('/scroller/scroller');
      });
    });
  });
});
