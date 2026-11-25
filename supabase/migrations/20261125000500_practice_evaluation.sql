alter table public.practice_session_questions add column marks_earned integer;
create table public.practice_part_results (
 session_question_id uuid not null references public.practice_session_questions(id),
 part_id uuid not null, answer jsonb, maximum integer not null check(maximum>0),
 earned integer check(earned between 0 and maximum),
 evaluation text not null check(evaluation in ('pending','automatic','manual','overridden')),
 evaluated_at timestamptz, reviewer uuid references auth.users(id),
 primary key(session_question_id,part_id)
);
alter table public.practice_part_results enable row level security;
revoke all on public.practice_part_results from public,anon,authenticated;
grant select on public.practice_part_results to authenticated;
create policy "Read own or assigned review results" on public.practice_part_results for select to authenticated
using(exists(select from public.practice_session_questions sq join public.practice_sessions s on s.id=sq.session_id
 where sq.id=session_question_id and (s.user_id=(select auth.uid()) or public.has_role((select auth.uid()),'admin'::text))));

create or replace function public.save_practice_draft_answer(p_session_question_id uuid,p_answer text,p_time_spent_seconds integer default 0)
returns boolean language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null then raise insufficient_privilege; end if;
 perform from public.practice_sessions s join public.practice_session_questions sq on s.id=sq.session_id
 where sq.id=p_session_question_id and s.user_id=auth.uid() and not s.is_completed for update of s;
 if not found then raise exception 'Session closed or unavailable'; end if;
 update public.practice_session_questions set student_answer=p_answer,attempt_status='draft',
 time_spent_seconds=greatest(time_spent_seconds,p_time_spent_seconds)
 where id=p_session_question_id and attempt_status in ('draft','unattempted');
 if not found then raise exception 'Answer already submitted'; end if;
 return true;
end $$;

-- Private routine; callers lock the owned parent session before entry.
create schema if not exists practice_private;
revoke all on schema practice_private from public,anon,authenticated;
create function practice_private.grade(sqid uuid,response text) returns void language plpgsql set search_path='' as $$
declare
 sq public.practice_session_questions; q public.question_bank; item record; answers jsonb; val jsonb;
 left_poly jsonb; right_poly jsonb; submitted text; earned integer; total integer; pending boolean;
