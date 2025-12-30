import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  experimental: {
    serverActions: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: { unoptimized: true },
  transpilePackages: ['framer-motion'],
}

export default nextConfig;
