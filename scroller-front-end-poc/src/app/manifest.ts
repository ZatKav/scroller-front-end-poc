import type { MetadataRoute } from 'next';
import { appPath } from '@/lib/base-path';

// Web app manifest (PRO-237). When the scroller is added to the home screen and
// launched from its icon, `display: "standalone"` runs it without the browser
// URL bar — in every orientation, on both iOS and Android. This is the only
// cross-platform way to reclaim the address-bar space: the Fullscreen API needs
// a user gesture and is unsupported for elements on iPhone Safari (PRO-235), so
// it was deliberately avoided. Plain in-browser visits are unaffected and keep
// the dvh sizing fallback from PRO-235.
//
// Base-path nuance: Next prefixes the manifest *route* and the injected
// `<link rel="manifest">` with NEXT_PUBLIC_BASE_PATH automatically, but it does
// NOT touch the fields inside this document. start_url, scope and every icon
// `src` are therefore prefixed manually via appPath() (the app is served under
// `/scroller`). A wrong start_url makes the installed app launch straight to a
// 404, so this mirrors the same helper used everywhere else for browser-visible
// URLs (src/lib/base-path.ts).
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Scroller',
    short_name: 'Scroller',
    description: 'Scroller front-end proof of concept',
    start_url: appPath('/'),
    scope: appPath('/'),
    display: 'standalone',
    background_color: '#eef2ff',
    theme_color: '#4f46e5',
    icons: [
      {
        src: appPath('/icons/icon-192.png'),
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: appPath('/icons/icon-512.png'),
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: appPath('/icons/icon-maskable-512.png'),
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  };
}
