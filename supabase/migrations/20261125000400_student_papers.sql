create or replace function public.generate_practice_session(p_title text,p_count integer,p_filters jsonb default '{}')
returns table(session_id uuid,total_questions integer) language plpgsql security definer set search_path='' as $$
declare
 student uuid:=auth.uid(); token uuid:=(p_filters->>'request_id')::uuid; sid uuid;
 ids uuid[]; manual uuid[];
begin
 if student is null then raise insufficient_privilege; end if;
 if p_count is null or p_count not between 1 and 50 then raise exception 'Choose 1 to 50 questions'; end if;
 if token is not null then
   perform pg_advisory_xact_lock(hashtextextended(student::text||token::text,0));
   return query select s.id,s.total_questions from public.practice_sessions s where s.user_id=student and s.request_id=token;
   if found then return; end if;
 end if;
 if p_filters ? 'question_ids' then
   manual:=array(select value::uuid from jsonb_array_elements_text(p_filters->'question_ids'));
   if cardinality(manual)<>p_count or (select count(distinct id) from unnest(manual) id)<>p_count then
     raise exception 'Selection must contain the requested number of unique questions'; end if;
 end if;
 ids:=array(select q.id from public.question_bank q where q.is_published and q.review_status='approved'
   and q.programme='MYP' and q.subject='mathematics' and q.myp_year is not null
   and (manual is null or q.id=any(manual))
   and (p_filters->>'myp_year' is null or q.myp_year=p_filters->>'myp_year')
   and (p_filters->>'strand' is null or q.strand=p_filters->>'strand')
   and (p_filters->>'difficulty' is null or q.difficulty=p_filters->>'difficulty')
   and (p_filters->>'question_type' is null or q.question_type=p_filters->>'question_type')
   and (p_filters->>'topic' is null or q.topic ilike '%'||(p_filters->>'topic')||'%')
   and (not coalesce((p_filters->>'unattempted_only')::boolean,false) or not exists
     (select from public.practice_session_questions sq join public.practice_sessions s on s.id=sq.session_id
      where s.user_id=student and sq.question_id=q.id and sq.attempt_status<>'unattempted'))
   order by array_position(manual,q.id),random() limit p_count for share of q);
 if cardinality(ids)<>p_count then raise exception 'Only % eligible questions available. Adjust the selection or requested count.',cardinality(ids); end if;
 insert into public.practice_sessions(user_id,title,total_questions,filters,request_id)
 values(student,coalesce(nullif(trim(p_title),''),'My Practice Paper'),p_count,p_filters,token) returning id into sid;
 insert into public.practice_session_questions(session_id,question_id,order_index)
 select sid,id,position-1 from unnest(ids) with ordinality as picked(id,position);
 return query select sid,p_count;
end $$;
create or replace function public.start_single_question_attempt(p_question_id uuid)
returns table(session_id uuid,session_question_id uuid,attempt_status text,saved_answer text,time_spent_seconds integer)
language plpgsql security definer set search_path='' as $$
declare student uuid:=auth.uid(); sid uuid; sqid uuid; title text;
begin
 if student is null then raise insufficient_privilege; end if;
 perform pg_advisory_xact_lock(hashtextextended(student::text||p_question_id::text,0));
 select topic into strict title from public.question_bank where id=p_question_id and is_published and review_status='approved'
 and programme='MYP' and subject='mathematics' and myp_year is not null for share;
 return query select s.id,sq.id,sq.attempt_status,sq.student_answer,sq.time_spent_seconds
 from public.practice_sessions s join public.practice_session_questions sq on s.id=sq.session_id
 where s.user_id=student and s.session_mode='study' and not s.is_completed and sq.question_id=p_question_id
 order by s.created_at desc limit 1;
 if found then return; end if;
 insert into public.practice_sessions(user_id,title,total_questions,session_mode) values(student,title,1,'study') returning id into sid;
 insert into public.practice_session_questions(session_id,question_id) values(sid,p_question_id) returning id into sqid;
 return query select sid,sqid,'unattempted'::text,null::text,0;
end $$;
revoke all on function public.start_single_question_attempt(uuid),public.generate_practice_session(text,integer,jsonb) from public,anon;
grant execute on function public.start_single_question_attempt(uuid),public.generate_practice_session(text,integer,jsonb) to authenticated;
