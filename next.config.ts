import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    // Permetti la build anche se ci sono errori di tipi
    ignoreBuildErrors: true,
  },
  eslint: {
    // Non bloccare la build per warning/errori ESLint
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
