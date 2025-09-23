// next.config.ts
import type { NextConfig } from "next";
import createNextPWA from "@ducanh2912/next-pwa";

const isDev = process.env.NODE_ENV !== "production";
const withPWA = createNextPWA({
  dest: "public",
  register: true,
  skipWaiting: true,
  disable: isDev,
});

const nextConfig: NextConfig = {};
export default withPWA(nextConfig);
