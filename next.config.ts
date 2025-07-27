import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ['socket.io'],
  
  // Enable standalone output for Docker
  output: 'standalone',
  
  // Skip linting and type checking for faster builds
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  
  // Compress responses
  compress: true,
  
  // Production optimizations
  poweredByHeader: false,
  
  // Headers for WebRTC
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
        ],
      },
    ];
  },
  
  webpack: (config) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
    };
    return config;
  },
};

export default nextConfig;
