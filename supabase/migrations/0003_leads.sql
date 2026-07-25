-- Leads captured from the public marketing landing page (app/page.tsx).
-- Unlike every other table in this app, leads are submitted by anonymous,
-- unauthenticated visitors, so this table intentionally has NO ownership
-- chain back to auth.uid().

create table if not exists leads (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  company text,
  role text,
  message text,
  source text not null default 'landing_page',
  created_at timestamptz not null default now()
);

create index if not exists idx_leads_created_at on leads(created_at desc);

alter table leads enable row level security;

-- Public lead-gen form: anyone (including the anonymous/unauthenticated
-- `anon` role) may INSERT a lead. This is intentional — form submitters
-- are not logged in.
create policy "leads_insert_public" on leads for insert
  to anon, authenticated
  with check (true);

-- Deliberately NO select policy: leads must not be readable via the app's
-- anon/authenticated Supabase client. They are only visible via the
-- Supabase dashboard or a service-role key (which bypasses RLS).