begin
 select * into strict sq from public.practice_session_questions where id=sqid for update;
 if sq.attempt_status in ('submitted','evaluated') then raise exception 'Answer already submitted'; end if;
 select * into strict q from public.question_bank where id=sq.question_id;
 begin answers:=response::jsonb; exception when invalid_text_representation then answers:=to_jsonb(response); end;
 if q.question_type='multi_part' and answers is not null then
   if jsonb_typeof(answers)<>'object' then raise exception 'Expected answers keyed by part ID'; end if;
   if exists(select from jsonb_object_keys(answers) k where not exists
      (select from public.question_subquestions p where p.question_id=q.id and p.id::text=k)) then raise exception 'Unknown part'; end if;
 end if;
 for item in
   select q.id,q.answer_type,q.marks,q.answer_config,k.answer_key from (values(1)) x(i)
   left join public.question_answer_keys k on k.question_id=q.id where q.question_type='single'
   union all select p.id,p.answer_type,p.marks,p.answer_config,k.answer_key from public.question_subquestions p
   left join public.question_answer_keys k on k.subquestion_id=p.id where p.question_id=q.id and q.question_type='multi_part'
 loop
   val:=case when q.question_type='multi_part' or answers ? item.id::text then answers->item.id::text else answers end;
   submitted:=trim(val #>> '{}'); earned:=null;
   if submitted is null or submitted='' then earned:=0;
   elsif item.answer_type='multiple_choice' and nullif(item.answer_key,'') is not null then
     earned:=case when submitted=item.answer_key then item.marks else 0 end;
   elsif item.answer_type in ('short_answer','numeric','text_equation') and
     submitted ~ '^[+-]?[0-9]{1,100}([.][0-9]{1,100})?$' and item.answer_key ~ '^[+-]?[0-9]{1,100}([.][0-9]{1,100})?$' then
     earned:=case when abs(submitted::numeric-item.answer_key::numeric)<=coalesce((item.answer_config->>'tolerance')::numeric,0)
       then item.marks else 0 end;
   elsif item.answer_type='text_equation' then
     left_poly:=practice_private.polynomial(submitted); right_poly:=practice_private.polynomial(item.answer_key);
     if left_poly is not null and right_poly is not null then earned:=case when left_poly=right_poly then item.marks else 0 end; end if;
   end if;
   insert into public.practice_part_results(session_question_id,part_id,answer,maximum,earned,evaluation,evaluated_at)
   values(sqid,item.id,val,item.marks,earned,case when earned is null then 'pending' else 'automatic' end,
      case when earned is not null then now() end);
 end loop;
 select sum(r.earned),bool_or(r.earned is null) into total,pending from public.practice_part_results r where r.session_question_id=sqid;
 update public.practice_session_questions set student_answer=response,marks_earned=case when not pending then total end,
 is_correct=case when not pending then total=q.marks end,attempt_status=case when pending then 'submitted' else 'evaluated' end,
 evaluated_at=case when not pending then now() end where id=sqid;
end $$;

create or replace function public.submit_practice_question_answer(p_session_question_id uuid,p_answer text,p_time_spent_seconds integer default 0)
returns table(is_correct boolean,attempt_status text) language plpgsql security definer set search_path='' as $$
declare sid uuid;
begin
 if auth.uid() is null then raise insufficient_privilege; end if;
 select s.id into strict sid from public.practice_sessions s join public.practice_session_questions sq on sq.session_id=s.id
 where sq.id=p_session_question_id and s.user_id=auth.uid() and s.session_mode='study' and not s.is_completed for update of s;
 if nullif(trim(p_answer),'') is null then raise exception 'Enter an answer'; end if;
 perform practice_private.grade(p_session_question_id,p_answer);
 update public.practice_session_questions set time_spent_seconds=greatest(time_spent_seconds,p_time_spent_seconds) where id=p_session_question_id;
 update public.practice_sessions set completed_questions=1 where id=sid;
 return query select sq.is_correct,sq.attempt_status from public.practice_session_questions sq where sq.id=p_session_question_id;
end $$;

create or replace function public.complete_practice_session(p_session_id uuid)
returns table(completed boolean,score numeric,total_completed integer,total_questions integer)
language plpgsql security definer set search_path='' as $$
declare s public.practice_sessions; sq record;
begin
 if auth.uid() is null then raise insufficient_privilege; end if;
 select * into strict s from public.practice_sessions where id=p_session_id and user_id=auth.uid() for update;
 if not s.is_completed then
   for sq in select * from public.practice_session_questions where session_id=s.id and attempt_status in ('unattempted','draft') loop
     perform practice_private.grade(sq.id,sq.student_answer);
   end loop;
   update public.practice_sessions set is_completed=true,completed_at=now(),completed_questions=s.total_questions,
   score=(select case when count(earned)=count(*) then round(100.0*sum(earned)/sum(maximum),2) end
    from public.practice_part_results r join public.practice_session_questions i on i.id=r.session_question_id where i.session_id=s.id)
   where id=s.id returning * into s;
 end if;
 return query select true,s.score,s.completed_questions,s.total_questions;
end $$;

create or replace function public.get_practice_question_solution(p_session_question_id uuid)
returns table(part_label text,answer_key text,solution text,marking_rubric jsonb)
language plpgsql security definer set search_path='' as $$
declare qid uuid;
begin
 if auth.uid() is null then raise insufficient_privilege; end if;
 select sq.question_id into qid from public.practice_session_questions sq join public.practice_sessions s on sq.session_id=s.id
 where sq.id=p_session_question_id and s.user_id=auth.uid() and (s.is_completed or (s.session_mode='study' and sq.attempt_status in ('submitted','evaluated')));
 if not found then raise exception 'Solution locked' using errcode='42501'; end if;
 return query select coalesce(p.label,'main'),k.answer_key,k.solution,k.marking_rubric from public.question_answer_keys k
 left join public.question_subquestions p on k.subquestion_id=p.id where k.question_id=qid or p.question_id=qid order by p.order_index;
end $$;
revoke all on function public.get_practice_question_solution(uuid),public.complete_practice_session(uuid),
 public.submit_practice_question_answer(uuid,text,integer),public.save_practice_draft_answer(uuid,text,integer) from public,anon;
grant execute on function public.get_practice_question_solution(uuid),public.complete_practice_session(uuid),
 public.submit_practice_question_answer(uuid,text,integer),public.save_practice_draft_answer(uuid,text,integer) to authenticated;
