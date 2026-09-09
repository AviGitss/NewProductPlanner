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
import { MOCK_COMPANY, MOCK_USER } from "./data/mockStore";
import { getServerSupabaseClient } from "./supabase/server";
import { claimPendingInvites, getCompanyMembership } from "./data";
import { UserContext } from "./types";

export async function getCurrentUserId(): Promise<string> {
  if (!isSupabaseConfigured) return MOCK_USER.id;

  const supabase = await getServerSupabaseClient();
  const { data } = await supabase!.auth.getUser();
  if (!data.user) {
    redirect("/login");
  }
  return data.user.id;
}

/**
 * Resolves the full request identity: who's signed in, which company
 * they're acting as, and in what role — the basis for every RBAC check in
 * the app layer (see lib/rbac.ts). `companyId`/`role` are null when the
 * user is signed in but hasn't registered or joined a company yet; callers
 * that require a company (almost everything past the dashboard) should
 * redirect to /register-company in that case rather than assume one exists.
 */
export async function getCurrentUserContext(): Promise<UserContext> {
  if (!isSupabaseConfigured) {
    return { userId: MOCK_USER.id, email: MOCK_USER.email, companyId: MOCK_COMPANY.id, role: "admin" };
  }

  const supabase = await getServerSupabaseClient();
  const { data } = await supabase!.auth.getUser();
  if (!data.user) redirect("/login");

  const email = data.user.email ?? null;
  // Claiming is cheap (a single conditional UPDATE that matches zero rows
  // in the common case) so it's safe to attempt on every request rather
  // than needing a dedicated "first login after invite" code path.
  if (email) await claimPendingInvites(data.user.id, email);

  const membership = await getCompanyMembership(data.user.id);
  return {
    userId: data.user.id,
    email,
    companyId: membership?.company_id ?? null,
    role: membership?.role ?? null,
  };
}
