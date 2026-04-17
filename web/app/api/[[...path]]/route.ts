import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const UPSTREAM = process.env.SCORECARD_API_ORIGIN?.replace(/\/$/, "");

function buildUpstreamUrl(request: Request, pathSegments: string[]): string | null {
  if (!UPSTREAM) return null;
  const sub = pathSegments.length ? pathSegments.join("/") : "";
  const qs = new URL(request.url).search;
  return `${UPSTREAM}/api/${sub}${qs}`;
}

async function proxy(request: Request, pathSegments: string[]): Promise<Response> {
  const target = buildUpstreamUrl(request, pathSegments);
  if (!target) {
    return NextResponse.json(
      {
        error: {
          code: "PROXY_NOT_CONFIGURED",
          message:
            "Define SCORECARD_API_ORIGIN en Vercel (URL de tu API Express, sin barra final).",
        },
      },
      { status: 503 },
    );
  }

  const method = request.method.toUpperCase();
  const headers = new Headers();
  const ct = request.headers.get("content-type");
  if (ct) headers.set("content-type", ct);
  const accept = request.headers.get("accept");
  if (accept) headers.set("accept", accept);

  const init: RequestInit = {
    method,
    headers,
    cache: "no-store",
  };

  if (method !== "GET" && method !== "HEAD") {
    init.body = await request.arrayBuffer();
  }

  const res = await fetch(target, init);
  const out = new Headers(res.headers);
  out.delete("transfer-encoding");
  return new NextResponse(res.body, { status: res.status, headers: out });
}

type RouteCtx = { params: Promise<{ path?: string[] }> };

export async function GET(request: Request, ctx: RouteCtx) {
  const { path = [] } = await ctx.params;
  return proxy(request, path);
}

export async function HEAD(request: Request, ctx: RouteCtx) {
  const { path = [] } = await ctx.params;
  return proxy(request, path);
}

export async function PATCH(request: Request, ctx: RouteCtx) {
  const { path = [] } = await ctx.params;
  return proxy(request, path);
}

export async function POST(request: Request, ctx: RouteCtx) {
  const { path = [] } = await ctx.params;
  return proxy(request, path);
}

export async function PUT(request: Request, ctx: RouteCtx) {
  const { path = [] } = await ctx.params;
  return proxy(request, path);
}

export async function DELETE(request: Request, ctx: RouteCtx) {
  const { path = [] } = await ctx.params;
  return proxy(request, path);
}
