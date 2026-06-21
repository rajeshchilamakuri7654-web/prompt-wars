import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'export',
  basePath: '/prompt-wars',
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
