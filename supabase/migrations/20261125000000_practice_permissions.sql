-- Use the protected assignment table as the authority for Practice administration.
drop policy if exists "Allow authenticated write user_roles" on public.user_roles;
drop policy if exists "Allow authenticated read user_roles" on public.user_roles;
create policy "Read own role assignments" on public.user_roles for select to authenticated using (user_id=(select auth.uid()));
revoke insert,update,delete,truncate on public.user_roles from public,anon,authenticated;
create or replace function public.has_role(_user_id uuid,_role text)
returns boolean language sql stable security definer set search_path='' as $$
 select exists(select from public.user_roles where user_id=_user_id and role::text=_role)
$$;

drop policy "Students manage their own practice sessions" on public.practice_sessions;
create policy "Read own practice sessions" on public.practice_sessions for select
to authenticated using (user_id=(select auth.uid()));
revoke all on public.practice_sessions,public.practice_session_questions,public.legacy_question_id_map
from public,anon,authenticated;
grant select on public.practice_sessions,public.practice_session_questions to authenticated;
alter table public.legacy_question_id_map enable row level security;
revoke truncate,references,trigger,delete on public.question_bank,public.question_answer_keys,public.question_subquestions from public,anon,authenticated;
revoke all on public.question_bank,public.question_answer_keys,public.question_subquestions from public,anon;
alter policy "Students and public can view published questions" on public.question_bank
 to authenticated using (is_published and review_status='approved' and programme='MYP' and subject='mathematics' and myp_year is not null);
alter table public.question_bank alter myp_year drop not null, alter myp_year drop default;
update public.question_bank q set myp_year=null,is_published=false,review_status='review_pending'
from public.legacy_question_id_map m where m.new_id=q.id and m.legacy_table='practice_questions';
alter table public.question_bank add constraint published_curriculum check
 (not is_published or (review_status='approved' and programme='MYP' and myp_year is not null));
alter table public.practice_session_questions drop constraint practice_session_questions_question_id_fkey,
 add foreign key(question_id) references public.question_bank(id) on delete restrict;
alter table public.question_bank drop constraint question_bank_review_status_check,
 add check(review_status in ('draft','review_pending','approved','rejected','archived'));
alter table public.practice_sessions add column session_mode text not null default 'paper' check(session_mode in ('study','paper')),
 add column completed_at timestamptz, add column request_id uuid, add unique(user_id,request_id);
update public.practice_sessions set session_mode='study' where filters ? 'question_id';
alter table public.question_bank add column import_batch_id uuid;
revoke all on function public.get_question_bank_audit_metrics() from public,anon,authenticated;
