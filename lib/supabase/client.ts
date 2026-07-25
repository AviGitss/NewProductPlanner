// lib/supabase/client.ts
//
// Browser-side Supabase client for use in Client Components (currently just
// the /login page). Session tokens are persisted via cookies (not
// localStorage) so the server client in lib/supabase/server.ts can read the
// same session.

import { createBrowserClient } from "@supabase/ssr";

export function getBrowserSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;
  return createBrowserClient(url, anonKey);
}
