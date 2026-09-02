import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* Performance & image optimization */
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**.supabase.co" },
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
    ],
  },
  /* Allow builds even when Supabase env vars are placeholder */
  typescript: {
    ignoreBuildErrors: false,
  },
};

export default nextConfig;
