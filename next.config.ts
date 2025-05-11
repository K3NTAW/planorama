// Vercel supports next.config.ts natively. No need for next.config.js unless you have a custom build setup.
import type { NextConfig } from "next";
import withPWA from "next-pwa";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
    ],
  },
  /* config options here */
  pwa: {
    dest: "public",
    register: true,
    skipWaiting: true,
  },
};

export default withPWA(nextConfig);
