import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  // Internal tool: tell crawlers not to index anything, including non-HTML responses.
  async headers() {
    return [{ source: "/:path*", headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }] }];
  },
  // The agent context API reads these at request time, so they must ship with the function.
  outputFileTracingIncludes: {
    "/api/context": ["./backlog/**/*", "./memory/**/*", "./agents/**/*"],
  },
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
