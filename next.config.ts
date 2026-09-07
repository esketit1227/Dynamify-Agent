import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["playwright", "pg-boss", "pg"],
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
