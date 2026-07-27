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
  webpack: (config, { isServer, nextRuntime }) => {
    if (isServer) {
      config.externals = [...(config.externals || []), 'google-auth-library', 'gaxios'];
    }
    config.resolve.fallback = { ...(config.resolve.fallback || {}), worker_threads: false };
    // instrumentation.ts é empacotado também pro runtime edge (por causa do middleware.ts) —
    // lib/marketIntel.ts e lib/obsidianSync.ts usam fs/path (Node-only, pro sync com
    // hermes/knowledge/ e Obsidian) só quando rodam de verdade em nodejs; sem isso, o build do
    // bundle edge quebra com "Module not found: Can't resolve 'fs'".
    if (nextRuntime === 'edge') {
      config.resolve.fallback = { ...(config.resolve.fallback || {}), fs: false, path: false };
    }
    return config;
  },
};

module.exports = nextConfig;
