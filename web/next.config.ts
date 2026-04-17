import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      { source: "/automatizaciones", destination: "/proyectos", permanent: false },
      { source: "/automatizaciones/:id", destination: "/proyectos/:id", permanent: false },
    ];
  },
};

export default nextConfig;
