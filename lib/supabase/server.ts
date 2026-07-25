// lib/supabase/server.ts
//
// Per-request Supabase client for use in Server Components, Server Actions,
// and Route Handlers. Uses @supabase/ssr's cookie-based session handling so
// that auth.uid() on the server matches the signed-in browser session,
// which is required for the Row Level Security policies in
// supabase/migrations/0002_rls.sql to pass.
//
// Returns null when Supabase isn't configured (no env vars), so callers can
// fall back to the in-memory mock data layer exactly as before.

import { cookies } from "next/headers";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { isSupabaseConfigured } from "../supabaseClient";

/**
 * Creates a fresh Supabase client bound to the current request's cookies.
 * Declared `async` (even though `cookies()` is synchronous on the
 * currently-installed Next.js version) so call sites use `await` uniformly
 * and keep working if/when Next.js moves `cookies()` to an async API.
 */
export async function getServerSupabaseClient() {
  if (!isSupabaseConfigured) return null;

  const cookieStore = cookies();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;

  return createServerClient(url, anonKey, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value;
      },
      set(name: string, value: string, options: CookieOptions) {
        try {
          cookieStore.set({ name, value, ...options });
        } catch {
          // `set` is called from a Server Component render, where cookie
          // mutation isn't allowed. This is safe to ignore as long as
          // middleware.ts is refreshing the session on every request.
        }
      },
      remove(name: string, options: CookieOptions) {
        try {
          cookieStore.set({ name, value: "", ...options });
        } catch {
          // See note above.
        }
      },
    },
  });
}
