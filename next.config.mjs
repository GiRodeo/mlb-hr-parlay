/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // All third-party data is fetched server-side via /app/api routes.
  // No client-side network access to MLB/Savant/FanGraphs/Open-Meteo.
  experimental: {
    serverActions: { bodySizeLimit: "2mb" },
  },
  logging: { fetches: { fullUrl: false } },
};

export default nextConfig;
