import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: { unoptimized: true },
  transpilePackages: ['framer-motion'],
}

export default nextConfig;
