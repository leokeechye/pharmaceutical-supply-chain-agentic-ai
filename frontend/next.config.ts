import type { NextConfig } from "next";

// Backend base URL. Defaults to the local FastAPI port for `npm run dev`.
// In production (Railway), set BACKEND_URL to the backend service's URL, e.g.
//   https://<backend>.up.railway.app   or   http://<backend>.railway.internal:1020
// The standalone server reads this at startup, so changing it needs a restart/redeploy.
const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:1020";

const nextConfig: NextConfig = {
  output: "standalone",
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${BACKEND_URL}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
