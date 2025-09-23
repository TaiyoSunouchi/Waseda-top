/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // ✅ 本番ビルドで ESLint エラーで落ちないようにする
  eslint: {
    ignoreDuringBuilds: true,
  },

  // ✅ next/image をまだ使っていなくてもビルドが落ちないようにする
  images: {
    unoptimized: true,
  },
};
export default nextConfig;
