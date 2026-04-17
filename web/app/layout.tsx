import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

/** Inter + JetBrains Mono: más estables en builds CI que Geist (evita fallos en next/font en Vercel). */
const fontSans = Inter({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const fontMono = JetBrains_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "ExpertizITAI | Proyectos ITAI",
  description: "Portafolio de automatizaciones y Dev Framework ITAI",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es-MX">
      <body className={`${fontSans.variable} ${fontMono.variable}`}>{children}</body>
    </html>
  );
}
