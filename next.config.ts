import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: { unoptimized: true },
  transpilePackages: ['framer-motion'],
  experimental: {
    serverComponentsExternalPackages: ['pino', 'pino-pretty'],
  },
}

export default nextConfig;
