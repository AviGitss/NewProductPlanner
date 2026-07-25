// lib/supabaseClient.ts
//
// Thin wrapper around @supabase/supabase-js. Returns null when the required
// env vars are absent so callers (lib/data/index.ts) can fall back to the
// in-memory mock data layer. This lets `npm run dev` work out of the box
// with zero configuration.

import { createClient, SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(url && anonKey);

let client: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient | null {
  if (!isSupabaseConfigured) return null;
  if (!client) {
    client = createClient(url as string, anonKey as string, {
      auth: { persistSession: true, autoRefreshToken: true },
    });
  }
  return client;
}

export const CAD_BUCKET = process.env.NEXT_PUBLIC_CAD_BUCKET || "cad-files";
