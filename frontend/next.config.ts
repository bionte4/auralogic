import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ['video.js'],
  // Docker runs `node server.js` from the traced standalone bundle.
  output: 'standalone',
};

export default nextConfig;
