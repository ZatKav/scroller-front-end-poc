const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';

const nextConfig = {
  // Produce a standalone build to keep the runtime container small
  output: 'standalone',
  // Hide the dev-mode overlay/badge. It sits bottom-left, over the bottom nav
  // and the feed controls, which gets in the way when checking the mobile
  // layout locally and in ngrok-shared dev builds.
  devIndicators: false,
  ...(basePath ? { basePath } : {}),
};

export default nextConfig;
