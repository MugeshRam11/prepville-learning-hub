create or replace function practice_private.prompt_config(value jsonb) returns jsonb language plpgsql immutable set search_path='' as $$
declare result jsonb;
begin
 if jsonb_typeof(value)='string' and left(trim(value #>> '{}'),1) in ('{','[') then
   begin return practice_private.prompt_config((value #>> '{}')::jsonb);
   exception when invalid_text_representation then return value; end;
 elsif jsonb_typeof(value)='object' then
   select coalesce(jsonb_object_agg(k,practice_private.prompt_config(v)),'{}') into result from jsonb_each(value) e(k,v)
   where k !~* '(correct|solution|^answers$|answerkey|answer_key|expected|rubric|explanation|evaluationnotes|acceptedformats)';
   return result;
 elsif jsonb_typeof(value)='array' then
   select coalesce(jsonb_agg(practice_private.prompt_config(v) order by pos),'[]') into result
   from jsonb_array_elements(value) with ordinality e(v,pos);
   return result;
 end if;
 return value;
end $$;
-- Only prompt image fields referenced by published question blocks can be signed.
create function practice_private.block_shows_diagram(config jsonb,object_name text) returns boolean language sql immutable set search_path='' as $$
 select exists(select from jsonb_path_query(practice_private.prompt_config(config),'strict $.**.imageUrl'::jsonpath,'{}',true) img
 where split_part(img #>> '{}','#',1)='/practice-diagrams/'||object_name)
$$;
create or replace function public.can_read_diagram(object_name text) returns boolean language sql stable security definer set search_path='' as $$
  select auth.uid() is not null and (public.has_role(auth.uid(),'admin'::text) or exists(
    select from public.question_bank q where q.is_published and q.review_status='approved' and q.programme='MYP' and q.subject='mathematics'
    and (split_part(q.image_url,'#',1)='/practice-diagrams/'||object_name or exists(
    select from public.question_subquestions p where p.question_id=q.id and split_part(p.sub_question_image_url,'#',1)='/practice-diagrams/'||object_name)))
    or exists(select from public.mock_questions q join public.mock_tests t on t.id=q.mock_test_id where t.is_published and
    (practice_private.block_shows_diagram(to_jsonb(q)->'answer_block_config',object_name) or split_part(q.question_image_url,'#',1)='/practice-diagrams/'||object_name or exists(select from public.mock_sub_questions p where p.question_id=q.id and (practice_private.block_shows_diagram(to_jsonb(p)->'answer_block_config',object_name) or split_part(p.sub_question_image_url,'#',1)='/practice-diagrams/'||object_name))))
    or exists(select from public.practice_session_questions i join public.practice_sessions s on i.session_id=s.id where s.user_id=auth.uid()
    and (split_part(i.prompt->>'image_url','#',1)='/practice-diagrams/'||object_name or exists(select from jsonb_array_elements(i.prompt->'parts') p
    where split_part(p->>'sub_question_image_url','#',1)='/practice-diagrams/'||object_name))))
$$;
