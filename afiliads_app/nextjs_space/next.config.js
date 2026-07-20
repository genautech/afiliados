const path = require('path');

/** @type {import('next').NextConfig} */
const nextConfig = {
  distDir: process.env.NEXT_DIST_DIR || '.next',
  output: process.env.NEXT_OUTPUT_MODE,
  poweredByHeader: false,
  productionBrowserSourceMaps: false,
  experimental: {
    outputFileTracingRoot: path.join(__dirname, '../'),
    instrumentationHook: true,
    serverComponentsExternalPackages: ['google-auth-library', 'gaxios', 'agent-base', 'https-proxy-agent'],
  },
  serverExternalPackages: ['google-auth-library', 'gaxios', 'agent-base', 'https-proxy-agent'],
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  images: { unoptimized: true },
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals = [...(config.externals || []), 'google-auth-library', 'gaxios'];
    }
    config.resolve.fallback = { ...(config.resolve.fallback || {}), worker_threads: false };
    return config;
  },
};

module.exports = nextConfig;
