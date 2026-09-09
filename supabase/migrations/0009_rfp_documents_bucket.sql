-- Storage bucket for per-run RFP documents (CAD files, RFP paperwork,
-- historical-proposal references, manually-uploaded AutoForm result
-- exports). Objects are stored as `${project_id}/${filename}`; access
-- follows the same company-membership rule as every other table, via the
-- can_access_project() helper from migration 0007.

insert into storage.buckets (id, name, public) values ('rfp-documents', 'rfp-documents', false)
  on conflict (id) do nothing;

drop policy if exists "rfp_documents_bucket_rw" on storage.objects;
create policy "rfp_documents_bucket_rw" on storage.objects for all
  using (bucket_id = 'rfp-documents' and public.can_access_project(((storage.foldername(name))[1])::uuid))
  with check (bucket_id = 'rfp-documents' and public.can_access_project(((storage.foldername(name))[1])::uuid));
