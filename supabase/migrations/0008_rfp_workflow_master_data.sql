-- Phase 2 (staged RFP workflow) + Phase 3 (master data sets) of the
-- platform redesign, on top of the company/RBAC foundation in 0007.

-- ============================================================
-- Phase 2: staged RFP workflow
-- ============================================================
alter table projects add column if not exists rfp_stage text not null default 'intake'
  check (rfp_stage in ('intake', 'spec_and_process', 'production_capacity', 'machine_selection', 'costing_and_report', 'sales_review', 'won', 'lost'));
alter table projects add column if not exists rfp_stage_updated_at timestamptz not null default now();

create table if not exists rfp_stage_events (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  from_stage text,
  to_stage text not null,
  moved_by uuid references auth.users(id),
  note text,
  created_at timestamptz not null default now()
);
create index if not exists idx_rfp_stage_events_project on rfp_stage_events(project_id);

-- The production team's contribution to an RFP: one row per project.
create table if not exists production_capacity_inputs (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null unique references projects(id) on delete cascade,
  available_lines int,
  shifts_per_day int,
  hours_per_shift numeric,
  oee_pct numeric,
  notes text,
  submitted_by uuid references auth.users(id),
  submitted_at timestamptz,
  updated_at timestamptz not null default now()
);

-- Per-run documents (CAD files, RFP paperwork, historical-proposal
-- references, and manually-uploaded AutoForm result exports). Actual file
-- bytes live in Supabase Storage; this row is the metadata + pointer.
create table if not exists rfp_documents (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  kind text not null check (kind in ('cad', 'rfp_doc', 'proposal_reference', 'autoform_result', 'other')),
  file_name text not null,
  storage_path text,
  notes text,
  uploaded_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);
create index if not exists idx_rfp_documents_project on rfp_documents(project_id);

-- ============================================================
-- Phase 3: uploadable master data sets (company-scoped)
-- ============================================================
create table if not exists master_equipment (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  name text not null,
  process_type text not null,
  specs jsonb not null default '{}'::jsonb,
  source text not null default 'uploaded' check (source in ('uploaded', 'seed')),
  created_at timestamptz not null default now()
);
create index if not exists idx_master_equipment_company on master_equipment(company_id);

create table if not exists master_materials (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  grade_name text not null,
  family text,
  tensile_strength_mpa numeric,
  yield_strength_mpa numeric,
  hardness_hb numeric,
  density_g_cm3 numeric,
  typical_lead_time_days numeric,
  notes text,
  created_at timestamptz not null default now()
);
create index if not exists idx_master_materials_company on master_materials(company_id);

-- Equipment-gap procurement suggestions (Phase 4): generated when no
-- machine in the catalog (built-in or uploaded) scores well enough for a
-- process stage's requirements.
create table if not exists procurement_suggestions (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  process_stage_id uuid references process_stages(id) on delete set null,
  process_type text not null,
  required_specs jsonb not null default '{}'::jsonb,
  rationale text not null,
  status text not null default 'open' check (status in ('open', 'dismissed', 'procured')),
  created_at timestamptz not null default now()
);
create index if not exists idx_procurement_suggestions_project on procurement_suggestions(project_id);

-- ============================================================
-- RLS
-- ============================================================
alter table rfp_stage_events enable row level security;
alter table production_capacity_inputs enable row level security;
alter table rfp_documents enable row level security;
alter table master_equipment enable row level security;
alter table master_materials enable row level security;
alter table procurement_suggestions enable row level security;

drop policy if exists "rfp_stage_events_select_company" on rfp_stage_events;
create policy "rfp_stage_events_select_company" on rfp_stage_events for select
  using (public.can_access_project(project_id));
drop policy if exists "rfp_stage_events_insert_company" on rfp_stage_events;
create policy "rfp_stage_events_insert_company" on rfp_stage_events for insert
  with check (public.can_access_project(project_id));

drop policy if exists "production_capacity_select_company" on production_capacity_inputs;
create policy "production_capacity_select_company" on production_capacity_inputs for select
  using (public.can_access_project(project_id));
drop policy if exists "production_capacity_cud_company" on production_capacity_inputs;
create policy "production_capacity_cud_company" on production_capacity_inputs for all
  using (public.can_access_project(project_id))
  with check (public.can_access_project(project_id));

drop policy if exists "rfp_documents_select_company" on rfp_documents;
create policy "rfp_documents_select_company" on rfp_documents for select
  using (public.can_access_project(project_id));
drop policy if exists "rfp_documents_cud_company" on rfp_documents;
create policy "rfp_documents_cud_company" on rfp_documents for all
  using (public.can_access_project(project_id))
  with check (public.can_access_project(project_id));

drop policy if exists "master_equipment_select_company" on master_equipment;
create policy "master_equipment_select_company" on master_equipment for select
  using (public.is_company_member(company_id));
drop policy if exists "master_equipment_cud_company" on master_equipment;
create policy "master_equipment_cud_company" on master_equipment for all
  using (public.is_company_member(company_id))
  with check (public.is_company_member(company_id));

drop policy if exists "master_materials_select_company" on master_materials;
create policy "master_materials_select_company" on master_materials for select
  using (public.is_company_member(company_id));
drop policy if exists "master_materials_cud_company" on master_materials;
create policy "master_materials_cud_company" on master_materials for all
  using (public.is_company_member(company_id))
  with check (public.is_company_member(company_id));

drop policy if exists "procurement_suggestions_select_company" on procurement_suggestions;
create policy "procurement_suggestions_select_company" on procurement_suggestions for select
  using (public.can_access_project(project_id));
drop policy if exists "procurement_suggestions_cud_company" on procurement_suggestions;
create policy "procurement_suggestions_cud_company" on procurement_suggestions for all
  using (public.can_access_project(project_id))
  with check (public.can_access_project(project_id));
