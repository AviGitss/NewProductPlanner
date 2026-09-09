-- Phase 1 of the platform redesign: company registration + RBAC.
--
-- Introduces multi-tenant "companies" with role-based membership, and
-- re-scopes every existing table's Row Level Security from
-- "projects.user_id = auth.uid()" (single-owner) to "the current user is
-- an active member of the project's company" (team-based). Existing data
-- is backfilled automatically: every distinct project owner gets their
-- own company (named after their email) and becomes its admin, so nothing
-- currently in the database becomes inaccessible.
--
-- Fine-grained action gating (e.g. "only Production can fill in capacity
-- data", "only Sales can see the cross-RFP monitoring view") is enforced
-- in the app layer (server actions check the caller's role) rather than
-- in RLS — RLS here is responsible for tenant isolation (you can never
-- see another company's data), which is the part a bug in application
-- code must not be able to bypass.

-- ============================================================
-- companies & membership
-- ============================================================
create table if not exists companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists company_members (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  -- Null until the invited person signs up / logs in and their account
  -- gets linked by matching email (see claim logic in lib/data/index.ts).
  user_id uuid references auth.users(id) on delete cascade,
  invited_email text,
  role text not null check (role in ('admin', 'sales', 'rfp_prep', 'production', 'viewer')),
  status text not null default 'active' check (status in ('invited', 'active')),
  created_at timestamptz not null default now(),
  unique (company_id, user_id)
);

create index if not exists idx_company_members_company on company_members(company_id);
create index if not exists idx_company_members_user on company_members(user_id);
create index if not exists idx_company_members_invited_email on company_members(invited_email);

alter table projects add column if not exists company_id uuid references companies(id);
create index if not exists idx_projects_company on projects(company_id);

-- ============================================================
-- backfill: one company per existing project owner
-- ============================================================
do $$
declare
  r record;
  new_company_id uuid;
  uemail text;
begin
  for r in select distinct user_id from projects where company_id is null loop
    select email into uemail from auth.users where id = r.user_id;
    insert into companies (name) values (coalesce(uemail, r.user_id::text) || E'’s company')
      returning id into new_company_id;
    insert into company_members (company_id, user_id, role, status, invited_email)
      values (new_company_id, r.user_id, 'admin', 'active', uemail);
    update projects set company_id = new_company_id where user_id = r.user_id and company_id is null;
  end loop;
end $$;

-- ============================================================
-- helper functions (security definer: they intentionally read across RLS
-- boundaries internally so the policies that call them don't recurse)
-- ============================================================
create or replace function public.current_user_email()
returns text language sql stable security definer set search_path = public as $$
  select email from auth.users where id = auth.uid();
$$;

create or replace function public.is_company_member(cid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from company_members
    where company_id = cid and user_id = auth.uid() and status = 'active'
  );
$$;

create or replace function public.is_company_admin(cid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from company_members
    where company_id = cid and user_id = auth.uid() and status = 'active' and role = 'admin'
  );
$$;

create or replace function public.can_access_project(pid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from projects p
    where p.id = pid and public.is_company_member(p.company_id)
  );
$$;

grant execute on function public.current_user_email() to authenticated;
grant execute on function public.is_company_member(uuid) to authenticated;
grant execute on function public.is_company_admin(uuid) to authenticated;
grant execute on function public.can_access_project(uuid) to authenticated;

-- ============================================================
-- companies / company_members RLS
-- ============================================================
alter table companies enable row level security;
alter table company_members enable row level security;

drop policy if exists "companies_select_member" on companies;
create policy "companies_select_member" on companies for select
  using (public.is_company_member(id));

drop policy if exists "companies_insert_authenticated" on companies;
create policy "companies_insert_authenticated" on companies for insert
  to authenticated with check (true);

drop policy if exists "companies_update_admin" on companies;
create policy "companies_update_admin" on companies for update
  using (public.is_company_admin(id));

drop policy if exists "company_members_select_same_company" on company_members;
create policy "company_members_select_same_company" on company_members for select
  using (public.is_company_member(company_id));

-- Two ways a row can be inserted: (1) bootstrapping a brand-new company
-- (the very first member — inserting themselves as its first admin, at
-- which point is_company_admin() would still be false since no member
-- row exists yet), or (2) an existing admin inviting someone else.
drop policy if exists "company_members_insert" on company_members;
create policy "company_members_insert" on company_members for insert
  with check (
    (user_id = auth.uid() and not exists (
      select 1 from company_members cm2 where cm2.company_id = company_members.company_id
    ))
    or public.is_company_admin(company_id)
  );

-- Two ways a row can be updated: an admin managing their team, or an
-- invited person claiming their own still-unlinked invite by matching
-- email (see claimPendingInvites in lib/data/index.ts).
drop policy if exists "company_members_update_admin" on company_members;
create policy "company_members_update_admin" on company_members for update
  using (public.is_company_admin(company_id))
  with check (public.is_company_admin(company_id));

drop policy if exists "company_members_claim_own_invite" on company_members;
create policy "company_members_claim_own_invite" on company_members for update
  using (user_id is null and invited_email = public.current_user_email())
  with check (user_id = auth.uid() and invited_email = public.current_user_email());

drop policy if exists "company_members_delete_admin" on company_members;
create policy "company_members_delete_admin" on company_members for delete
  using (public.is_company_admin(company_id));

-- ============================================================
-- re-scope every existing table's RLS to company membership
-- ============================================================

-- ---------------- projects ----------------
drop policy if exists "projects_select_own" on projects;
drop policy if exists "projects_insert_own" on projects;
drop policy if exists "projects_update_own" on projects;
drop policy if exists "projects_delete_own" on projects;

create policy "projects_select_company" on projects for select
  using (public.is_company_member(company_id));
create policy "projects_insert_company" on projects for insert
  with check (public.is_company_member(company_id));
create policy "projects_update_company" on projects for update
  using (public.is_company_member(company_id));
create policy "projects_delete_company" on projects for delete
  using (public.is_company_member(company_id));

-- ---------------- components ----------------
drop policy if exists "components_select_own" on components;
drop policy if exists "components_insert_own" on components;
drop policy if exists "components_update_own" on components;
drop policy if exists "components_delete_own" on components;

create policy "components_select_company" on components for select
  using (public.can_access_project(project_id));
create policy "components_insert_company" on components for insert
  with check (public.can_access_project(project_id));
create policy "components_update_company" on components for update
  using (public.can_access_project(project_id));
create policy "components_delete_company" on components for delete
  using (public.can_access_project(project_id));

-- ---------------- process_definitions ----------------
drop policy if exists "process_definitions_select_own" on process_definitions;
drop policy if exists "process_definitions_insert_own" on process_definitions;
drop policy if exists "process_definitions_update_own" on process_definitions;
drop policy if exists "process_definitions_delete_own" on process_definitions;

create policy "process_definitions_select_company" on process_definitions for select
  using (public.can_access_project((select c.project_id from components c where c.id = component_id)));
create policy "process_definitions_insert_company" on process_definitions for insert
  with check (public.can_access_project((select c.project_id from components c where c.id = component_id)));
create policy "process_definitions_update_company" on process_definitions for update
  using (public.can_access_project((select c.project_id from components c where c.id = component_id)));
create policy "process_definitions_delete_company" on process_definitions for delete
  using (public.can_access_project((select c.project_id from components c where c.id = component_id)));

-- ---------------- process_stages ----------------
drop policy if exists "process_stages_select_own" on process_stages;
drop policy if exists "process_stages_cud_own" on process_stages;

create policy "process_stages_select_company" on process_stages for select
  using (public.can_access_project((
    select c.project_id from process_definitions pd join components c on c.id = pd.component_id
    where pd.id = process_definition_id
  )));
create policy "process_stages_cud_company" on process_stages for all
  using (public.can_access_project((
    select c.project_id from process_definitions pd join components c on c.id = pd.component_id
    where pd.id = process_definition_id
  )))
  with check (public.can_access_project((
    select c.project_id from process_definitions pd join components c on c.id = pd.component_id
    where pd.id = process_definition_id
  )));

-- ---------------- stage_recommendations ----------------
drop policy if exists "stage_recommendations_select_own" on stage_recommendations;
drop policy if exists "stage_recommendations_cud_own" on stage_recommendations;

create policy "stage_recommendations_select_company" on stage_recommendations for select
  using (public.can_access_project((
    select c.project_id from process_stages ps
    join process_definitions pd on pd.id = ps.process_definition_id
    join components c on c.id = pd.component_id
    where ps.id = process_stage_id
  )));
create policy "stage_recommendations_cud_company" on stage_recommendations for all
  using (public.can_access_project((
    select c.project_id from process_stages ps
    join process_definitions pd on pd.id = ps.process_definition_id
    join components c on c.id = pd.component_id
    where ps.id = process_stage_id
  )))
  with check (public.can_access_project((
    select c.project_id from process_stages ps
    join process_definitions pd on pd.id = ps.process_definition_id
    join components c on c.id = pd.component_id
    where ps.id = process_stage_id
  )));

-- ---------------- iterations ----------------
drop policy if exists "iterations_select_own" on iterations;
drop policy if exists "iterations_cud_own" on iterations;

create policy "iterations_select_company" on iterations for select
  using (public.can_access_project(project_id));
create policy "iterations_cud_company" on iterations for all
  using (public.can_access_project(project_id))
  with check (public.can_access_project(project_id));

-- ---------------- iteration_stage_selections ----------------
drop policy if exists "iteration_selections_select_own" on iteration_stage_selections;
drop policy if exists "iteration_selections_cud_own" on iteration_stage_selections;

create policy "iteration_selections_select_company" on iteration_stage_selections for select
  using (public.can_access_project((select i.project_id from iterations i where i.id = iteration_id)));
create policy "iteration_selections_cud_company" on iteration_stage_selections for all
  using (public.can_access_project((select i.project_id from iterations i where i.id = iteration_id)))
  with check (public.can_access_project((select i.project_id from iterations i where i.id = iteration_id)));

-- ---------------- digital_twin_snapshots ----------------
drop policy if exists "twin_snapshots_select_own" on digital_twin_snapshots;
drop policy if exists "twin_snapshots_cud_own" on digital_twin_snapshots;

create policy "twin_snapshots_select_company" on digital_twin_snapshots for select
  using (public.can_access_project((select i.project_id from iterations i where i.id = iteration_id)));
create policy "twin_snapshots_cud_company" on digital_twin_snapshots for all
  using (public.can_access_project((select i.project_id from iterations i where i.id = iteration_id)))
  with check (public.can_access_project((select i.project_id from iterations i where i.id = iteration_id)));

-- ---------------- reports ----------------
drop policy if exists "reports_select_own" on reports;
drop policy if exists "reports_cud_own" on reports;

create policy "reports_select_company" on reports for select
  using (public.can_access_project((select i.project_id from iterations i where i.id = iteration_id)));
create policy "reports_cud_company" on reports for all
  using (public.can_access_project((select i.project_id from iterations i where i.id = iteration_id)))
  with check (public.can_access_project((select i.project_id from iterations i where i.id = iteration_id)));
