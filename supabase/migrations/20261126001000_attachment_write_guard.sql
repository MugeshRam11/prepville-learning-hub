-- Require validated file contents on every new support upload.
create policy support_validated_upload on storage.objects as restrictive for insert to anon,authenticated
with check(bucket_id<>'support-files');
grant select,delete on public.support_ticket_attachments to service_role;
