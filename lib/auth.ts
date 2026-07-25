// lib/auth.ts
//
// Minimal auth helper. When Supabase is configured, real email/password
// auth (via @supabase/supabase-js) is expected to be wired through the
// /login page and Supabase session cookies. When Supabase is NOT
// configured (the default, credential-free demo mode) we short-circuit to
// a fixed mock user so every page is directly browsable.

import { isSupabaseConfigured } from "./supabaseClient";
import { MOCK_USER } from "./data/mockStore";

export async function getCurrentUserId(): Promise<string> {
  if (!isSupabaseConfigured) return MOCK_USER.id;
  // In a full Supabase deployment this would read the session from
  // cookies (e.g. via @supabase/ssr). For this demo build we still fall
  // back to the mock user id if no session helper is wired up, so the app
  // never hard-fails when SUPABASE_URL is set but auth hasn't been
  // completed yet.
  return MOCK_USER.id;
}
