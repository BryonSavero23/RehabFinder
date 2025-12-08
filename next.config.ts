import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Disable ESLint during build to allow deployment
  // eslint: {
  //   ignoreDuringBuilds: true,
  // },
  // Update turbo config as suggested by the warning
  turbopack: {
    root: __dirname,
  },
}

export default nextConfig