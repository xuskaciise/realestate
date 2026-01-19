/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['localhost', 'utfs.io'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'utfs.io',
        pathname: '/**',
      },
    ],
  },
};

module.exports = nextConfig;
