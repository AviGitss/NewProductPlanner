-- Row Level Security policies for MfgPlan.
-- Ownership chain: projects.user_id = auth.uid() -> all child tables are
-- scoped through their project_id / component_id / iteration_id ancestry.
-- machines is a shared read-only catalog (seeded), writable only by the
-- service role (used by the seed script).

alter table projects enable row level security;
alter table components enable row level security;
alter table process_definitions enable row level security;
alter table process_stages enable row level security;
alter table machines enable row level security;
alter table stage_recommendations enable row level security;
alter table iterations enable row level security;
alter table iteration_stage_selections enable row level security;
alter table digital_twin_snapshots enable row level security;
alter table reports enable row level security;

-- ---------------- projects ----------------
create policy "projects_select_own" on projects for select
  using (auth.uid() = user_id);
create policy "projects_insert_own" on projects for insert
  with check (auth.uid() = user_id);
create policy "projects_update_own" on projects for update
  using (auth.uid() = user_id);
create policy "projects_delete_own" on projects for delete
  using (auth.uid() = user_id);

-- ---------------- components ----------------
create policy "components_select_own" on components for select
  using (exists (select 1 from projects p where p.id = components.project_id and p.user_id = auth.uid()));
create policy "components_insert_own" on components for insert
  with check (exists (select 1 from projects p where p.id = components.project_id and p.user_id = auth.uid()));
create policy "components_update_own" on components for update
  using (exists (select 1 from projects p where p.id = components.project_id and p.user_id = auth.uid()));
create policy "components_delete_own" on components for delete
  using (exists (select 1 from projects p where p.id = components.project_id and p.user_id = auth.uid()));

-- ---------------- process_definitions ----------------
create policy "process_definitions_select_own" on process_definitions for select
  using (exists (
    select 1 from components c join projects p on p.id = c.project_id
    where c.id = process_definitions.component_id and p.user_id = auth.uid()
  ));
create policy "process_definitions_insert_own" on process_definitions for insert
  with check (exists (
    select 1 from components c join projects p on p.id = c.project_id
    where c.id = process_definitions.component_id and p.user_id = auth.uid()
  ));
create policy "process_definitions_update_own" on process_definitions for update
  using (exists (
    select 1 from components c join projects p on p.id = c.project_id
    where c.id = process_definitions.component_id and p.user_id = auth.uid()
  ));
create policy "process_definitions_delete_own" on process_definitions for delete
  using (exists (
    select 1 from components c join projects p on p.id = c.project_id
    where c.id = process_definitions.component_id and p.user_id = auth.uid()
  ));

-- ---------------- process_stages ----------------
create policy "process_stages_select_own" on process_stages for select
  using (exists (
    select 1 from process_definitions pd
    join components c on c.id = pd.component_id
    join projects p on p.id = c.project_id
    where pd.id = process_stages.process_definition_id and p.user_id = auth.uid()
  ));
create policy "process_stages_cud_own" on process_stages for all
  using (exists (
    select 1 from process_definitions pd
    join components c on c.id = pd.component_id
    join projects p on p.id = c.project_id
    where pd.id = process_stages.process_definition_id and p.user_id = auth.uid()
  ))
  with check (exists (
    select 1 from process_definitions pd
    join components c on c.id = pd.component_id
    join projects p on p.id = c.project_id
    where pd.id = process_stages.process_definition_id and p.user_id = auth.uid()
  ));

-- ---------------- machines (shared read-only catalog) ----------------
create policy "machines_select_all" on machines for select
  using (true);
-- Inserts/updates are performed by the service role (seed script) which
-- bypasses RLS; no public write policy is defined intentionally.

-- ---------------- stage_recommendations ----------------
create policy "stage_recommendations_select_own" on stage_recommendations for select
  using (exists (
    select 1 from process_stages ps
    join process_definitions pd on pd.id = ps.process_definition_id
    join components c on c.id = pd.component_id
    join projects p on p.id = c.project_id
    where ps.id = stage_recommendations.process_stage_id and p.user_id = auth.uid()
  ));
