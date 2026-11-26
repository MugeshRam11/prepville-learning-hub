-- Standalone containment for owner review. Run only in an approved transaction window.
-- Restrictive policies deliberately freeze API authoring, including administrators, until roster reconciliation.
begin;
do $$ begin
 if to_regprocedure('public.make_user_admin(text)') is not null then
 revoke all on function public.make_user_admin(text) from public,anon,authenticated;
 end if;
end $$;
revoke insert,update,delete,truncate on public.user_roles from public,anon,authenticated;
do $$
declare target text;
begin
 foreach target in array array['mock_tests','mock_test_sections','mock_questions','mock_sub_questions','practice_sets','practice_questions','practice_sub_questions'] loop
   execute format('alter table public.%I enable row level security',target);
   execute format('revoke insert,update,delete,truncate on public.%I from public,anon,authenticated',target);
   execute format('create policy containment_read on public.%I as restrictive for select to anon,authenticated using(false)',target);
   execute format('create policy containment_insert on public.%I as restrictive for insert to anon,authenticated with check(false)',target);
   execute format('create policy containment_update on public.%I as restrictive for update to anon,authenticated using(false) with check(false)',target);
   execute format('create policy containment_delete on public.%I as restrictive for delete to anon,authenticated using(false)',target);
 end loop;
end $$;
-- Freeze profile role writes as well. Restore only reviewed column-level grants after the audit.
revoke insert,update,delete,truncate on public.profiles from public,anon,authenticated;
commit;
