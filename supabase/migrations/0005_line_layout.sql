-- Adds line-layout / capacity-planning configuration to iterations, used by
-- the new "Line Layout & Station KPIs" planning page
-- (app/projects/[projectId]/iterations/[iterationId]/line/page.tsx).
--
-- Safe to run against a live database with existing rows: all three columns
-- are added with `if not exists` and either a nullable type or a `not null
-- default`, so existing rows are backfilled automatically and no existing
-- query or row is broken.

alter table iterations
  add column if not exists layout_type text,
  add column if not exists buffer_minutes numeric not null default 5,
  add column if not exists variant_count int not null default 1;
