const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';

const nextConfig = {
  // Produce a standalone build to keep the runtime container small
  output: 'standalone',
  ...(basePath ? { basePath } : {}),
};

export default nextConfig;
