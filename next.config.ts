/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: { serverActions: { bodySizeLimit: '4mb' } },
  transpilePackages: ['react-hot-toast'],
  webpack: (config, { isServer }) => {
    // Fix for react-hot-toast module resolution in Next.js 15
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
      };
    }
    // Ensure react-hot-toast is properly resolved
    config.resolve.alias = {
      ...config.resolve.alias,
    };
    return config;
  },
};
export default nextConfig;
