import { NextResponse } from "next/server";
import { getApiBaseUrl } from "@/lib/projectsApi";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * GET /api/warmup
 *
 * Hace un ping al API Express (GET /health) para "despertarlo" si estaba dormido
 * en un servicio free-tier (Render, Railway, etc.).
 *
 * Uso recomendado:
 *  - Llama a /api/warmup desde el layout del dashboard o desde un Service Worker
 *    en cuanto el browser carga, ANTES de que el usuario llegue al panel.
 *  - En Vercel: puedes configurar un Cron Job (vercel.json) que lo llame cada 10 min.
 */
export async function GET() {
  const base = getApiBaseUrl();
  if (!base) {
    return NextResponse.json({ warmed: false, reason: "API no configurada" }, { status: 200 });
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(`${base}/health`, {
      method: "GET",
      cache: "no-store",
      signal: controller.signal,
    });
    clearTimeout(timeout);
    return NextResponse.json({ warmed: true, status: res.status }, { status: 200 });
  } catch {
    return NextResponse.json({ warmed: false, reason: "Sin respuesta del API" }, { status: 200 });
  }
}
