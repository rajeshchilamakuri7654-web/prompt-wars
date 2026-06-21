import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'export',
  basePath: '/prompt-wars',
  env: {
    NEXT_PUBLIC_BASE_PATH: '/prompt-wars',
  },
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
