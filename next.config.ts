import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Keep Prisma/bcrypt out of the bundler so they run as plain Node modules.
  serverExternalPackages: ["@prisma/client", "@prisma/adapter-pg", "bcryptjs", "sharp"],
  // Allow a phone (LAN IP) to load dev resources / HMR while testing, e.g.
  // ALLOWED_DEV_ORIGIN=192.168.1.50 npm run dev
  allowedDevOrigins: process.env.ALLOWED_DEV_ORIGIN
    ? [process.env.ALLOWED_DEV_ORIGIN]
    : [],
  experimental: {
    // Allow Server Actions to receive uploaded EPUB files (default 1mb is too small).
    serverActions: {
      bodySizeLimit: "50mb",
    },
  },
};

export default nextConfig;
