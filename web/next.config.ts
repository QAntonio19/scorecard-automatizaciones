import path from "node:path";
import type { NextConfig } from "next";

/**
 * `outputFileTracingRoot` al padre del monorepo rompe el paso "Collecting build traces"
 * en el builder de Vercel (VERCEL=1). Solo aplica en local con workspaces.
 */
const nextConfig: NextConfig = {
  ...(!process.env.VERCEL && {
    outputFileTracingRoot: path.join(__dirname, ".."),
  }),
  async redirects() {
    return [
      { source: "/automatizaciones", destination: "/proyectos", permanent: false },
      { source: "/automatizaciones/:id", destination: "/proyectos/:id", permanent: false },
    ];
  },
};

export default nextConfig;
