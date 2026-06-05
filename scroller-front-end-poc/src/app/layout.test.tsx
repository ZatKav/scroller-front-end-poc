import { metadata, viewport } from '@/app/layout';

/**
 * Root layout PWA metadata (PRO-237). iOS launches a home-screen app without the
 * Safari URL bar only when these Apple web-app tags are present (the web manifest
 * alone is not enough on iOS); viewport-fit cover then lets the standalone app
 * fill the screen so the landscape image is not letterboxed.
 */
describe('root layout PWA metadata', () => {
  it('declares the app as an iOS web app capable of running standalone', () => {
    expect(metadata.appleWebApp).toMatchObject({
      capable: true,
      statusBarStyle: 'black-translucent',
      title: 'Scroller',
    });
    // iOS < 16.4 only honours the legacy apple-prefixed capable tag, which Next
    // no longer emits for appleWebApp.capable, so it is added via `other`.
    expect(metadata.other).toMatchObject({ 'apple-mobile-web-app-capable': 'yes' });
  });

  it('provides an apple-touch-icon for the home screen', () => {
    expect(JSON.stringify(metadata)).toContain('/icons/apple-touch-icon.png');
  });

  it('uses viewport-fit cover and a theme colour matching the manifest', () => {
    expect(viewport.viewportFit).toBe('cover');
    expect(viewport.themeColor).toBe('#4f46e5');
  });
});
