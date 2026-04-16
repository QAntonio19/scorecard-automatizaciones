import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingRoot: path.join(__dirname, ".."),
  async redirects() {
    return [
      { source: "/automatizaciones", destination: "/proyectos", permanent: false },
      { source: "/automatizaciones/:id", destination: "/proyectos/:id", permanent: false },
    ];
  },
};

export default nextConfig;
