-- Fix: the live `iteration_stage_selections` table is missing the default
-- uuid_generate_v4() on its `id` column (the original 0001_init.sql defines
-- it correctly, but "create table if not exists" is a no-op against a table
-- that already existed without it — this backfills the default directly).
--
-- Symptom this fixes: selecting a machine on the recommendations page threw
-- a server exception with the underlying Postgres error
-- 'null value in column "id" of relation "iteration_stage_selections"
-- violates not-null constraint' (code 23502), because inserts never
-- supplied an id and the column had no default to fall back on.

alter table iteration_stage_selections
  alter column id set default uuid_generate_v4();
