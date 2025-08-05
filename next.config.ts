/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
  // Configure webpack to handle Node.js dependencies properly
  webpack: (config: any, { dev, isServer }: { dev: boolean; isServer: boolean }) => {
    // Suppress Edge Runtime warnings for Node.js dependencies in production builds
    if (!dev) {
      config.ignoreWarnings = [
        // Suppress warnings about Node.js APIs being used in server-side code
        { message: /A Node\.js API is used/ },
        { message: /A Node\.js module is loaded/ },
        { message: /process\.nextTick/ },
        { message: /setImmediate/ },
        { message: /process\.version/ },
        { message: /crypto/ },
      ];
    }
    return config;
  },
  async headers() {
    return [
      {
        source: "/api/:path*",
        headers: [
          {
            key: "Connection",
            value: "keep-alive",
          },
          {
            key: "Keep-Alive",
            value: "timeout=60",
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
