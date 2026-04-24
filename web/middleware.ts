import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

const hasSupabaseEnv =
  Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()) &&
  Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim());

/**
 * Sólo en desarrollo: sin Supabase, el panel sigue abriendo (flujo local).
 * En producción sin `NEXT_PUBLIC_*` inyectados en el build, antes se dejaba pasar
 * todo (Invitado, sin login). Ahí forzamos `/login?error=config`.
 */
const isProduction = process.env.NODE_ENV === "production";

function isProtectedPath(pathname: string): boolean {
  if (pathname.startsWith("/panel")) return true;
  if (pathname.startsWith("/workflows")) return true;
  if (pathname.startsWith("/proyectos")) return true;
  return false;
}

function isAuthPath(pathname: string): boolean {
  if (pathname === "/login" || pathname.startsWith("/login/")) return true;
  if (pathname.startsWith("/auth/")) return true;
  return false;
}

/** Propaga cookies de sesión (p. ej. refresh) cuando la respuesta final es un redirect. */
function redirectWithAuthCookies(
  request: NextRequest,
  target: string | URL,
  sessionResponse: NextResponse,
): NextResponse {
  const redirect = NextResponse.redirect(
    typeof target === "string" ? new URL(target, request.url) : target,
  );
  sessionResponse.cookies.getAll().forEach((c) => {
    redirect.cookies.set(c);
  });
  return redirect;
}

export async function middleware(request: NextRequest) {
  if (!hasSupabaseEnv) {
    if (isProduction) {
      const { pathname } = request.nextUrl;
      if (pathname === "/login" || pathname.startsWith("/auth/")) {
        return NextResponse.next();
      }
      return NextResponse.redirect(new URL("/login?error=config", request.url));
    }
    return NextResponse.next();
  }

  const sessionResponse = NextResponse.next({ request: { headers: request.headers } });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            sessionResponse.cookies.set({ name, value, ...options });
          });
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname, search } = request.nextUrl;
  const nextParam = search ? `${pathname}${search}` : pathname;

  if (user && isAuthPath(pathname) && pathname === "/login") {
    return redirectWithAuthCookies(request, new URL("/panel", request.url), sessionResponse);
  }

  if (!user && isProtectedPath(pathname)) {
    const login = new URL("/login", request.url);
    login.searchParams.set("next", nextParam);
    return redirectWithAuthCookies(request, login, sessionResponse);
  }

  if (!user && pathname === "/") {
    return redirectWithAuthCookies(request, new URL("/login", request.url), sessionResponse);
  }

  if (user && pathname === "/") {
    return redirectWithAuthCookies(request, new URL("/panel", request.url), sessionResponse);
  }

  return sessionResponse;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
