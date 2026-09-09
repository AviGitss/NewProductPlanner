-- Adds a nullable column to carry an auto-suggested process description
-- (produced by lib/cadParser.ts from an uploaded .dwg/.dxf file) from the
-- component-creation step through to the process-definition step, so
-- ProcessForm can pre-fill its textarea instead of the user always
-- starting from a blank one.
--
-- Safe to run against a live database with existing rows: nullable column,
-- no default needed, existing rows simply get null (= "no suggestion",
-- which is exactly today's behavior).

alter table components
  add column if not exists suggested_process_text text;
