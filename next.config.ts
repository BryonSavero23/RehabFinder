import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  eslint: {
    // Warning: This disables ESLint during production builds
    ignoreDuringBuilds: true,
  },
  experimental: {
    turbo: {
      root: __dirname,
    },
  },
}

export default nextConfig