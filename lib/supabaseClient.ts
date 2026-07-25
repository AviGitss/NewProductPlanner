// lib/supabaseClient.ts
//
// Shared config helpers. `isSupabaseConfigured` and `CAD_BUCKET` are used
// throughout the app (data layer, auth, middleware, UI) to decide whether
// to talk to real Supabase or fall back to the in-memory mock data layer.
//
// The actual Supabase *clients* live in lib/supabase/server.ts (per-request,
// cookie-aware, for Server Components/Actions/Route Handlers) and
// lib/supabase/client.ts (browser, for Client Components). This file
// intentionally no longer exports a single shared client instance — a
// single client can't be cookie-aware per request, which is required for
// auth.uid() to line up with the signed-in user under Row Level Security.

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(url && anonKey);

export const CAD_BUCKET = process.env.NEXT_PUBLIC_CAD_BUCKET || "cad-files";
