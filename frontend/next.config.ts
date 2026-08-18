import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow your phone to connect to the local server without blocking JavaScript
  // @ts-ignore
  allowedDevOrigins: ['192.168.1.105', '192.168.1.105:3000', '192.168.1.*', 'localhost:3000', 'localhost']
};

export default nextConfig;
