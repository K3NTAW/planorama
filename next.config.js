const isProd = process.env.NODE_ENV === 'production';
const withPWA = isProd
  ? require('next-pwa')({
      dest: 'public',
      register: true,
      skipWaiting: true,
    })
  : (config) => config;

const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
      },
      {
        protocol: "https",
        hostname: "img.clerk.com",
      },
    ],
  },
  /* config options here */
};

module.exports = withPWA(nextConfig); 