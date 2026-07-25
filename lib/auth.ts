// lib/auth.ts
//
// Auth helper. When Supabase is configured, the current user id is read
// from the real signed-in session (via the cookie-aware server client in
// lib/supabase/server.ts) so it matches `auth.uid()` for Row Level
// Security. There is intentionally no mock-user fallback in this branch:
// route protection lives in middleware.ts, which redirects unauthenticated
// requests to /login before any page/server action that calls
// getCurrentUserId() ever runs. If this function is somehow reached without
// a session, it redirects to /login itself as a defensive fallback rather
// than silently acting as another user.
//
// When Supabase is NOT configured (zero-config demo mode, no env vars) we
// keep the original fixed mock user so `npm run dev` works out of the box.

import { redirect } from "next/navigation";
import { isSupabaseConfigured } from "./supabaseClient";
import { MOCK_USER } from "./data/mockStore";
import { getServerSupabaseClient } from "./supabase/server";

export async function getCurrentUserId(): Promise<string> {
  if (!isSupabaseConfigured) return MOCK_USER.id;

  const supabase = await getServerSupabaseClient();
  const { data } = await supabase!.auth.getUser();
  if (!data.user) {
    redirect("/login");
  }
  return data.user.id;
}
