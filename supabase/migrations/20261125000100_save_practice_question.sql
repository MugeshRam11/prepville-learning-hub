create function public.save_bank_question(p_question jsonb,p_id uuid default null,p_batch uuid default null)
returns uuid language plpgsql security definer set search_path='' as $$
declare
 q public.question_bank;
 part public.question_subquestions;
 item jsonb;
 qid uuid:=coalesce(p_id,gen_random_uuid());
 parts uuid[]:='{}';
 total integer:=0;
begin
 if auth.uid() is null or not public.has_role(auth.uid(),'admin'::text) then raise insufficient_privilege; end if;
 q:=jsonb_populate_record(null::public.question_bank,p_question);
 if (q.programme,q.subject) is distinct from ('MYP'::text,'mathematics'::text)
 or q.myp_year is null or nullif(trim(q.topic),'') is null or nullif(trim(q.question_text),'') is null
 then raise exception 'Year, topic and question text are required for MYP Mathematics'; end if;
 if p_batch is not null then
   if p_id is not null then raise exception 'Imports must create new questions'; end if;
   perform pg_advisory_xact_lock(hashtextextended(lower(trim(q.question_text)),0));
   if exists(select from public.question_bank where lower(trim(question_text))=lower(trim(q.question_text))) then
     raise exception 'Duplicate question' using errcode='23505';
   end if;
   q.review_status:='review_pending'; q.is_published:=false;
 end if;
 if p_id is not null then
   perform from public.question_bank where id=p_id for update;
   if not found then raise exception 'Unknown question'; end if;
   if exists(select from public.practice_session_questions where question_id=p_id) then
      raise exception 'This question has attempts. Archive it and create a revised question.';
   end if;
 end if;
 insert into public.question_bank(id,programme,subject,myp_year,strand,topic,subtopic,difficulty,question_type,
 command_term,question_text,image_url,marks,answer_type,answer_config,is_published,review_status,created_by,import_batch_id)
 values(qid,q.programme,q.subject,q.myp_year,q.strand,q.topic,q.subtopic,q.difficulty,q.question_type,q.command_term,
 q.question_text,q.image_url,q.marks,q.answer_type,coalesce(q.answer_config,'{}'),coalesce(q.is_published,false),coalesce(q.review_status,'draft'),auth.uid(),p_batch)
 on conflict(id) do update set myp_year=q.myp_year,strand=q.strand,topic=q.topic,subtopic=q.subtopic,difficulty=q.difficulty,
 question_type=q.question_type,command_term=q.command_term,question_text=q.question_text,image_url=q.image_url,
 marks=q.marks,answer_type=q.answer_type,answer_config=excluded.answer_config,is_published=q.is_published,review_status=q.review_status;
 if q.question_type='multi_part' then
   for item in select value from jsonb_array_elements(p_question->'subquestions') loop
     part:=jsonb_populate_record(null::public.question_subquestions,item);
     if part.id is not null and not exists(select from public.question_subquestions where id=part.id and question_id=qid)
       then raise exception 'Part does not belong to this question'; end if;
     if nullif(trim(part.sub_question_text),'') is null or nullif(trim(part.label),'') is null or part.id=any(parts)
       then raise exception 'Invalid part'; end if;
     part.id:=coalesce(part.id,gen_random_uuid());
     insert into public.question_subquestions(id,question_id,label,marks,answer_type,answer_config,command_term,sub_question_text,sub_question_image_url,order_index)
     values(part.id,qid,part.label,part.marks,part.answer_type,coalesce(part.answer_config,'{}'),part.command_term,part.sub_question_text,part.sub_question_image_url,cardinality(parts))
     on conflict(id) do update set label=part.label,marks=part.marks,answer_type=part.answer_type,
     answer_config=excluded.answer_config,sub_question_image_url=part.sub_question_image_url,command_term=part.command_term,sub_question_text=part.sub_question_text,order_index=cardinality(parts);
     insert into public.question_answer_keys(subquestion_id,answer_key,solution,marking_rubric)
     values(part.id,coalesce(item->>'answer_key',''),item->>'solution',coalesce(item->'marking_rubric','[]'))
     on conflict(subquestion_id) do update set answer_key=excluded.answer_key,solution=excluded.solution,
     marking_rubric=coalesce(item->'marking_rubric',question_answer_keys.marking_rubric);
     parts:=array_append(parts,part.id); total:=total+part.marks;
   end loop;
   if cardinality(parts)=0 or total<>q.marks then raise exception 'Part marks must sum to question marks'; end if;
   delete from public.question_answer_keys where question_id=qid;
 else
   insert into public.question_answer_keys(question_id,answer_key,solution,marking_rubric)
   values(qid,coalesce(p_question->>'answer_key',''),p_question->>'solution',coalesce(p_question->'marking_rubric','[]'))
   on conflict(question_id) do update set answer_key=excluded.answer_key,solution=excluded.solution,
   marking_rubric=coalesce(p_question->'marking_rubric',question_answer_keys.marking_rubric);
 end if;
 delete from public.question_subquestions where question_id=qid and not(id=any(parts));
 return qid;
end $$;
revoke all on function public.save_bank_question(jsonb,uuid,uuid) from public,anon;
grant execute on function public.save_bank_question(jsonb,uuid,uuid) to authenticated;

