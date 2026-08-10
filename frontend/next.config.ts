import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow your phone to connect to the local server without blocking JavaScript
  // @ts-ignore
  allowedDevOrigins: ['192.168.1.103']
};

export default nextConfig;
