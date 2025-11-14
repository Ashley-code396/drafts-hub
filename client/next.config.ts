import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Ensure the correct root when multiple lockfiles exist in parent folders
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;
