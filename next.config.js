/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [{ source: "/", destination: "/portal" }];
  }
};

module.exports = nextConfig;
