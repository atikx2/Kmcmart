import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // In local/sandbox dev the server cannot always reach images.pexels.com,
    // which breaks the Next.js image optimizer. Serving images unoptimized in
    // dev lets the browser fetch them directly. Production (Netlify) keeps the
    // optimizer enabled.
    unoptimized: process.env.NODE_ENV === "development",
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.pexels.com",
      },
    ],
  },
};

export default nextConfig;
