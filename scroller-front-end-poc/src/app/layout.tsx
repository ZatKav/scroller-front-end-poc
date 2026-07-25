import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";
import { PreferencesProvider } from "@/contexts/PreferencesContext";
import { appPath } from "@/lib/base-path";

export const metadata: Metadata = {
    title: "Scroller",
    description: "Scroller front-end proof of concept",
    // iOS reads these Apple-specific tags (not only the web manifest) to launch
    // the home-screen app without the Safari URL bar. `capable: true` marks the
    // app installable (see the capable-tag note on `other` below); the
    // translucent status bar lets the image use the full height; and
    // apple-touch-icon supplies the home-screen icon. The icon URL is
    // base-path-prefixed via appPath() because metadata URLs are not
    // auto-prefixed (PRO-237).
    appleWebApp: {
        capable: true,
        statusBarStyle: "black-translucent",
        title: "Scroller",
    },
    icons: {
        apple: [
            { url: appPath("/icons/apple-touch-icon.png"), sizes: "180x180", type: "image/png" },
        ],
    },
    // Next 15 renders `appleWebApp.capable: true` as the standardised
    // <meta name="mobile-web-app-capable">. iOS < 16.4 only honours the legacy
    // apple-prefixed tag for launching a home-screen app standalone (no URL bar),
    // so emit it explicitly too; on iOS 16.4+ the manifest's display:standalone
    // already covers it (PRO-237).
    other: {
        "apple-mobile-web-app-capable": "yes",
    },
};

// Dedicated viewport export (Next 15). viewport-fit=cover lets the installed
// standalone app draw edge-to-edge under the notch/home indicator so the
// landscape image is not letterboxed; the safe-area insets are then reclaimed by
// padding on <main> (see (protected)/page.tsx). themeColor matches the manifest
// so the OS chrome blends with the app (PRO-237).
export const viewport: Viewport = {
    themeColor: "#4f46e5",
    viewportFit: "cover",
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en">
            <body className="font-sans antialiased">
                <AuthProvider>
                    <PreferencesProvider>
                        {children}
                    </PreferencesProvider>
                </AuthProvider>
            </body>
        </html>
    );
}
