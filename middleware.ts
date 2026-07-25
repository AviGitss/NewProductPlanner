// middleware.ts
//
// Two jobs, standard Supabase SSR pattern:
//  1. Refresh the auth session cookie on every request so sessions don't
//     silently expire mid-use (per @supabase/ssr docs).
//  2. Protect app routes: unauthenticated requests to /dashboard or
//     /projects/* are redirected to /login. /login and static assets stay
//     public.
//
// In zero-config demo mode (no Supabase env vars) this middleware is a
// no-op passthrough — the existing mock-user behavior is unchanged.

import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

const PROTECTED_PREFIXES = ["/dashboard", "/projects"];

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: { headers: request.headers },
  });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Demo mode: no Supabase configured, skip auth entirely.
  if (!supabaseUrl || !supabaseAnonKey) {
    return response;
  }

  // Uses the getAll()/setAll() cookie adapter (see lib/supabase/server.ts
  // for why this matters — the old per-name get/set/remove adapter doesn't
  // reliably handle Supabase's chunked auth cookies and caused intermittent
  // "signed in but auth.uid() is null" RLS failures for some users).
  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request: { headers: request.headers } });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  // Refresh the session (also gives us the current user for route guarding).
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const isProtected = PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );

  if (!user && isProtected) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/login";
    redirectUrl.searchParams.set("redirectTo", pathname);
    return NextResponse.redirect(redirectUrl);
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, and common static asset extensions
     */
    "/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
