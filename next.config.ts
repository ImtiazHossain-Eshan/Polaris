import type { NextConfig } from "next";

const securityHeaders = [
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-DNS-Prefetch-Control", value: "on" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
  async redirects() {
    return [
      // The old dashboard now lives in the (app) shell at /roadmap. Keep a
      // 301 for one release so existing links/bookmarks keep working.
      { source: "/dashboard", destination: "/roadmap", statusCode: 301 },
      // The new Universities shell links to /universities/[id]; the existing
      // probability-engine detail page is at /university/[id]. Bridge them
      // until the in-shell detail view ships in the parity pass.
      { source: "/universities/:id", destination: "/university/:id", permanent: false },
    ];
  },
};

export default nextConfig;
