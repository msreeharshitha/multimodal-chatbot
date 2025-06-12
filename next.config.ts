import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: '/',
        destination: '/chat',
        permanent: false, // set to true if you want it cached forever
      },
    ];
  },
};

export default nextConfig;
