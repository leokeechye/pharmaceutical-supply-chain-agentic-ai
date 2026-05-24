import type { NextConfig } from "next";

// NOTE: API proxying is handled at RUNTIME by the catch-all route handler in
// src/app/api/[...path]/route.ts (reads BACKEND_URL per-request). We deliberately
// do NOT use next.config rewrites for this, because Next bakes rewrite
// destinations at build time, so a runtime-only BACKEND_URL would never apply.
const nextConfig: NextConfig = {
  output: "standalone",
};

export default nextConfig;
