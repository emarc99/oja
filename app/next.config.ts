import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    // Anchor's browser bundle references fs in a Node-only code path.
    resolveAlias: { fs: { browser: "./lib/empty.ts" } },
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
