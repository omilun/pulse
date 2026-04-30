import type { NextConfig } from "next";

const authUrl = process.env.AUTH_URL ?? "http://localhost:8081";
const longtermUrl = process.env.LONGTERM_URL ?? "http://localhost:8082";
const dailyUrl = process.env.DAILY_URL ?? "http://localhost:8083";

const nextConfig: NextConfig = {
  output: "standalone",
  async rewrites() {
    return [
      { source: "/auth/:path*",      destination: `${authUrl}/auth/:path*` },
      { source: "/api/lt/:path*",    destination: `${longtermUrl}/api/lt/:path*` },
      { source: "/api/daily/:path*", destination: `${dailyUrl}/api/daily/:path*` },
    ];
  },
};

export default nextConfig;
