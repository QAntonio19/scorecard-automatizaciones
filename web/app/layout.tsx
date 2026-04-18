import type { Metadata } from "next";
import "./globals.css";

/** Sin next/font/google: evita fallos de build en Vercel (red/CI). Tipografías en @theme (globals.css). */

export const metadata: Metadata = {
  title: "ExpertizITAI | Workflows ITAI",
  description: "Portafolio de automatizaciones y Dev Framework ITAI",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es-MX">
      <body>{children}</body>
    </html>
  );
}
