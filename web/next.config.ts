import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /** Activa URLs relativas /api/* → proxy hacia SCORECARD_API_ORIGIN (sin exponer la URL al cliente). */
  env: {
    NEXT_PUBLIC_SCORECARD_PROXY:
      process.env.SCORECARD_API_ORIGIN || process.env.NEXT_PUBLIC_SCORECARD_API_ORIGIN ? "1" : "",
  },
  async redirects() {
    return [
      { source: "/automatizaciones", destination: "/proyectos", permanent: false },
      { source: "/automatizaciones/:id", destination: "/proyectos/:id", permanent: false },
    ];
  },
};

export default nextConfig;
