import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Hide Next's dev-only corner badge ("Cache disabled", "Rendering"...). Errors still show in dev.
  devIndicators: false,
  cacheComponents: true,
  partialPrefetching: true,
  reactCompiler: true,
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
