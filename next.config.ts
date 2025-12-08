import type { NextConfig } from "next";
const withPWA = require("@ducanh2912/next-pwa").default({
  dest: "public",
  cacheOnFrontEndNav: true,
  aggressiveFrontEndNavCaching: true,
  reloadOnOnline: true,
  swcMinify: true,
  disable: process.env.NODE_ENV === "development",
  workboxOptions: {
    disableDevLogs: true,
  },
});

const nextConfig: NextConfig = {
  /* config options here */
  images: {
    domains: ['localhost'],
  },
  // Add empty turbopack config to silence the warning
  // Most apps work fine with default Turbopack settings
  turbopack: {},
  reactCompiler: true,
};

export default withPWA(nextConfig);
