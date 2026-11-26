insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('practice-diagrams','practice-diagrams',false,5242880,array['image/jpeg','image/png','image/webp'])
on conflict(id) do update set public=false,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;
-- All writes to either bank bucket pass through the staff-only image validation function.
create policy diagram_insert_guard on storage.objects as restrictive for insert to anon,authenticated
with check(bucket_id not in ('practice-diagrams','question-images'));
create policy diagram_update_guard on storage.objects as restrictive for update to anon,authenticated
using(bucket_id not in ('practice-diagrams','question-images')) with check(bucket_id not in ('practice-diagrams','question-images'));
create policy diagram_delete_guard on storage.objects as restrictive for delete to anon,authenticated
using(bucket_id not in ('practice-diagrams','question-images'));
create function public.can_read_diagram(object_name text) returns boolean language sql stable security definer set search_path='' as $$
  select auth.uid() is not null and (public.has_role(auth.uid(),'admin'::text) or exists(
    select from public.question_bank q where q.is_published and q.review_status='approved' and q.programme='MYP' and q.subject='mathematics'
    and (split_part(q.image_url,'#',1)='/practice-diagrams/'||object_name or exists(
    select from public.question_subquestions p where p.question_id=q.id and split_part(p.sub_question_image_url,'#',1)='/practice-diagrams/'||object_name)))
    or exists(select from public.mock_questions q join public.mock_tests t on t.id=q.mock_test_id where t.is_published and
    (split_part(q.question_image_url,'#',1)='/practice-diagrams/'||object_name or exists(select from public.mock_sub_questions p where p.question_id=q.id and split_part(p.sub_question_image_url,'#',1)='/practice-diagrams/'||object_name)))
    or exists(select from public.practice_session_questions i join public.practice_sessions s on i.session_id=s.id where s.user_id=auth.uid()
    and (split_part(i.prompt->>'image_url','#',1)='/practice-diagrams/'||object_name or exists(select from jsonb_array_elements(i.prompt->'parts') p
    where split_part(p->>'sub_question_image_url','#',1)='/practice-diagrams/'||object_name))))
$$;
revoke all on function public.can_read_diagram(text) from public;
grant execute on function public.can_read_diagram(text) to authenticated,anon;
create policy practice_diagram_guard on storage.objects as restrictive for select
using(bucket_id<>'practice-diagrams' or public.can_read_diagram(name));
create policy practice_diagram_reader on storage.objects for select to authenticated
using(bucket_id='practice-diagrams' and public.can_read_diagram(name));
