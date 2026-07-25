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
import { createServerClient } from "@supabase/ssr";
import { isSupabaseConfigured } from "../supabaseClient";

/**
 * Creates a fresh Supabase client bound to the current request's cookies.
 * Declared `async` (even though `cookies()` is synchronous on the
 * currently-installed Next.js version) so call sites use `await` uniformly
 * and keep working if/when Next.js moves `cookies()` to an async API.
 *
 * Uses the getAll()/setAll() cookie adapter (the current recommended
 * pattern for @supabase/ssr in the App Router) rather than individual
 * get()/set()/remove() calls. This matters: Supabase splits the auth
 * session into multiple chunked cookies (e.g. sb-<ref>-auth-token.0, .1...)
 * once the JWT exceeds a few KB, and the per-name get/set/remove adapter
 * does not reliably reassemble/rewrite all chunks — it intermittently drops
 * or misreads the session for some users, which surfaced as RLS insert
 * failures ("new row violates row-level security policy") because
 * auth.uid() came back null even though the user was signed in.
 */
export async function getServerSupabaseClient() {
  if (!isSupabaseConfigured) return null;

  const cookieStore = cookies();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;

  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // `setAll` is called from a Server Component render, where cookie
          // mutation isn't allowed. This is safe to ignore as long as
          // middleware.ts is refreshing the session on every request.
        }
      },
    },
  });
}
