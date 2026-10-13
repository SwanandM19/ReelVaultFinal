import type { NextConfig } from "next";

// The admin area is private: never cached, never indexed, never framed, and it leaks no referrer.
const privateHeaders = [
  { key: "Cache-Control", value: "no-store, max-age=0" },
  { key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" },
  { key: "X-Frame-Options", value: "DENY" },
  // "same-origin" (not "no-referrer"): other sites still learn nothing, but same-site form posts keep a usable Origin.
  { key: "Referrer-Policy", value: "same-origin" },
  { key: "X-Content-Type-Options", value: "nosniff" },
];

const nextConfig: NextConfig = {
  async headers() {
    return [{ source: "/admin/:path*", headers: privateHeaders }, { source: "/admin", headers: privateHeaders }];
  },
};

export default nextConfig;
