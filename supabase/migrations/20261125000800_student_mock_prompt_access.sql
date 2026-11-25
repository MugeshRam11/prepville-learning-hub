-- Keep editor and server-side marking access on the original tables. Student reads use published prompts.
drop policy if exists "Users can view questions of published tests" on public.mock_questions;
drop policy if exists "Users can view sub questions of published tests" on public.mock_sub_questions;
create function practice_private.prompt_config(value jsonb) returns jsonb language plpgsql immutable set search_path='' as $$
declare result jsonb;
begin
 if jsonb_typeof(value)='string' and left(trim(value #>> '{}'),1) in ('{','[') then
   begin return practice_private.prompt_config((value #>> '{}')::jsonb);
   exception when invalid_text_representation then return value; end;
 elsif jsonb_typeof(value)='object' then
   select coalesce(jsonb_object_agg(k,practice_private.prompt_config(v)),'{}') into result from jsonb_each(value) e(k,v)
   where k !~* '(correct|solution|answerkey|answer_key|expected|rubric|explanation|evaluationnotes|acceptedformats)';
   return result;
 elsif jsonb_typeof(value)='array' then
   select coalesce(jsonb_agg(practice_private.prompt_config(v) order by pos),'[]') into result
   from jsonb_array_elements(value) with ordinality e(v,pos);
   return result;
 end if;
 return value;
end $$;
create function public.student_mock_prompts(p_tests uuid[]) returns setof jsonb
language plpgsql stable security definer set search_path='' as $$
begin
 if auth.uid() is null then raise insufficient_privilege; end if;
 return query select (select jsonb_object_agg(k,v) from jsonb_each(to_jsonb(q)) e(k,v)
 where k=any(array['id','mock_test_id','question_number','question_text','question_image_url','has_sub_questions',
 'marks','word_limit','difficulty','category','diagram_description','command_term','answer_block_type','section_id',
 'question_text_latex','question_text_unicode','created_at','updated_at']))||jsonb_build_object(
 'answer_block_config',practice_private.prompt_config(to_jsonb(q)->'answer_block_config'),
 'mock_sub_questions',coalesce((select jsonb_agg((select jsonb_object_agg(k,v) from jsonb_each(to_jsonb(p)) e(k,v)
 where k=any(array['id','question_id','sub_question_label','sub_question_text','sub_question_image_url','marks',
 'word_limit','diagram_description','command_term','answer_block_type','sub_question_text_latex','sub_question_text_unicode','created_at']))||
 jsonb_build_object('answer_block_config',practice_private.prompt_config(to_jsonb(p)->'answer_block_config'))
 order by p.sub_question_label,p.id) from public.mock_sub_questions p where p.question_id=q.id),'[]'::jsonb))
 from public.mock_questions q join public.mock_tests t on t.id=q.mock_test_id
 where t.is_published and t.id=any(p_tests) order by q.mock_test_id,q.question_number;
end $$;
revoke all on function public.student_mock_prompts(uuid[]) from public,anon;
grant execute on function public.student_mock_prompts(uuid[]) to authenticated;
