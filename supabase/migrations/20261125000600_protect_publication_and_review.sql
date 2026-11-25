do $$ begin
 if to_regprocedure('public.make_user_admin(text)') is not null then
   revoke all on function public.make_user_admin(text) from public,anon,authenticated;
 end if;
end $$;
create function practice_private.protect_profile_role() returns trigger language plpgsql set search_path='' as $$
begin
 if tg_op='INSERT' and current_user not in ('postgres','service_role') then new.role:='student';
 elsif tg_op='UPDATE' and new.role is distinct from old.role and current_user in ('anon','authenticated') then raise insufficient_privilege;
 end if;
 return new;
end $$;
create trigger practice_protect_profile_role before insert or update of role on public.profiles
for each row execute function practice_private.protect_profile_role();
-- The signup hook executes as its owner. Set the initial profile role independently of metadata.
do $$ begin
 if to_regprocedure('public.handle_new_user()') is not null then
 execute $ddl$create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path='' as $body$
 begin insert into public.profiles(id,email,first_name,last_name,role) values(new.id,new.email,
 coalesce(new.raw_user_meta_data->>'first_name',''),coalesce(new.raw_user_meta_data->>'last_name',''),'student');
 return new; end $body$ $ddl$;
 end if;
end $$;
-- Direct client changes cannot bypass the content transaction. Status changes go through RLS and deferred validation.
revoke insert,update,delete on public.question_bank,public.question_answer_keys,public.question_subquestions from public,anon,authenticated;
grant update(is_published,review_status) on public.question_bank to authenticated;
drop policy if exists "Users can view sub questions of published sets" on public.practice_sub_questions;
drop policy if exists "Users can view subquestions of published sets" on public.practice_sub_questions;
revoke truncate on public.practice_sets,public.practice_questions,public.practice_sub_questions,public.mock_tests,
 public.mock_questions,public.mock_sub_questions,public.mock_test_sections from public,anon,authenticated;

create function practice_private.check_publication() returns trigger language plpgsql set search_path='' as $$
declare item record; n int:=0; total int:=0;
begin
 if not new.is_published then return null; end if;
 for item in
 select new.marks as marks,new.answer_type as kind,new.answer_config as config,k.answer_key as key
 from (values(1)) x(i) left join public.question_answer_keys k on k.question_id=new.id where new.question_type='single'
 union all select p.marks,p.answer_type,p.answer_config,k.answer_key from public.question_subquestions p
 left join public.question_answer_keys k on k.subquestion_id=p.id where p.question_id=new.id and new.question_type='multi_part'
 loop
   if nullif(trim(item.key),'') is null then raise exception 'Each published answer needs a marking key'; end if;
   if item.kind='multiple_choice' and (jsonb_array_length(coalesce(item.config->'options','[]'))<2 or
      not exists(select from jsonb_array_elements(item.config->'options') o where o->>'id'=item.key)) then
     raise exception 'Choose a valid correct option'; end if;
   n:=n+1; total:=total+item.marks;
 end loop;
 if n=0 or new.marks<>total then raise exception 'Question and part marks must reconcile'; end if;
 return null;
end $$;
create constraint trigger practice_validate_publication after insert or update on public.question_bank
deferrable initially deferred for each row execute function practice_private.check_publication();

create function public.review_practice_part(p_item uuid,p_part uuid,p_marks integer)
returns void language plpgsql security definer set search_path='' as $$
declare sid uuid;
begin
 if auth.uid() is null or not public.has_role(auth.uid(),'admin'::text) then raise insufficient_privilege; end if;
 select s.id into strict sid from public.practice_sessions s join public.practice_session_questions sq on sq.session_id=s.id
 where sq.id=p_item and (s.is_completed or s.session_mode='study') for update of s;
 if p_marks is null then raise exception 'Marks required'; end if;
 update public.practice_part_results set earned=p_marks,reviewer=auth.uid(),evaluated_at=now(),
 evaluation=case when evaluation='pending' then 'manual' else 'overridden' end where session_question_id=p_item and part_id=p_part;
 if not found then raise exception 'Unknown response'; end if;
 update public.practice_session_questions sq set marks_earned=g.earned,is_correct=g.earned=g.maximum,
 evaluated_at=case when g.earned is not null then now() end,attempt_status=case when g.earned is null then 'submitted' else 'evaluated' end
 from (select case when count(earned)=count(*) then sum(earned) end earned,sum(maximum) maximum
 from public.practice_part_results where session_question_id=p_item) g where sq.id=p_item;
 update public.practice_sessions set score=(select case when count(distinct r.session_question_id)=practice_sessions.total_questions and count(r.earned)=count(*) then round(100.0*sum(r.earned)/sum(r.maximum),2) end
 from public.practice_part_results r join public.practice_session_questions sq on sq.id=r.session_question_id where sq.session_id=sid)
 where id=sid and is_completed;
end $$;
revoke all on function public.review_practice_part(uuid,uuid,integer) from public,anon;
grant execute on function public.review_practice_part(uuid,uuid,integer) to authenticated;
