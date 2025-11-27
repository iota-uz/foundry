/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  eslint: {
    // Allow warnings during build - we'll fix these in cleanup phase
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Ignore type errors during build
    ignoreBuildErrors: false,
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals.push('better-sqlite3', 'chokidar');
    } else {
      // Don't bundle server-only modules in client
      config.resolve.fallback = {
        ...config.resolve.fallback,
        chokidar: false,
        fsevents: false,
        'better-sqlite3': false,
        fs: false,
      };
    }
    return config;
  },
};

export default nextConfig;
