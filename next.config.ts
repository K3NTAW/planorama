// Vercel supports next.config.ts natively. No need for next.config.js unless you have a custom build setup.
const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
});

const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
    ],
  },
  /* config options here */
};

module.exports = withPWA(nextConfig);
