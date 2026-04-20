import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /** Oculta el icono “N” de desarrollo (esquina inferior). Los errores siguen mostrándose. */
  devIndicators: false,
  /** Activa URLs relativas /api/* → proxy hacia SCORECARD_API_ORIGIN (sin exponer la URL al cliente). */
  env: {
    NEXT_PUBLIC_SCORECARD_PROXY:
      process.env.SCORECARD_API_ORIGIN || process.env.NEXT_PUBLIC_SCORECARD_API_ORIGIN ? "1" : "",
  },
  async redirects() {
    return [
      /** Evita un round-trip extra por redirect() en app/page.tsx. */
      { source: "/", destination: "/panel", permanent: false },
      { source: "/automatizaciones", destination: "/workflows", permanent: false },
      { source: "/automatizaciones/:id", destination: "/workflows/:id", permanent: false },
    ];
  },
};

export default nextConfig;
