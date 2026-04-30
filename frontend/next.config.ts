import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  // instrumentation.ts is loaded automatically in Next.js 15+
};

export default nextConfig;