create policy "stage_recommendations_cud_own" on stage_recommendations for all
  using (exists (
    select 1 from process_stages ps
    join process_definitions pd on pd.id = ps.process_definition_id
    join components c on c.id = pd.component_id
    join projects p on p.id = c.project_id
    where ps.id = stage_recommendations.process_stage_id and p.user_id = auth.uid()
  ))
  with check (exists (
    select 1 from process_stages ps
    join process_definitions pd on pd.id = ps.process_definition_id
    join components c on c.id = pd.component_id
    join projects p on p.id = c.project_id
    where ps.id = stage_recommendations.process_stage_id and p.user_id = auth.uid()
  ));

-- ---------------- iterations ----------------
create policy "iterations_select_own" on iterations for select
  using (exists (select 1 from projects p where p.id = iterations.project_id and p.user_id = auth.uid()));
create policy "iterations_cud_own" on iterations for all
  using (exists (select 1 from projects p where p.id = iterations.project_id and p.user_id = auth.uid()))
  with check (exists (select 1 from projects p where p.id = iterations.project_id and p.user_id = auth.uid()));

-- ---------------- iteration_stage_selections ----------------
create policy "iteration_selections_select_own" on iteration_stage_selections for select
  using (exists (
    select 1 from iterations i join projects p on p.id = i.project_id
    where i.id = iteration_stage_selections.iteration_id and p.user_id = auth.uid()
  ));
create policy "iteration_selections_cud_own" on iteration_stage_selections for all
  using (exists (
    select 1 from iterations i join projects p on p.id = i.project_id
    where i.id = iteration_stage_selections.iteration_id and p.user_id = auth.uid()
  ))
  with check (exists (
    select 1 from iterations i join projects p on p.id = i.project_id
    where i.id = iteration_stage_selections.iteration_id and p.user_id = auth.uid()
  ));

-- ---------------- digital_twin_snapshots ----------------
create policy "twin_snapshots_select_own" on digital_twin_snapshots for select
  using (exists (
    select 1 from iterations i join projects p on p.id = i.project_id
    where i.id = digital_twin_snapshots.iteration_id and p.user_id = auth.uid()
  ));
create policy "twin_snapshots_cud_own" on digital_twin_snapshots for all
  using (exists (
    select 1 from iterations i join projects p on p.id = i.project_id
    where i.id = digital_twin_snapshots.iteration_id and p.user_id = auth.uid()
  ))
  with check (exists (
    select 1 from iterations i join projects p on p.id = i.project_id
    where i.id = digital_twin_snapshots.iteration_id and p.user_id = auth.uid()
  ));

-- ---------------- reports ----------------
create policy "reports_select_own" on reports for select
  using (exists (
    select 1 from iterations i join projects p on p.id = i.project_id
    where i.id = reports.iteration_id and p.user_id = auth.uid()
  ));
create policy "reports_cud_own" on reports for all
  using (exists (
    select 1 from iterations i join projects p on p.id = i.project_id
    where i.id = reports.iteration_id and p.user_id = auth.uid()
  ))
  with check (exists (
    select 1 from iterations i join projects p on p.id = i.project_id
    where i.id = reports.iteration_id and p.user_id = auth.uid()
  ));

-- ---------------- storage: cad-files bucket ----------------
-- Run once, after creating a bucket named `cad-files` (private) in the
-- Supabase dashboard or via `supabase storage create cad-files`.
-- insert into storage.buckets (id, name, public) values ('cad-files', 'cad-files', false)
--   on conflict (id) do nothing;
--
-- create policy "cad_files_owner_rw" on storage.objects for all
--   using (bucket_id = 'cad-files' and auth.uid()::text = (storage.foldername(name))[1])
--   with check (bucket_id = 'cad-files' and auth.uid()::text = (storage.foldername(name))[1]);
