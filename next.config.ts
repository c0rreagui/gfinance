import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    // Allow production builds to complete successfully even if the project has type errors
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
