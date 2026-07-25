// scripts/seed.ts
//
// Populates a real Supabase project's `machines` table from the shared
// MACHINE_CATALOG (lib/data/machineCatalog.ts). Uses the service role key
// so it bypasses RLS. Run with:
//
//   npm run seed
//
// Requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to be set
// (e.g. in .env.local — this script loads that file automatically).

import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "fs";
import { resolve } from "path";
import { MACHINE_CATALOG } from "../lib/data/machineCatalog";

function loadEnvLocal() {
  const path = resolve(__dirname, "../.env.local");
  if (!existsSync(path)) return;
  const content = readFileSync(path, "utf-8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const idx = trimmed.indexOf("=");
    if (idx === -1) continue;
    const key = trimmed.slice(0, idx).trim();
    const value = trimmed.slice(idx + 1).trim();
    if (!process.env[key]) process.env[key] = value;
  }
}

async function main() {
  loadEnvLocal();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    console.error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. Set them in .env.local before running the seed script."
    );
    process.exit(1);
  }

  const supabase = createClient(url, serviceKey);

  console.log(`Seeding ${MACHINE_CATALOG.length} machines...`);
  const { error } = await supabase.from("machines").insert(MACHINE_CATALOG);
  if (error) {
    console.error("Seed failed:", error.message);
    process.exit(1);
  }
  console.log("Seed complete.");
}

main();
