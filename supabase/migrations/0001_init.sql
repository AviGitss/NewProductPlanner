-- MfgPlan initial schema
-- Run via Supabase CLI (`supabase db push`) or paste into the SQL editor.

create extension if not exists "uuid-ossp";

-- ============================================================
-- projects
-- ============================================================
create table if not exists projects (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================
-- components (CAD reference + material/mechanical params)
-- ============================================================
create table if not exists components (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid not null references projects(id) on delete cascade,
  name text not null,
  cad_file_path text,       -- storage object path in the cad-files bucket
  cad_file_name text,
  material jsonb not null default '{}'::jsonb,
  mechanical jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- ============================================================
-- process_definitions (raw NL text per component)
-- ============================================================
create table if not exists process_definitions (
  id uuid primary key default uuid_generate_v4(),
  component_id uuid not null references components(id) on delete cascade,
  raw_text text not null,
  created_at timestamptz not null default now()
);

-- ============================================================
-- process_stages (parsed, user-editable, ordered stages)
-- ============================================================
create table if not exists process_stages (
  id uuid primary key default uuid_generate_v4(),
  process_definition_id uuid not null references process_definitions(id) on delete cascade,
  sequence int not null,
  stage_type text not null,
  name text not null,
  description text,
  matched_keywords text[] not null default '{}',
  created_at timestamptz not null default now()
);

-- ============================================================
-- machines (seeded catalog)
-- ============================================================
create table if not exists machines (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  manufacturer text not null,
  process_type text not null,
  specs jsonb not null default '{}'::jsonb,
  cost_tier text not null default 'medium',
  est_hourly_rate_usd numeric not null default 75,
  created_at timestamptz not null default now()
);

-- ============================================================
-- stage_recommendations (scored machine per stage, cached)
-- ============================================================
create table if not exists stage_recommendations (
  id uuid primary key default uuid_generate_v4(),
  process_stage_id uuid not null references process_stages(id) on delete cascade,
  machine_id uuid not null references machines(id) on delete cascade,
  score numeric not null,
  breakdown jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

-- ============================================================
-- iterations (a saved planning run)
-- ============================================================
create table if not exists iterations (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid not null references projects(id) on delete cascade,
  component_id uuid not null references components(id) on delete cascade,
  process_definition_id uuid not null references process_definitions(id) on delete cascade,
  name text not null,
  status text not null default 'draft',
  avg_score numeric not null default 0,
  est_cycle_time_min numeric not null default 0,
  est_cost_usd numeric not null default 0,
  created_at timestamptz not null default now()
);

-- ============================================================
-- iteration_stage_selections (chosen machine per stage per iteration)
-- ============================================================
create table if not exists iteration_stage_selections (
  id uuid primary key default uuid_generate_v4(),
  iteration_id uuid not null references iterations(id) on delete cascade,
  process_stage_id uuid not null references process_stages(id) on delete cascade,
  machine_id uuid not null references machines(id) on delete cascade,
  sequence int not null,
  score numeric not null
);

-- ============================================================
-- digital_twin_snapshots (simulated live telemetry)
-- ============================================================
create table if not exists digital_twin_snapshots (
  id uuid primary key default uuid_generate_v4(),
  machine_id uuid not null references machines(id) on delete cascade,
  iteration_id uuid not null references iterations(id) on delete cascade,
  process_stage_id uuid not null references process_stages(id) on delete cascade,
  utilization_pct numeric not null,
  cycle_time_min numeric not null,
  status text not null,
  last_maintenance timestamptz not null,
  captured_at timestamptz not null default now()
);

-- ============================================================
-- reports (generated report metadata; the actual file may live in Storage
-- or be rendered client-side as HTML/PDF)
-- ============================================================
create table if not exists reports (
  id uuid primary key default uuid_generate_v4(),
  iteration_id uuid not null references iterations(id) on delete cascade,
  title text not null,
  content jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- ============================================================
-- indexes
-- ============================================================
create index if not exists idx_components_project on components(project_id);
create index if not exists idx_process_definitions_component on process_definitions(component_id);
create index if not exists idx_process_stages_definition on process_stages(process_definition_id);
create index if not exists idx_stage_recommendations_stage on stage_recommendations(process_stage_id);
create index if not exists idx_iterations_project on iterations(project_id);
create index if not exists idx_iteration_selections_iteration on iteration_stage_selections(iteration_id);
create index if not exists idx_twin_snapshots_iteration on digital_twin_snapshots(iteration_id);
create index if not exists idx_reports_iteration on reports(iteration_id);
