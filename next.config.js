/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  eslint: {
    dirs: ['pages', 'components', 'lib'],
  },
  images: {
    domains: ['images.ygoprodeck.com', 'i.imgur.com', 'lh3.googleusercontent.com', 'gatherer.wizards.com', 'imgs.search.brave.com'],
  },
};

module.exports = nextConfig;
