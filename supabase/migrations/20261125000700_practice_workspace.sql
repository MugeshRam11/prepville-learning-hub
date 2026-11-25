-- Capture student-visible prompts at selection so archiving preserves the session.
alter table public.practice_session_questions add column prompt jsonb, add column flagged boolean not null default false;
create function practice_private.capture_prompt(qid uuid) returns jsonb language sql stable set search_path='' as $$
 select jsonb_build_object('id',q.id,'question_text',q.question_text,'image_url',q.image_url,'strand',q.strand,
 'topic',q.topic,'subtopic',q.subtopic,'myp_year',q.myp_year,'difficulty',q.difficulty,'marks',q.marks,'question_type',q.question_type,
 'answer_type',q.answer_type,'answer_config',q.answer_config,'parts',coalesce((select jsonb_agg(jsonb_build_object(
 'id',p.id,'label',p.label,'sub_question_text',p.sub_question_text,'sub_question_image_url',p.sub_question_image_url,
 'marks',p.marks,'answer_type',p.answer_type,'answer_block_config',p.answer_config||jsonb_build_object('type',p.answer_type))
 order by p.order_index) from public.question_subquestions p where p.question_id=q.id),'[]'::jsonb))
 from public.question_bank q where q.id=qid
$$;
update public.practice_session_questions set prompt=practice_private.capture_prompt(question_id);
create function practice_private.set_prompt() returns trigger language plpgsql set search_path='' as $$
begin new.prompt:=practice_private.capture_prompt(new.question_id); return new; end $$;
create trigger capture_practice_prompt before insert on public.practice_session_questions for each row execute function practice_private.set_prompt();
alter table public.practice_session_questions alter prompt set not null;
create function public.flag_practice_question(p_item uuid,p_flag boolean) returns void language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null then raise insufficient_privilege; end if;
 update public.practice_session_questions sq set flagged=p_flag from public.practice_sessions s
 where sq.id=p_item and sq.session_id=s.id and s.user_id=auth.uid() and not s.is_completed;
 if not found then raise exception 'Session is unavailable for flagging'; end if;
end $$;
revoke all on function public.flag_practice_question(uuid,boolean) from public,anon;
grant execute on function public.flag_practice_question(uuid,boolean) to authenticated;

create view public.practice_review_queue with(security_invoker=true) as
 select r.session_question_id,r.part_id,r.answer,r.maximum,r.earned,r.evaluation,q.question_text,p.sub_question_text,
 k.answer_key,k.marking_rubric,r.evaluated_at
 from public.practice_part_results r join public.practice_session_questions sq on sq.id=r.session_question_id
 join public.question_bank q on q.id=sq.question_id left join public.question_subquestions p on p.id=r.part_id
 left join public.question_answer_keys k on k.subquestion_id=p.id or (p.id is null and k.question_id=q.id)
 where public.has_role((select auth.uid()),'admin'::text);
grant select on public.practice_review_queue to authenticated;
